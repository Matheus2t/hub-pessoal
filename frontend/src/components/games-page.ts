import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { gameHeader } from "./arcade-core";

type Point = { x: number; y: number };
type Entry = { name: string; score: number; date: string };
type Direction = "up" | "down" | "left" | "right";
const SIZE = 20;
const KEY = "2t.games.snake.rank.v1";
const directions: Record<Direction, Point> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
const opposite: Record<Direction, Direction> = {
  up: "down", down: "up", left: "right", right: "left",
};
function readRank(): Entry[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Entry =>
      !!item && typeof item.name === "string" && typeof item.score === "number" &&
      Number.isFinite(item.score) && typeof item.date === "string")
      .sort((a, b) => b.score - a.score).slice(0, 10);
  } catch { return []; }
}

@customElement("games-page")
export class GamesPage extends LightElement {
  @state() private snake: Point[] = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
  @state() private food: Point = { x: 14, y: 10 };
  @state() private status: "ready" | "playing" | "paused" | "over" = "ready";
  @state() private score = 0;
  @state() private rank: Entry[] = [];
  @state() private playerName = "";
  @state() private saved = false;
  private heading: Direction = "right";
  private queued: Direction = "right";
  private timer: ReturnType<typeof setTimeout> | undefined;
  private touchStart: Point | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.rank = readRank();
    window.addEventListener("keydown", this.onKey);
    document.addEventListener("visibilitychange", this.onVisibility);
  }
  disconnectedCallback() {
    this.stopTimer();
    window.removeEventListener("keydown", this.onKey);
    document.removeEventListener("visibilitychange", this.onVisibility);
    super.disconnectedCallback();
  }
  private onVisibility = () => { if (document.hidden && this.status === "playing") this.pause(); };
  private stopTimer() { if (this.timer !== undefined) clearTimeout(this.timer); this.timer = undefined; }
  private get level() { return Math.floor(this.score / 50) + 1; }
  private get speed() { return Math.max(72, 175 - (this.level - 1) * 11); }
  private randomFood(snake: Point[]): Point | null {
    const occupied = new Set(snake.map(p => p.y * SIZE + p.x));
    const free = Array.from({ length: SIZE * SIZE }, (_, i) => i).filter(i => !occupied.has(i));
    if (!free.length) return null;
    const index = free[Math.floor(Math.random() * free.length)];
    return { x: index % SIZE, y: Math.floor(index / SIZE) };
  }
  private reset() {
    this.stopTimer();
    this.snake = [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }];
    this.food = { x: 14, y: 10 };
    this.heading = "right";
    this.queued = "right";
    this.score = 0;
    this.saved = false;
    this.status = "ready";
  }
  private start() {
    if (this.status === "paused") { this.status = "playing"; this.schedule(); return; }
    if (this.status !== "ready") this.reset();
    this.status = "playing";
    this.schedule();
  }
  private pause() { this.stopTimer(); if (this.status === "playing") this.status = "paused"; }
  private schedule() { this.stopTimer(); if (this.status === "playing") this.timer = setTimeout(() => this.advance(), this.speed); }
  private advance() {
    if (this.status !== "playing") return;
    this.heading = this.queued;
    const step = directions[this.heading];
    const head = { x: this.snake[0].x + step.x, y: this.snake[0].y + step.y };
    const eats = head.x === this.food.x && head.y === this.food.y;
    const body = eats ? this.snake : this.snake.slice(0, -1);
    const collision = head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE ||
      body.some(p => p.x === head.x && p.y === head.y);
    if (collision) { this.status = "over"; this.stopTimer(); return; }
    const next = [head, ...this.snake.slice(0, eats ? undefined : -1)];
    this.snake = next;
    if (eats) {
      this.score += 10;
      const food = this.randomFood(next);
      if (!food) { this.status = "over"; this.stopTimer(); return; }
      this.food = food;
    }
    this.schedule();
  }
  private changeDirection(direction: Direction) {
    if (direction !== opposite[this.heading]) this.queued = direction;
    if (this.status === "ready") this.start();
  }
  private onKey = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("input,textarea,select,[contenteditable=true]")) return;
    const map: Record<string, Direction> = {
      ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
      w: "up", s: "down", a: "left", d: "right",
    };
    const direction = map[event.key];
    if (direction) { event.preventDefault(); this.changeDirection(direction); }
    if (event.code === "Space") {
      event.preventDefault();
      if (this.status === "playing") this.pause();
      else if (this.status !== "over") this.start();
    }
  };
  private touchBegin(event: TouchEvent) {
    const touch = event.changedTouches[0];
    this.touchStart = { x: touch.clientX, y: touch.clientY };
  }
  private touchEnd(event: TouchEvent) {
    if (!this.touchStart) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - this.touchStart.x, dy = touch.clientY - this.touchStart.y;
    this.touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    this.changeDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  }
  private saveScore() {
    const name = this.playerName.trim().slice(0, 20) || "Jogador";
    if (this.saved || this.score <= 0 || this.status !== "over") return;
    this.rank = [...this.rank, { name, score: this.score, date: new Date().toLocaleDateString("pt-BR") }]
      .sort((a, b) => b.score - a.score).slice(0, 10);
    try { localStorage.setItem(KEY, JSON.stringify(this.rank)); } catch { /* jogo continua sem armazenamento */ }
    this.saved = true;
  }
  render() {
    const occupied = new Set(this.snake.map(p => p.y * SIZE + p.x));
    const head = this.snake[0].y * SIZE + this.snake[0].x;
    const food = this.food.y * SIZE + this.food.x;
    return html`<section class="games-section">
      ${gameHeader("snake","A cobrinha clássica. Colete pontos, evolua de nível e supere seu recorde.")}
      <div class="games-layout">
        <section class="snake-panel" aria-label="Jogo Snake">
          <div class="snake-stats">
            <div><small>Pontuação</small><strong aria-live="polite">${this.score}</strong></div>
            <div><small>Nível</small><strong>${this.level}</strong></div>
            <div><small>Melhor local</small><strong>${this.rank[0]?.score || 0}</strong></div>
          </div>
          <div class="snake-stage" @touchstart=${(e: TouchEvent) => this.touchBegin(e)} @touchend=${(e: TouchEvent) => this.touchEnd(e)}>
            <div class="snake-board" role="img" aria-label=${`Tabuleiro de Snake. Pontuação ${this.score}, nível ${this.level}.`}>
              ${Array.from({ length: SIZE * SIZE }, (_, i) => html`<span class=${`snake-cell ${i === head ? "is-head" : occupied.has(i) ? "is-snake" : i === food ? "is-food" : ""}`}></span>`)}
            </div>
            ${this.status !== "playing" ? html`<div class="snake-overlay">
              <div class="snake-overlay-content">
                <strong>${this.status === "ready" ? "Pronto para jogar?" : this.status === "paused" ? "Pausado" : "Fim de jogo"}</strong>
                <span>${this.status === "over" ? `${this.score} pontos · nível ${this.level}` : "Use as setas, WASD ou deslize na tela."}</span>
                <button type="button" class="snake-primary" @click=${() => this.start()}>${this.status === "paused" ? "Continuar" : this.status === "over" ? "Jogar novamente" : "Começar"}</button>
              </div>
            </div>` : ""}
          </div>
          <div class="snake-actions">
            <button type="button" @click=${() => this.status === "playing" ? this.pause() : this.start()}>${this.status === "playing" ? "Pausar" : this.status === "paused" ? "Continuar" : "Novo jogo"}</button>
            <button type="button" @click=${() => this.reset()}>Reiniciar</button>
          </div>
          <div class="snake-controls" aria-label="Controles do jogo">
            <button aria-label="Cima" @click=${() => this.changeDirection("up")}>↑</button>
            <div><button aria-label="Esquerda" @click=${() => this.changeDirection("left")}>←</button><button aria-label="Baixo" @click=${() => this.changeDirection("down")}>↓</button><button aria-label="Direita" @click=${() => this.changeDirection("right")}>→</button></div>
          </div>
        </section>
        <aside class="snake-sidebar">
          <section class="snake-info"><span class="games-kicker">Como jogar</span><h2>Continue em movimento.</h2><p>Coma os pontos para aumentar a cobra. Evite paredes e o próprio corpo. A velocidade cresce a cada 50 pontos.</p><p><strong>Teclado:</strong> setas ou WASD · Espaço para pausar.</p></section>
          <section class="snake-rank"><div class="snake-rank-title"><span class="games-kicker">Ranking</span><h2>Melhores pontuações</h2><small>Neste navegador</small></div>
            ${this.status === "over" && this.score > 0 && !this.saved ? html`<form class="snake-save" @submit=${(e: Event) => { e.preventDefault(); this.saveScore(); }}><label for="snake-name">Registrar pontuação</label><div><input id="snake-name" maxlength="20" autocomplete="nickname" placeholder="Seu nome" .value=${this.playerName} @input=${(e: Event) => this.playerName = (e.target as HTMLInputElement).value} /><button type="submit">Salvar</button></div></form>` : ""}
            ${this.rank.length ? html`<ol>${this.rank.map((item, i) => html`<li><span>${String(i + 1).padStart(2, "0")}</span><strong>${item.name}</strong><b>${item.score}</b></li>`)}</ol>` : html`<p class="snake-empty">Nenhum recorde ainda. Jogue a primeira partida.</p>`}
          </section>
        </aside>
      </div>
    </section>`;
  }
}
