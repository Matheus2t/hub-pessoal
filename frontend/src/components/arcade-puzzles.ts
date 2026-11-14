import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { gameHeader, pick, saveGame, shuffle } from "./arcade-core";

const same = (a:number[],b:number[])=>a.every((n,i)=>n===b[i]);

function sudokuSolution():number[] {
  const bands=shuffle([0,1,2]), stacks=shuffle([0,1,2]), digits=shuffle([1,2,3,4,5,6,7,8,9]);
  const rows=bands.flatMap(b=>shuffle([0,1,2]).map(n=>b*3+n));
  const cols=stacks.flatMap(b=>shuffle([0,1,2]).map(n=>b*3+n));
  return rows.flatMap(r=>cols.map(c=>digits[(r*3+Math.floor(r/3)+c)%9]));
}
function sudokuCount(board:number[],limit=2):number {
  const options=(idx:number)=>{
    const r=Math.floor(idx/9),c=idx%9,used=new Set<number>();
    for(let i=0;i<9;i++){used.add(board[r*9+i]);used.add(board[i*9+c]);}
    const sr=Math.floor(r/3)*3,sc=Math.floor(c/3)*3;
    for(let dr=0;dr<3;dr++)for(let dc=0;dc<3;dc++)used.add(board[(sr+dr)*9+sc+dc]);
    return [1,2,3,4,5,6,7,8,9].filter(x=>!used.has(x));
  };
  let best=-1,bestOpts:number[]=[];
  for(let i=0;i<81;i++)if(board[i]===0){const opt=options(i);if(opt.length===0)return 0;if(best===-1||opt.length<bestOpts.length){best=i;bestOpts=opt;if(opt.length===1)break;}}
  if(best===-1)return 1;
  let count=0;
  for(const x of bestOpts){board[best]=x;count+=sudokuCount(board,limit-count);if(count>=limit)break;}
  board[best]=0;
  return count;
}
function sudokuPuzzle(difficulty:number):{solution:number[];initial:number[]} {
  const solution=sudokuSolution(),initial=[...solution];
  const target=[35,43,49][difficulty];
  let removed=0;
  for(const i of shuffle(Array.from({length:81},(_,i)=>i))){
    const old=initial[i];initial[i]=0;
    if(sudokuCount(initial.slice(),2)===1)removed++;
    else initial[i]=old;
    if(removed>=target)break;
  }
  return {solution,initial};
}

@customElement("arcade-sudoku")
export class ArcadeSudoku extends LightElement {
  @state() private difficulty=0;
  @state() private board:number[]=[];
  @state() private initial:number[]=[];
  @state() private solution:number[]=[];
  @state() private selected=0;
  @state() private seconds=0;
  @state() private mistakes=0;
  @state() private finished=false;
  private clock:ReturnType<typeof setInterval>|undefined;
  connectedCallback(){super.connectedCallback();this.newPuzzle();window.addEventListener("keydown",this.onKey);}
  disconnectedCallback(){clearInterval(this.clock);window.removeEventListener("keydown",this.onKey);super.disconnectedCallback();}
  private newPuzzle(){
    clearInterval(this.clock);
    const {solution,initial}=sudokuPuzzle(this.difficulty);
    this.solution=solution;this.initial=initial;this.board=[...initial];this.selected=initial.findIndex(n=>n===0);
    this.seconds=0;this.mistakes=0;this.finished=false;
    this.clock=setInterval(()=>{if(!this.finished)this.seconds++;},1000);
  }
  private input(value:number){
    if(this.finished||this.selected<0||this.initial[this.selected]!==0)return;
    const next=[...this.board];next[this.selected]=value;this.board=next;
    if(value&&value!==this.solution[this.selected])this.mistakes++;
    if(same(this.board,this.solution)){this.finished=true;clearInterval(this.clock);saveGame("sudoku",this.seconds,true);}
  }
  private onKey=(e:KeyboardEvent)=>{
    if((e.target as HTMLElement)?.closest("input,textarea,select"))return;
    const arrows:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9};
    if(e.key in arrows){e.preventDefault();this.selected=(this.selected+81+arrows[e.key])%81;}
    else if(/^[1-9]$/.test(e.key)){e.preventDefault();this.input(Number(e.key));}
    else if(e.key==="Backspace"||e.key==="Delete"||e.key==="0"){e.preventDefault();this.input(0);}
  };
  private hint(){if(this.finished)return;const free=this.board.map((v,i)=>v!==this.solution[i]&&this.initial[i]===0?i:-1).filter(i=>i>=0);if(!free.length)return;this.selected=pick(free);this.input(this.solution[this.selected]);}
  render(){return html`<section class="arcade-game">${gameHeader("sudoku","Preencha cada linha, coluna e quadrante com os números de 1 a 9.")}
    <div class="arcade-toolbar"><label>Dificuldade <select .value=${String(this.difficulty)} @change=${(e:Event)=>{this.difficulty=Number((e.target as HTMLSelectElement).value);this.newPuzzle();}}><option value="0">Fácil</option><option value="1">Médio</option><option value="2">Difícil</option></select></label><span>Tempo: ${Math.floor(this.seconds/60)}:${String(this.seconds%60).padStart(2,"0")}</span><span>Erros: ${this.mistakes}</span><button @click=${()=>this.newPuzzle()}>Novo jogo</button><button @click=${()=>this.hint()} ?disabled=${this.finished}>Dica</button></div>
    <div class="arcade-sudoku-wrap"><div class="sudoku-progress-top"><span>PROGRESSO DO TABULEIRO</span><strong>${this.board.filter(v=>v!==0).length} / 81</strong></div><div class="sudoku-progress-track"><span style=${"width:"+Math.round(this.board.filter(Boolean).length/81*100)+"%"}></span></div><div class="arcade-sudoku" role="group" aria-label="Tabuleiro Sudoku">${this.board.map((v,i)=>{const sr=Math.floor(this.selected/9),sc=this.selected%9,r=Math.floor(i/9),col=i%9;const related=this.selected>=0&&(r===sr||col===sc||(Math.floor(r/3)===Math.floor(sr/3)&&Math.floor(col/3)===Math.floor(sc/3)));const sameDigit=this.selected>=0&&!!this.board[this.selected]&&v===this.board[this.selected];const classes=["sudoku-cell",i===this.selected?"selected":"",this.initial[i]?"given":"",v&&v!==this.solution[i]?"wrong":"",i%3===2?"end-col":"",r%3===2?"end-row":"",related?"related":"",sameDigit?"same-digit":""];return html`<button type="button" class=${classes.filter(Boolean).join(" ")} @click=${()=>this.selected=i} aria-label=${`Linha ${r+1}, coluna ${col+1}, ${v||"vazio"}`} aria-pressed=${i===this.selected}>${v||""}</button>`;})}</div>
    <div class="sudoku-numbers">${[1,2,3,4,5,6,7,8,9,0].map(n=>html`<button @click=${()=>this.input(n)}> ${n||"⌫"} </button>`)}</div></div>
    <p class="arcade-status" role="status">${this.finished?"Sudoku completo! Tempo registrado no seu navegador.":"Selecione uma casa e digite um número. As casas incorretas ficam marcadas."}</p>
  </section>`;}
}

