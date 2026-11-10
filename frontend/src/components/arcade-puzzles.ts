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
    <div class="arcade-sudoku-wrap"><div class="arcade-sudoku" role="group" aria-label="Tabuleiro Sudoku">${this.board.map((v,i)=>html`<button type="button" class=${`sudoku-cell ${i===this.selected?"selected":""} ${this.initial[i]?"given":""} ${v&&v!==this.solution[i]?"wrong":""} ${i%3===2?"end-col":""} ${Math.floor(i/9)%3===2?"end-row":""}`} @click=${()=>this.selected=i} aria-label=${`Linha ${Math.floor(i/9)+1}, coluna ${i%9+1}, ${v||"vazio"}`} aria-pressed=${i===this.selected}>${v||""}</button>`)}</div>
    <div class="sudoku-numbers">${[1,2,3,4,5,6,7,8,9,0].map(n=>html`<button @click=${()=>this.input(n)}> ${n||"⌫"} </button>`)}</div></div>
    <p class="arcade-status" role="status">${this.finished?"Sudoku completo! Tempo registrado no seu navegador.":"Selecione uma casa e digite um número. As casas incorretas ficam marcadas."}</p>
  </section>`;}
}

const mergeLine=(line:number[])=>{
  const packed=line.filter(x=>x!==0),out:number[]=[];let points=0;
  for(let i=0;i<packed.length;i++){if(packed[i]===packed[i+1]){out.push(packed[i]*2);points+=packed[i]*2;i++;}else out.push(packed[i]);}
  while(out.length<4)out.push(0);
  return {out,points};
};
@customElement("arcade-2048")
export class Arcade2048 extends LightElement {
  @state() private board=Array(16).fill(0) as number[];
  @state() private score=0;
  @state() private status="playing";
  @state() private best=0;
  private touch:{x:number;y:number}|null=null;
  connectedCallback(){super.connectedCallback();this.best=Number(localStorage.getItem("2t.games.2048.best")||0)||0;this.reset();window.addEventListener("keydown",this.onKey);}
  disconnectedCallback(){window.removeEventListener("keydown",this.onKey);super.disconnectedCallback();}
  private spawn(board:number[]):number[]{const free=board.map((v,i)=>v===0?i:-1).filter(i=>i>=0);if(free.length)board[pick(free)]=Math.random()<.9?2:4;return board;}
  private reset(){this.board=this.spawn(this.spawn(Array(16).fill(0) as number[]));this.score=0;this.status="playing";}
  private move(dir:string){
    if(this.status!=="playing")return;
    const next=[...this.board];let gained=0;
    for(let line=0;line<4;line++){
      const indices=Array.from({length:4},(_,n)=>dir==="left"?line*4+n:dir==="right"?line*4+(3-n):dir==="up"?n*4+line:(3-n)*4+line);
      const result=mergeLine(indices.map(i=>this.board[i]));gained+=result.points;
      indices.forEach((i,n)=>next[i]=result.out[n]);
    }
    if(same(next,this.board))return;
    this.board=this.spawn(next);this.score+=gained;
    if(this.score>this.best){this.best=this.score;try{localStorage.setItem("2t.games.2048.best",String(this.best));}catch{/* storage optional */}}
    if(this.board.includes(2048)){this.status="won";saveGame("2048",this.score);}
    else if(!this.board.some(v=>v===0)&&!this.board.some((v,i)=>i%4<3&&v===this.board[i+1]||i<12&&v===this.board[i+4])){this.status="lost";saveGame("2048",this.score);}
  }
  private onKey=(e:KeyboardEvent)=>{
    if((e.target as HTMLElement)?.closest("input,textarea,select"))return;
    const dirs:Record<string,string>={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right",w:"up",s:"down",a:"left",d:"right"};
    if(dirs[e.key]){e.preventDefault();this.move(dirs[e.key]);}
  };
  private touchStart(e:TouchEvent){this.touch={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};}
  private touchEnd(e:TouchEvent){if(!this.touch)return;const dx=e.changedTouches[0].clientX-this.touch.x,dy=e.changedTouches[0].clientY-this.touch.y;this.touch=null;if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;this.move(Math.abs(dx)>Math.abs(dy)?dx>0?"right":"left":dy>0?"down":"up");}
  render(){return html`<section class="arcade-game">${gameHeader("2048","Deslize para combinar números iguais. Alcance a peça 2048.")}
    <div class="arcade-toolbar"><span>Pontuação <strong>${this.score}</strong></span><span>Recorde <strong>${this.best}</strong></span><button @click=${()=>this.reset()}>Novo jogo</button></div>
    <div class="arcade-2048" @touchstart=${(e:TouchEvent)=>this.touchStart(e)} @touchend=${(e:TouchEvent)=>this.touchEnd(e)} role="grid" aria-label="Tabuleiro de 2048">${this.board.map(v=>html`<div class=${`tile tile-${v}`} role="gridcell">${v||""}</div>`)}</div>
    <div class="arcade-pad"><button @click=${()=>this.move("up")}>↑</button><div><button @click=${()=>this.move("left")}>←</button><button @click=${()=>this.move("down")}>↓</button><button @click=${()=>this.move("right")}>→</button></div></div>
    <p class="arcade-status" role="status">${this.status==="won"?"Você alcançou 2048! Parabéns.":this.status==="lost"?"Sem movimentos disponíveis. Inicie outra partida.":"Use as setas, WASD ou deslize no celular."}</p>
  </section>`;}
}

const WORDS:{hint:string;word:string}[][]=[
 [{word:"CASA",hint:"Moradia"},{word:"LIVRO",hint:"Leitura"},{word:"GATO",hint:"Animal"},{word:"PRAIA",hint:"Litoral"},{word:"FRUTA",hint:"Alimento"},{word:"NUVEM",hint:"Céu"},{word:"PORTA",hint:"Entrada"},{word:"CHUVA",hint:"Clima"},{word:"ESCOLA",hint:"Ensino"},{word:"JARDIM",hint:"Plantas"}],
 [{word:"TECLADO",hint:"Computador"},{word:"GIRASSOL",hint:"Flor"},{word:"PLANETA",hint:"Astronomia"},{word:"CADERNO",hint:"Estudo"},{word:"FLORESTA",hint:"Natureza"},{word:"CIENCIA",hint:"Conhecimento"},{word:"PROGRAMA",hint:"Software"},{word:"CONQUISTA",hint:"Resultado"},{word:"HORIZONTE",hint:"Paisagem"},{word:"BIBLIOTECA",hint:"Livros"}],
 [{word:"CRIPTOGRAFIA",hint:"Segurança digital"},{word:"BIODIVERSIDADE",hint:"Ecologia"},{word:"PROBABILIDADE",hint:"Matemática"},{word:"ARQUEOLOGIA",hint:"História"},{word:"MICROPROCESSADOR",hint:"Computação"},{word:"METAMORFOSE",hint:"Transformação"},{word:"ASTRONOMIA",hint:"Universo"},{word:"INCONSTITUCIONAL",hint:"Direito"},{word:"SUSTENTABILIDADE",hint:"Meio ambiente"},{word:"INTEROPERABILIDADE",hint:"Sistemas"}]
];
@customElement("arcade-words")
export class ArcadeWords extends LightElement {
  @state() private level=0;
  @state() private round=0;
  @state() private entry=WORDS[0][0];
  @state() private guessed:string[]=[];
  @state() private status="playing";
  private used=new Set<string>();
  connectedCallback(){super.connectedCallback();this.newRound();window.addEventListener("keydown",this.onKey);}
  disconnectedCallback(){window.removeEventListener("keydown",this.onKey);super.disconnectedCallback();}
  private newRound(){
    const choices=WORDS[this.level].filter(w=>!this.used.has(w.word));
    if(!choices.length)this.used.clear();
    this.entry=pick(choices.length?choices:WORDS[this.level]);this.used.add(this.entry.word);
    this.guessed=[];this.status="playing";
  }
  private get misses(){return this.guessed.filter(c=>!this.entry.word.includes(c)).length;}
  private get solved(){return [...this.entry.word].every(c=>this.guessed.includes(c));}
  private guess(c:string){if(this.status!=="playing"||this.guessed.includes(c))return;this.guessed=[...this.guessed,c];if(this.solved){this.status="won";saveGame("palavra-secreta",(this.level+1)*100-this.misses*12);}else if(this.misses>=6){this.status="lost";saveGame("palavra-secreta",0);}}
  private onKey=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest("input,textarea,select"))return;const c=e.key.toUpperCase();if(/^[A-Z]$/.test(c))this.guess(c);};
  private setLevel(level:number){this.level=level;this.round=0;this.used.clear();this.newRound();}
  render(){return html`<section class="arcade-game">${gameHeader("palavra-secreta","Descubra a palavra antes de esgotar seis tentativas.")}
    <div class="arcade-toolbar"><label>Nível <select .value=${String(this.level)} @change=${(e:Event)=>this.setLevel(Number((e.target as HTMLSelectElement).value))}><option value="0">Fácil</option><option value="1">Médio</option><option value="2">Difícil</option></select></label><span>Erros: ${this.misses}/6</span><span>Palavra ${Math.min(this.used.size,10)}/10</span><button @click=${()=>this.newRound()}>Outra palavra</button></div>
    <div class="arcade-word-panel"><p>Dica: <strong>${this.entry.hint}</strong></p><div class="arcade-word" aria-label="Palavra a descobrir">${[...this.entry.word].map(c=>html`<span>${this.guessed.includes(c)||this.status==="lost"?c:""}</span>`)}</div>
    <div class="arcade-letters">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(c=>html`<button ?disabled=${this.guessed.includes(c)||this.status!=="playing"} class=${this.guessed.includes(c)?this.entry.word.includes(c)?"correct":"incorrect":""} @click=${()=>this.guess(c)}>${c}</button>`)}</div>
    <p class="arcade-status" role="status">${this.status==="won"?"Acertou! Escolha outra palavra ou mude de nível.":this.status==="lost"?`Fim de jogo. A resposta era ${this.entry.word}.`:"Selecione as letras ou use o teclado."}</p></div>
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
  private click(i:number){if(this.mode==="ai"&&this.turn!=="X")return;this.apply(i,this.turn);}
  render(){return html`<section class="arcade-game">${gameHeader("jogo-da-velha","Três símbolos em linha vencem. Jogue contra a máquina ou com um amigo.")}
    <div class="arcade-toolbar"><label>Modo <select .value=${this.mode} @change=${(e:Event)=>{this.mode=(e.target as HTMLSelectElement).value;this.reset();}}><option value="ai">Contra a máquina</option><option value="local">Dois jogadores</option></select></label><span>Vitórias X: ${this.wins}</span><button @click=${()=>this.reset()}>Nova partida</button></div>
    <div class="arcade-tic-board" role="group" aria-label="Jogo da Velha">${this.board.map((mark,i)=>html`<button @click=${()=>this.click(i)} ?disabled=${!!mark||!!this.result||(this.mode==="ai"&&this.turn==="O")} aria-label=${`Casa ${i+1}: ${mark||"vazia"}`}>${mark}</button>`)}</div>
    <p class="arcade-status" role="status">${this.result===null?`Vez de ${this.turn}`:this.result==="draw"?"Empate!":`${this.result} venceu!`}</p>
  </section>`;}
}

