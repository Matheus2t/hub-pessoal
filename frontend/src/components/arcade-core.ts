import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";

export type GameId = "snake"|"sudoku"|"2048"|"breakout"|"pong"|"palavra-secreta"|"digitacao"|"jogo-da-velha"|"reflexos"|"memoria";
export const GAMES: {id:GameId;name:string;category:string;description:string;glyph:string}[] = [
  {id:"snake",name:"Snake",category:"Arcade",description:"Cresça, desvie e supere seu recorde.",glyph:"▦"},
  {id:"sudoku",name:"Sudoku",category:"Lógica",description:"Complete a grade em três dificuldades.",glyph:"▥"},
  {id:"2048",name:"2048",category:"Estratégia",description:"Combine peças e alcance 2048.",glyph:"2048"},
  {id:"breakout",name:"Breakout",category:"Arcade",description:"Rebata a bola e destrua os blocos.",glyph:"▤"},
  {id:"pong",name:"Pong",category:"Arcade",description:"Dispute uma partida contra a máquina.",glyph:"◦"},
  {id:"palavra-secreta",name:"Termo",category:"Palavras",description:"Descubra a palavra em até seis tentativas.",glyph:"ABC"},
  {id:"digitacao",name:"Digitação",category:"Habilidade",description:"Teste velocidade e precisão no teclado.",glyph:"⌨"},
  {id:"jogo-da-velha",name:"Jogo da Velha",category:"Estratégia",description:"Desafie a máquina ou um amigo.",glyph:"×○"},
  {id:"reflexos",name:"Reflexos",category:"Habilidade",description:"Meça o tempo de reação em milissegundos.",glyph:"◎"},
  {id:"memoria",name:"Memória",category:"Lógica",description:"Encontre pares com menos movimentos.",glyph:"◫"}
];
const STATS_KEY="2t.games.stats.v1";
export type GameStats={plays:number;best:number;last:number};
export function statsFor(id:GameId):GameStats {
  try {
    const parsed=JSON.parse(localStorage.getItem(STATS_KEY)||"{}") as Record<string,GameStats>;
    const item=parsed[id];
    return item&&Number.isFinite(item.best)?{plays:item.plays||0,best:item.best||0,last:item.last||0}:{plays:0,best:0,last:0};
  }catch{return {plays:0,best:0,last:0};}
}
export function saveGame(id:GameId,score:number,lowerIsBetter=false):GameStats {
  const safe=Number.isFinite(score)?Math.max(0,Math.round(score)):0;
  let all:Record<string,GameStats>={};
  try{all=JSON.parse(localStorage.getItem(STATS_KEY)||"{}") as Record<string,GameStats>;}catch{/* no storage */}
  const prev=statsFor(id);
  const next={plays:prev.plays+1,best:prev.plays===0?safe:(lowerIsBetter?Math.min(prev.best,safe):Math.max(prev.best,safe)),last:safe};
  all[id]=next;
  try{localStorage.setItem(STATS_KEY,JSON.stringify(all));}catch{/* game works offline */}
  return next;
}
export function pick<T>(arr:readonly T[]):T{return arr[Math.floor(Math.random()*arr.length)];}
export function shuffle<T>(items:readonly T[]):T[]{const arr=[...items];for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

const preview=(id:GameId)=>{
  switch(id){
    case "snake": return html`<div class="game-art-snake"><span></span><span></span><span></span><span></span><span></span><span></span><i></i></div>`;
    case "sudoku": return html`<div class="game-art-sudoku"><span>8</span><span></span><span>3</span><span>2</span><span>5</span><span></span><span></span><span>7</span><span>9</span></div>`;
    case "2048": return html`<div class="game-art-2048"><span>2</span><span>4</span><span>8</span><span>16</span></div>`;
    case "breakout": return html`<div class="game-art-breakout"><div class="game-art-bricks">${Array.from({length:15},(_,i)=>html`<i class=${i%5===1?"soft":""}></i>`)}</div><b></b><span></span></div>`;
    case "pong": return html`<div class="game-art-pong"><span class="paddle-left"></span><i></i><span class="paddle-right"></span><b></b></div>`;
    case "palavra-secreta": return html`<div class="game-art-word"><span>T</span><span>E</span><span>R</span><span>M</span><span>O</span></div>`;
    case "digitacao": return html`<div class="game-art-typing"><span>const progress = true;</span><span>focus · accuracy · speed</span><i></i></div>`;
    case "jogo-da-velha": return html`<div class="game-art-tic">${["X","","O","","X","","O","","X"].map(v=>html`<span>${v}</span>`)}</div>`;
    case "reflexos": return html`<div class="game-art-reflex"><span></span><i></i><strong>0.248</strong><small>SEG</small></div>`;
    case "memoria": return html`<div class="game-art-memory"><span>◈</span><span>?</span><span>?</span><span>◈</span></div>`;
  }
};
export const gameHeader=(id:GameId,subtitle:string)=>{
  const index=GAMES.findIndex(g=>g.id===id);
  const game=GAMES[index];
  return html`<header class="arcade-heading arcade-game-heading">
    <a class="arcade-back" href="#/games"><span aria-hidden="true">←</span> Voltar aos jogos</a>
    <div class="arcade-heading-title">
      <div><span class="games-kicker">GAMES <span class="kicker-divider">/</span> ${game.category} <span class="kicker-divider">/</span> ${String(index+1).padStart(2,"0")}</span>
        <h1>${game.name}</h1><p>${subtitle}</p>
      </div>
      <span class="arcade-heading-mark" aria-hidden="true">${String(index+1).padStart(2,"0")} <small>/ 10</small></span>
    </div>
  </header>`;
};

@customElement("arcade-hub")
export class ArcadeHub extends LightElement {
  @state() private category="Todos";
  @state() private query="";
  render(){
    const categories=["Todos","Arcade","Lógica","Estratégia","Palavras","Habilidade"];
    const normalized=this.query.trim().toLocaleLowerCase("pt-BR");
    const games=GAMES.filter(g=>(this.category==="Todos"||g.category===this.category)&&
      (!normalized||`${g.name} ${g.category} ${g.description}`.toLocaleLowerCase("pt-BR").includes(normalized)));
    return html`<section class="arcade-hub">
      <header class="arcade-hub-heading">
        <div><span class="games-kicker">2T <span class="kicker-divider">/</span> ENTRETENIMENTO</span>
          <h1>Games<span class="arcade-heading-period">.</span></h1>
          <p>Clássicos para jogar direto no navegador. Escolha um jogo e comece.</p>
        </div>
        <div class="arcade-hub-total"><strong>10</strong><span>JOGOS<br>DISPONÍVEIS</span></div>
      </header>
      <div class="arcade-directory-tools">
        <div class="arcade-category-tabs" role="group" aria-label="Filtrar jogos por categoria">
          ${categories.map(c=>html`<button type="button" aria-pressed=${this.category===c} @click=${()=>this.category=c}>${c}</button>`)}
        </div>
        <label class="arcade-search"><span class="arcade-search-icon" aria-hidden="true">⌕</span><input type="search" aria-label="Buscar jogos" placeholder="Buscar jogos..." .value=${this.query} @input=${(e:Event)=>this.query=(e.target as HTMLInputElement).value}></label>
      </div>
      <div class="arcade-results-label"><strong>${this.category==="Todos"?"Todos os jogos":this.category}</strong><span>${games.length} ${games.length===1?"jogo":"jogos"}</span></div>
      <div class="arcade-catalog" aria-label="Jogos disponíveis">
        ${games.map((game)=>html`<a class=${`arcade-tile arcade-tile--${game.id}`} href=${`#/games/${game.id}`} aria-label=${`Jogar ${game.name}`}>
          <div class="arcade-tile-art" aria-hidden="true"><div class="arcade-preview">${preview(game.id)}</div><span class="arcade-art-index">${String(GAMES.indexOf(game)+1).padStart(2,"0")}</span></div>
          <div class="arcade-tile-info"><div class="arcade-tile-description"><span class="games-kicker">${game.category}</span><h2>${game.name}</h2><p>${game.description}</p></div>
          <div class="arcade-tile-foot"><span>${statsFor(game.id).plays?`${statsFor(game.id).plays} partidas`:"Sem partidas"}</span><strong>Jogar <span aria-hidden="true">↗</span></strong></div></div>
        </a>`)}
      </div>
      ${games.length===0?html`<div class="arcade-empty">Nenhum jogo encontrado. Tente outro termo ou categoria.</div>`:""}
    </section>`;
  }
}