type Mark="X"|"O"|"";
function winner(b:Mark[]):Mark|"draw"|null {
  const lines=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for(const [a,c,d] of lines)if(b[a]&&b[a]===b[c]&&b[a]===b[d])return b[a];
  return b.every(Boolean)?"draw":null;
}
function minimax(b:Mark[],player:Mark):number {
  const result=winner(b);if(result==="O")return 10;if(result==="X")return -10;if(result==="draw")return 0;
  const values:number[]=[];
  for(let i=0;i<9;i++)if(!b[i]){b[i]=player;values.push(minimax(b,player==="O"?"X":"O"));b[i]="";}
  return player==="O"?Math.max(...values):Math.min(...values);
}
@customElement("arcade-tic")
export class ArcadeTic extends LightElement {
  @state() private board:Mark[]=Array(9).fill("");
  @state() private turn:Mark="X";
  @state() private mode="ai";
  @state() private result:Mark|"draw"|null=null;
  @state() private wins=0;
  private timeout:ReturnType<typeof setTimeout>|undefined;
  disconnectedCallback(){clearTimeout(this.timeout);super.disconnectedCallback();}
  private reset(){clearTimeout(this.timeout);this.board=Array(9).fill("");this.turn="X";this.result=null;}
  private apply(i:number,player:Mark){
    if(this.board[i]||this.result)return;
    const next=[...this.board];next[i]=player;this.board=next;this.result=winner(next);
    if(this.result){saveGame("jogo-da-velha",this.result==="X"?1:0);if(this.result==="X")this.wins++;return;}
    this.turn=player==="X"?"O":"X";
    if(this.turn==="O"&&this.mode==="ai")this.timeout=setTimeout(()=>this.aiMove(),220);
  }
  private aiMove(){
    if(this.result||this.mode!=="ai")return;
    let best=-Infinity,bestIndex=-1;
    for(let i=0;i<9;i++)if(!this.board[i]){
      const draft=[...this.board];draft[i]="O";const value=minimax(draft,"X");
      if(value>best){best=value;bestIndex=i;}
    }
    if(bestIndex>=0)this.apply(bestIndex,"O");
  }
  private playAt(i:number){if(this.mode==="ai"&&this.turn!=="X")return;this.apply(i,this.turn);}
  render(){return html`<section class="arcade-game">${gameHeader("jogo-da-velha","Três símbolos em linha vencem. Jogue contra a máquina ou com um amigo.")}
    <div class="arcade-toolbar"><label>Modo <select .value=${this.mode} @change=${(e:Event)=>{this.mode=(e.target as HTMLSelectElement).value;this.reset();}}><option value="ai">Contra a máquina</option><option value="local">Dois jogadores</option></select></label><span>Vitórias X: ${this.wins}</span><button @click=${()=>this.reset()}>Nova partida</button></div>
    <div class="arcade-tic-board" role="group" aria-label="Jogo da Velha">${this.board.map((mark,i)=>html`<button @click=${()=>this.playAt(i)} ?disabled=${!!mark||!!this.result||(this.mode==="ai"&&this.turn==="O")} aria-label=${`Casa ${i+1}: ${mark||"vazia"}`}>${mark}</button>`)}</div>
    <p class="arcade-status" role="status">${this.result===null?`Vez de ${this.turn}`:this.result==="draw"?"Empate!":`${this.result} venceu!`}</p>
  </section>`;}
}