const ICONS=["●","◆","▲","■","★","✦","♣","♥","☀","☯","♫","⌘"];
@customElement("arcade-memory")
export class ArcadeMemory extends LightElement {
  @state() private difficulty=1;
  @state() private deck:string[]=[];
  @state() private revealed:number[]=[];
  @state() private matched:number[]=[];
  @state() private moves=0;
  @state() private seconds=0;
  @state() private complete=false;
  private timer:ReturnType<typeof setInterval>|undefined;
  private hideTimer:ReturnType<typeof setTimeout>|undefined;
  connectedCallback(){super.connectedCallback();this.reset();}
  disconnectedCallback(){clearInterval(this.timer);clearTimeout(this.hideTimer);super.disconnectedCallback();}
  private get pairs(){return [4,8,12][this.difficulty];}
  private reset(){
    clearTimeout(this.hideTimer);clearInterval(this.timer);
    const icons=shuffle(ICONS).slice(0,this.pairs);
    this.deck=shuffle([...icons,...icons]);this.revealed=[];this.matched=[];this.moves=0;this.seconds=0;this.complete=false;
    this.timer=setInterval(()=>{if(!this.complete)this.seconds++;},1000);
  }
  private flip(i:number){
    if(this.complete||this.matched.includes(i)||this.revealed.includes(i)||this.revealed.length>=2)return;
    const next=[...this.revealed,i];this.revealed=next;
    if(next.length!==2)return;
    this.moves++;
    if(this.deck[next[0]]===this.deck[next[1]]){
      const matched=[...this.matched,...next];this.matched=matched;this.revealed=[];
      if(matched.length===this.deck.length){this.complete=true;clearInterval(this.timer);saveGame("memoria",Math.max(1,1200-this.moves*20-this.seconds));}
    }else this.hideTimer=setTimeout(()=>{this.revealed=[];},850);
  }
  render(){return html`<section class="arcade-game">${gameHeader("memoria","Encontre todos os pares usando menos movimentos e tempo.")}
    <div class="arcade-toolbar"><label>Dificuldade <select .value=${String(this.difficulty)} @change=${(e:Event)=>{this.difficulty=Number((e.target as HTMLSelectElement).value);this.reset();}}><option value="0">Fácil · 4 pares</option><option value="1">Médio · 8 pares</option><option value="2">Difícil · 12 pares</option></select></label><span>Movimentos: ${this.moves}</span><span>Tempo: ${this.seconds}s</span><button @click=${()=>this.reset()}>Reiniciar</button></div>
    <div class="arcade-memory-board" role="group" aria-label="Cartas de memória">${this.deck.map((v,i)=>html`<button class=${this.revealed.includes(i)||this.matched.includes(i)?"face-up":""} ?disabled=${this.matched.includes(i)} @click=${()=>this.flip(i)} aria-label=${`Carta ${i+1}, ${this.revealed.includes(i)||this.matched.includes(i)?v:"virada"}`}>${this.revealed.includes(i)||this.matched.includes(i)?v:"?"}</button>`)}</div>
    <p class="arcade-status" role="status">${this.complete?`Concluído em ${this.moves} movimentos e ${this.seconds} segundos!`:"Vire duas cartas e encontre o par."}</p>
  </section>`;}
