import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { gameHeader, saveGame } from "./arcade-core";
type Direction="up"|"down"|"left"|"right";
type Snapshot={board:number[];score:number;moves:number;won:boolean};
const STORAGE="2t.games.2048.session.v2",BEST="2t.games.2048.best";
const blank=()=>Array<number>(16).fill(0);
function spawn(b:number[]):number {
  const empty=b.map((v,i)=>v?-1:i).filter(i=>i>=0);
  if(!empty.length)return -1;
  const index=empty[Math.floor(Math.random()*empty.length)];
  b[index]=Math.random()<.9?2:4;return index;
}
export function slide2048(src:readonly number[],dir:Direction):{board:number[];score:number;changed:boolean;merged:number[]}{
  const b=[...src],merged:number[]=[];let score=0;
  for(let l=0;l<4;l++){
    const indices=Array.from({length:4},(_,i)=>dir==="left"?l*4+i:dir==="right"?l*4+3-i:dir==="up"?i*4+l:(3-i)*4+l);
    const line=indices.map(i=>src[i]).filter(Boolean),out:number[]=[];
    for(let i=0;i<line.length;i++){
      if(line[i]===line[i+1]){out.push(line[i]*2);score+=line[i]*2;merged.push(indices[out.length-1]);i++;}
      else out.push(line[i]);
    }
    indices.forEach((idx,i)=>b[idx]=out[i]||0);
  }
  return {board:b,score,changed:b.some((v,i)=>v!==src[i]),merged};
}
const canMove=(b:readonly number[])=>b.includes(0)||b.some((v,i)=>(i%4<3&&v===b[i+1])||(i<12&&v===b[i+4]));
function readSession():Snapshot|null{
  try{
    const v=JSON.parse(localStorage.getItem(STORAGE)||"null") as Snapshot|null;
    if(v&&Array.isArray(v.board)&&v.board.length===16&&v.board.every(x=>Number.isInteger(x)&&x>=0&&(x===0||(x&(x-1))===0))&&Number.isFinite(v.score)&&Number.isFinite(v.moves))
      return {board:v.board,score:v.score,moves:v.moves,won:!!v.won};
  }catch{/* optional */}return null;
}
@customElement("arcade-2048")
export class Arcade2048 extends LightElement {
  @state() private board=blank();
  @state() private score=0;
  @state() private best=0;
  @state() private moves=0;
  @state() private status:"playing"|"won"|"over"="playing";
  @state() private won=false;
  @state() private fresh=-1;
  @state() private merged:number[]=[];
  private previous:Snapshot|null=null;
  private touch:{x:number;y:number}|null=null;
  connectedCallback(){
    super.connectedCallback();
    try{this.best=Number(localStorage.getItem(BEST))||0;}catch{/* optional */}
    const saved=readSession();
    if(saved){this.board=[...saved.board];this.score=saved.score;this.moves=saved.moves;this.won=saved.won;this.status=canMove(saved.board)?"playing":"over";}
    else this.restart();
    window.addEventListener("keydown",this.onKey);
  }
  disconnectedCallback(){window.removeEventListener("keydown",this.onKey);super.disconnectedCallback();}
  private snapshot():Snapshot{return {board:[...this.board],score:this.score,moves:this.moves,won:this.won};}
  private persist(){try{localStorage.setItem(STORAGE,JSON.stringify(this.snapshot()));}catch{/* optional */}}
  private restart(){
    const b=blank();spawn(b);spawn(b);this.board=b;
    this.score=0;this.moves=0;this.won=false;this.fresh=-1;this.merged=[];this.previous=null;this.status="playing";this.persist();
  }
  private shift(dir:Direction){
    if(this.status!=="playing")return;
    const result=slide2048(this.board,dir);
    if(!result.changed)return;
    this.previous=this.snapshot();
    this.fresh=spawn(result.board);this.board=result.board;this.merged=result.merged;
    this.score+=result.score;this.moves++;
    if(this.score>this.best){this.best=this.score;try{localStorage.setItem(BEST,String(this.best));}catch{/* optional */}}
    if(!this.won&&this.board.some(x=>x>=2048)){this.won=true;this.status="won";saveGame("2048",this.score);}
    else if(!canMove(this.board)){this.status="over";saveGame("2048",this.score);}
    this.persist();
  }
  private undo(){
    if(!this.previous)return;
    const last=this.previous;this.previous=null;
    this.board=last.board;this.score=last.score;this.moves=last.moves;this.won=last.won;this.status="playing";this.fresh=-1;this.merged=[];
    this.persist();
  }
  private resume(){this.status="playing";this.persist();}
  private onKey=(e:KeyboardEvent)=>{
    if(e.altKey||e.ctrlKey||e.metaKey||(e.target as HTMLElement|null)?.closest("input,textarea,select,[contenteditable=true]"))return;
    const d:Record<string,Direction>={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",a:"left",s:"down",d:"right",W:"up",A:"left",S:"down",D:"right"};
    if(d[e.key]){e.preventDefault();this.shift(d[e.key]);}
  };
  private onTouchStart(e:TouchEvent){this.touch={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};}
  private onTouchEnd(e:TouchEvent){
    if(!this.touch)return;
    const dx=e.changedTouches[0].clientX-this.touch.x,dy=e.changedTouches[0].clientY-this.touch.y;this.touch=null;
    if(Math.max(Math.abs(dx),Math.abs(dy))<22)return;
    this.shift(Math.abs(dx)>Math.abs(dy)?(dx>0?"right":"left"):(dy>0?"down":"up"));
  }
  render(){
    const largest=Math.max(2,...this.board),progress=Math.round(Math.max(0,(Math.log2(largest)-1)/10*100));
    return html`<section class="arcade-game game-2048">
      ${gameHeader("2048","Combine peças iguais, alcance 2048 e continue batendo seus recordes.")}
      <div class="g2048-layout">
        <div class="g2048-main">
          <div class="g2048-scorebar"><div><span>PONTUAÇÃO</span><strong>${this.score.toLocaleString("pt-BR")}</strong></div><div><span>RECORDE</span><strong>${this.best.toLocaleString("pt-BR")}</strong></div><div><span>MOVIMENTOS</span><strong>${this.moves}</strong></div></div>
          <div class="g2048-stage">
            <div class="arcade-2048 g2048-grid" role="grid" aria-label="Tabuleiro de 2048" @touchstart=${(e:TouchEvent)=>this.onTouchStart(e)} @touchend=${(e:TouchEvent)=>this.onTouchEnd(e)}>
              ${this.board.map((v,i)=>html`<div role="gridcell" class=${"tile tile-"+v+(i===this.fresh?" is-spawned":"")+(this.merged.includes(i)?" is-merged":"")} aria-label=${v?String(v):"vazio"}>${v||""}</div>`)}
            </div>
            ${this.status!=="playing"?html`<div class="g2048-overlay" role="status"><span class="games-kicker">${this.status==="won"?"OBJETIVO CONCLUÍDO":"SEM MOVIMENTOS"}</span><strong>${this.status==="won"?"Você alcançou 2048!":"Fim de jogo"}</strong><p>${this.status==="won"?"Continue ou comece outra partida.":"Sua pontuação: "+this.score.toLocaleString("pt-BR")}</p><div class="g2048-overlay-actions">${this.status==="won"?html`<button @click=${()=>this.resume()}>Continuar</button>`:""}<button @click=${()=>this.restart()}>Novo jogo</button></div></div>`:""}
          </div>
          <div class="g2048-progress-row"><span>${this.won?"2048 alcançado":"Maior peça: "+largest}</span><div class="g2048-progress" aria-label=${"Progresso: "+progress+"%"}><i style=${"width:"+progress+"%"}></i></div><span>2048</span></div>
          <div class="g2048-pad arcade-pad"><button aria-label="Mover para cima" @click=${()=>this.shift("up")}>↑</button><div><button aria-label="Mover para esquerda" @click=${()=>this.shift("left")}>←</button><button aria-label="Mover para baixo" @click=${()=>this.shift("down")}>↓</button><button aria-label="Mover para direita" @click=${()=>this.shift("right")}>→</button></div></div>
        </div>
        <aside class="g2048-side"><div><span class="games-kicker">SEU DESAFIO</span><div class="g2048-title">2048<span>.</span></div><p>Mova as peças para juntar valores iguais. Cada combinação aumenta a pontuação. Evite preencher todas as casas.</p>
          <div class="g2048-example"><span>2</span><b>+</b><span>2</span><b>→</b><span>4</span></div></div>
          <div class="g2048-actions"><button class="g2048-new" @click=${()=>this.restart()}>Nova partida <span>↗</span></button><button ?disabled=${!this.previous} @click=${()=>this.undo()}>↶ Desfazer movimento</button></div>
          <div class="g2048-help"><span class="games-kicker">CONTROLES</span><p>Teclado: setas ou WASD</p><p>Celular: deslize no tabuleiro</p><small>Partida salva automaticamente neste navegador.</small></div>
        </aside>
      </div>
    </section>`;
  }
}
