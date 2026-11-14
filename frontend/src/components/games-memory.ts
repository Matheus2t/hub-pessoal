import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { gameHeader, shuffle, saveGame } from "./arcade-core";

const SHAPES=["◆","✦","●","▲","◈","✳","☾","▣","♠","✿","☼","⌘"];
type Phase="ready"|"preview"|"playing"|"complete";
@customElement("arcade-memory")
export class ArcadeMemory extends LightElement {
  @state() private level=1;
  @state() private deck:string[]=[];
  @state() private open:number[]=[];
  @state() private matched:number[]=[];
  @state() private moves=0;
  @state() private seconds=0;
  @state() private phase:Phase="ready";
  @state() private lastResult=0;
  private clock:ReturnType<typeof setInterval>|undefined;
  private hideTimer:ReturnType<typeof setTimeout>|undefined;
  private previewTimer:ReturnType<typeof setTimeout>|undefined;
  private locked=false;
  private started=0;
  connectedCallback(){super.connectedCallback();this.reset();}
  disconnectedCallback(){this.clearTimers();super.disconnectedCallback();}
  private clearTimers(){clearInterval(this.clock);clearTimeout(this.hideTimer);clearTimeout(this.previewTimer);}
  private get pairs(){return [4,8,12][this.level];}
  private reset(){
    this.clearTimers();this.locked=false;
    const selected=shuffle(SHAPES).slice(0,this.pairs);
    this.deck=shuffle([...selected,...selected]);
    this.open=[];this.matched=[];this.moves=0;this.seconds=0;this.phase="ready";this.lastResult=0;
  }
  private setLevel(next:number){this.level=next;this.reset();}
  private start(){
    if(this.phase!=="ready")return;
    this.phase="preview";this.locked=true;
    this.previewTimer=setTimeout(()=>{
      this.phase="playing";this.locked=false;this.started=performance.now();
      this.clock=setInterval(()=>{this.seconds=Math.floor((performance.now()-this.started)/1000);},250);
    },1700);
  }
  private flip(index:number){
    if(this.phase!=="playing"||this.locked||this.matched.includes(index)||this.open.includes(index))return;
    const revealed=[...this.open,index];
    this.open=revealed;
    if(revealed.length<2)return;
    this.moves++;
    this.locked=true;
    if(this.deck[revealed[0]]===this.deck[revealed[1]]){
      this.hideTimer=setTimeout(()=>{
        this.matched=[...this.matched,...revealed];
        this.open=[];this.locked=false;
        if(this.matched.length===this.deck.length){
          this.phase="complete";clearInterval(this.clock);
          this.seconds=Math.floor((performance.now()-this.started)/1000);
          this.lastResult=Math.max(1,1500-this.moves*28-this.seconds*3);
          saveGame("memoria",this.lastResult);
        }
      },420);
    }else{
      this.hideTimer=setTimeout(()=>{this.open=[];this.locked=false;},930);
    }
  }
  private get rating(){return this.moves<=this.pairs+2?3:this.moves<=this.pairs*1.6?2:1;}
  render(){
    return html`<section class="arcade-game game-memory">
      ${gameHeader("memoria","Encontre os pares e tente concluir com o mínimo de movimentos.")}
      <div class="memory-layout">
        <div class="memory-main">
          <div class="memory-topline">
            <span class="games-kicker">DESAFIO DE OBSERVAÇÃO</span>
            <div class="memory-levels">${["Fácil","Médio","Difícil"].map((v,i)=>html`<button type="button" aria-pressed=${this.level===i} @click=${()=>this.setLevel(i)}>${v}</button>`)}</div>
          </div>
          <div class="memory-stats"><div><small>PARES</small><strong>${this.matched.length/2}<span> / ${this.pairs}</span></strong></div>
            <div><small>MOVIMENTOS</small><strong>${this.moves}</strong></div>
            <div><small>TEMPO</small><strong>${String(Math.floor(this.seconds/60)).padStart(2,"0")}:${String(this.seconds%60).padStart(2,"0")}</strong></div></div>
          <div class="memory-board-shell">
            <div class=${"arcade-memory-board memory-grid level-"+this.level} role="group" aria-label="Cartas do jogo da memória">
              ${this.deck.map((symbol,index)=>{
                const solved=this.matched.includes(index),visible=this.phase==="preview"||this.open.includes(index)||solved;
                return html`<button type="button" class=${"memory-card"+(visible?" is-face-up":"")+(solved?" is-matched":"")}
                  ?disabled=${solved||this.phase!=="playing"||this.locked}
                  aria-label=${"Carta "+(index+1)+": "+(visible?symbol:"oculta")}
                  @click=${()=>this.flip(index)}>
                  <span class="memory-card-inner"><span class="memory-face memory-cover"><span>2T</span></span><span class="memory-face memory-symbol">${symbol}</span></span>
                </button>`;
              })}
            </div>
            ${this.phase==="ready"?html`<div class="memory-board-message"><span class="games-kicker">MEMORIZE OS SÍMBOLOS</span><strong>Pronto para jogar?</strong><p>Você terá 1,7 segundo para observar as cartas antes de começar.</p><button type="button" @click=${()=>this.start()}>Começar partida ↗</button></div>`:""}
            ${this.phase==="preview"?html`<div class="memory-preview-label">Memorize as posições...</div>`:""}
            ${this.phase==="complete"?html`<div class="memory-board-message memory-finished" role="status"><span class="games-kicker">TODOS OS PARES ENCONTRADOS</span><strong>Concluído!</strong>
              <div class="memory-stars" aria-label=${this.rating+" de 3 estrelas"}>${[1,2,3].map(n=>html`<span class=${n<=this.rating?"earned":""}>★</span>`)}</div>
              <p>${this.moves} movimentos · ${this.seconds} segundos</p>
              <button @click=${()=>this.reset()}>Jogar novamente ↗</button></div>`:""}
          </div>
          <div class="memory-footer"><span>${this.phase==="ready"?"Escolha a dificuldade e comece.":this.phase==="preview"?"Observe e memorize as cartas.":this.phase==="playing"?"Encontre dois símbolos iguais.":"Você completou o desafio."}</span><button @click=${()=>this.reset()}>↶ Reiniciar</button></div>
        </div>
        <aside class="memory-aside">
          <div class="memory-aside-section"><span class="games-kicker">COMO JOGAR</span><h2>Observe.<br>Memorize.<br>Combine.</h2><p>Encontre duas cartas com o mesmo símbolo. Cada par encontrado permanece revelado até o final da rodada.</p></div>
          <div class="memory-aside-section"><span class="games-kicker">SUA DIFICULDADE</span><strong>${this.pairs} pares</strong><p>${this.pairs*2} cartas únicas na mesa, com posições embaralhadas a cada rodada.</p></div>
          <div class="memory-aside-footer"><span>★ ★ ★</span><p>Mais estrelas para quem termina com menos tentativas.</p></div>
        </aside>
      </div>
    </section>`;
  }
}
