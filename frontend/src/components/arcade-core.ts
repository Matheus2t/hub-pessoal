import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { LightElement } from "../ui";

export type GameId = "snake"|"sudoku"|"2048"|"breakout"|"pong"|"palavra-secreta"|"digitacao"|"jogo-da-velha"|"reflexos"|"memoria";
export const GAMES: {id:GameId;name:string;category:string;description:string;glyph:string}[] = [
  {id:"snake",name:"Snake",category:"Arcade",description:"Cresça, desvie e supere seu recorde.",glyph:"▦"},
  {id:"sudoku",name:"Sudoku",category:"Lógica",description:"Complete a grade em três dificuldades.",glyph:"▥"},
  {id:"2048",name:"2048",category:"Estratégia",description:"Combine peças e alcance 2048.",glyph:"2048"},
  {id:"breakout",name:"Breakout",category:"Arcade",description:"Rebata a bola e destrua os blocos.",glyph:"▤"},
  {id:"pong",name:"Pong",category:"Arcade",description:"Dispute uma partida contra a máquina.",glyph:"◦"},
  {id:"palavra-secreta",name:"Palavra Secreta",category:"Palavras",description:"Descubra palavras com níveis progressivos.",glyph:"ABC"},
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
export const gameHeader=(id:GameId,subtitle:string)=>html`<header class="arcade-heading"><a href="#/games">← Todos os jogos</a><div class="arcade-heading-title"><div><span class="games-kicker">2T / GAMES</span><h1>${GAMES.find(g=>g.id===id)?.name||id}</h1><p>${subtitle}</p></div></div></header>`;

@customElement("arcade-hub")
export class ArcadeHub extends LightElement {
  render(){
    return html`<section class="arcade-hub">
      <header class="arcade-heading"><span class="games-kicker">2T / JOGOS</span><h1>Games</h1><p>Dez jogos para jogar direto no navegador, sem cadastro.</p></header>
      <div class="arcade-catalog" aria-label="Jogos disponíveis">
        ${GAMES.map(game=>html`<a class="arcade-tile" href=${`#/games/${game.id}`} aria-label=${`Jogar ${game.name}`}>
          <div class="arcade-tile-art" aria-hidden="true">${game.glyph}</div>
          <div class="arcade-tile-description"><span class="games-kicker">${game.category}</span><h2>${game.name}</h2><p>${game.description}</p></div>
          <div class="arcade-tile-foot"><span>${statsFor(game.id).plays?"Partidas: "+statsFor(game.id).plays:"Pronto para jogar"}</span><span>Jogar ↗</span></div>
        </a>`)}
      </div>
    </section>`;
  }
}
