import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { gameHeader, pick, saveGame } from "./arcade-core";

type CellState="correct"|"present"|"absent";
type TermoEntry={word:string;hint:string};
const WORD_BANK:TermoEntry[][]=[
  [
    {word:"LIVRO",hint:"Leitura"},{word:"CASAS",hint:"Moradia"},{word:"PRAIA",hint:"Litoral"},
    {word:"NUVEM",hint:"Céu"},{word:"FESTA",hint:"Comemoração"},{word:"PLANO",hint:"Objetivo"},
    {word:"PEDRA",hint:"Natureza"},{word:"CAMPO",hint:"Paisagem"},{word:"NORTE",hint:"Direção"},
    {word:"TARDE",hint:"Período do dia"},{word:"FOLHA",hint:"Árvore"},{word:"TERRA",hint:"Planeta"},
    {word:"CORPO",hint:"Anatomia"},{word:"VERDE",hint:"Cor"},{word:"BRISA",hint:"Vento"},
    {word:"TEMPO",hint:"Clima"},{word:"SONHO",hint:"Sono"},{word:"PORTA",hint:"Entrada"},
    {word:"RISCO",hint:"Perigo"},{word:"SALTO",hint:"Movimento"}
  ],
  [
    {word:"SINAL",hint:"Comunicação"},{word:"DADOS",hint:"Tecnologia"},{word:"LINHA",hint:"Geometria"},
    {word:"TAXAS",hint:"Economia"},{word:"ATIVO",hint:"Finanças"},{word:"LUCRO",hint:"Negócios"},
    {word:"CUSTO",hint:"Despesas"},{word:"LAPIS",hint:"Escrita"},{word:"PODER",hint:"Autoridade"},
    {word:"VALOR",hint:"Medida"},{word:"BOLSA",hint:"Mercado"},{word:"CHAVE",hint:"Acesso"},
    {word:"METAS",hint:"Planejamento"},{word:"SORTE",hint:"Acaso"},{word:"FATOR",hint:"Matemática"},
    {word:"ROCHA",hint:"Geologia"},{word:"VIGOR",hint:"Energia"},{word:"SABER",hint:"Conhecimento"},
    {word:"RAZAO",hint:"Argumento"},{word:"TEXTO",hint:"Linguagem"}
  ],
  [
    {word:"QUINA",hint:"Geometria"},{word:"EXATO",hint:"Precisão"},{word:"CIFRA",hint:"Número"},
    {word:"TRAMA",hint:"Enredo"},{word:"PRUMO",hint:"Direção"},{word:"TENAZ",hint:"Persistente"},
    {word:"VASTO",hint:"Imenso"},{word:"ANEXO",hint:"Documento"},{word:"CERNE",hint:"Essência"},
    {word:"NEXOS",hint:"Conexões"},{word:"RUBRO",hint:"Vermelho"},{word:"SAFRA",hint:"Colheita"},
    {word:"INATO",hint:"Natural"},{word:"DUETO",hint:"Música"},{word:"COESO",hint:"Unido"},
    {word:"FRUIR",hint:"Aproveitar"},{word:"OBITO",hint:"Falecimento"},{word:"FURIA",hint:"Raiva"},
    {word:"BRUMA",hint:"Neblina"},{word:"LINFA",hint:"Biologia"}
  ]
];
export function evaluateTermo(answer:string,guess:string):CellState[]{
  const out:CellState[]=Array(5).fill("absent");
  const pool=new Map<string,number>();
  for(let i=0;i<5;i++)if(answer[i]===guess[i])out[i]="correct";
  else pool.set(answer[i],(pool.get(answer[i])||0)+1);
  for(let i=0;i<5;i++){
    if(out[i]==="correct")continue;
    const left=pool.get(guess[i])||0;
    if(left>0){out[i]="present";pool.set(guess[i],left-1);}
  }
  return out;
}
function readStreak():{wins:number;streak:number;best:number}{
  try{const s=JSON.parse(localStorage.getItem("2t.games.termo.stats.v1")||"{}");
    return {wins:Number(s.wins)||0,streak:Number(s.streak)||0,best:Number(s.best)||0};
  }catch{return {wins:0,streak:0,best:0};}
}
@customElement("arcade-words")
export class ArcadeWords extends LightElement {
  @state() private difficulty=0;
  @state() private answer:TermoEntry=WORD_BANK[0][0];
  @state() private guesses:string[]=[];
  @state() private input="";
  @state() private states:CellState[][]=[];
  @state() private status:"playing"|"won"|"lost"="playing";
  @state() private hintOpen=false;
  @state() private message="";
  @state() private record=readStreak();
  private used=new Set<string>();
  private noteTimer:ReturnType<typeof setTimeout>|undefined;
  connectedCallback(){super.connectedCallback();this.restart();window.addEventListener("keydown",this.onKey);}
  disconnectedCallback(){clearTimeout(this.noteTimer);window.removeEventListener("keydown",this.onKey);super.disconnectedCallback();}
  private restart(){
    clearTimeout(this.noteTimer);
    const available=WORD_BANK[this.difficulty].filter(e=>!this.used.has(e.word));
    if(!available.length)this.used.clear();
    this.answer=pick(available.length?available:WORD_BANK[this.difficulty]);
    this.used.add(this.answer.word);
    this.guesses=[];this.states=[];this.input="";this.status="playing";this.message="";
    this.hintOpen=false;
  }
  private switchLevel(value:number){this.difficulty=value;this.used.clear();this.restart();}
  private notify(message:string){this.message=message;clearTimeout(this.noteTimer);this.noteTimer=setTimeout(()=>{this.message="";},2200);}
  private key(char:string){
    if(this.status!=="playing")return;
    if(char==="BACKSPACE"){this.input=this.input.slice(0,-1);return;}
    if(char==="ENTER"){this.submit();return;}
    if(/^[A-Z]$/.test(char)&&this.input.length<5)this.input+=char;
  }
  private onKey=(e:KeyboardEvent)=>{
    if(e.ctrlKey||e.altKey||e.metaKey||(e.target as HTMLElement|null)?.closest("input,textarea,select,[contenteditable=true]"))return;
    const normalized=e.key.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
    if(normalized==="ENTER"||normalized==="BACKSPACE"||/^[A-Z]$/.test(normalized)){
      e.preventDefault();this.key(normalized);
    }
  };
  private submit(){
    if(this.input.length!==5){this.notify("Digite uma palavra de cinco letras.");return;}
    const current=this.input, feedback=evaluateTermo(this.answer.word,current);
    this.guesses=[...this.guesses,current];this.states=[...this.states,feedback];this.input="";
    if(current===this.answer.word){this.status="won";this.saveResult(true);}
    else if(this.guesses.length>=6){this.status="lost";this.saveResult(false);}
  }
  private saveResult(win:boolean){
    const r=readStreak();
    this.record={wins:r.wins+(win?1:0),streak:win?r.streak+1:0,best:win?Math.max(r.best,r.streak+1):r.best};
    try{localStorage.setItem("2t.games.termo.stats.v1",JSON.stringify(this.record));}catch{/* optional */}
    saveGame("palavra-secreta",win?Math.max(25,(7-this.guesses.length)*100+(this.difficulty*60)):0);
  }
  private keyboardStatus(char:string):CellState|undefined{
    let best:CellState|undefined;
    for(let i=0;i<this.guesses.length;i++)for(let j=0;j<5;j++)if(this.guesses[i][j]===char){
      const state=this.states[i][j];
      if(state==="correct")return "correct";
      if(state==="present")best="present";
      else if(!best)best="absent";
    }
    return best;
  }
  render(){
    const rows=["QWERTYUIOP","ASDFGHJKL","ZXCVBNM"];
    const finished=this.status!=="playing";
    return html`<section class="arcade-game termo-game">
      ${gameHeader("palavra-secreta","Descubra a palavra de cinco letras em até seis tentativas.")}
      <div class="termo-topline">
        <div><span class="games-kicker">TERMO · 5 LETRAS / 6 TENTATIVAS</span><div class="termo-levels">
          ${["Fácil","Médio","Difícil"].map((l,i)=>html`<button type="button" aria-pressed=${this.difficulty===i} @click=${()=>this.switchLevel(i)}>${l}</button>`)}
        </div></div>
        <div class="termo-score"><span>Vitórias <strong>${this.record.wins}</strong></span><span>Sequência <strong>${this.record.streak}</strong></span></div>
      </div>
      <div class="termo-play">
        <div class="termo-board" role="grid" aria-label="Seis tentativas de cinco letras">
          ${Array.from({length:6},(_,row)=>html`<div class="termo-row" role="row">
            ${Array.from({length:5},(_,col)=>{
              const letter=this.guesses[row]?.[col]||(row===this.guesses.length&&this.status==="playing"?this.input[col]:"")||"";
              const feedback=this.states[row]?.[col];
              const stateClass=feedback?"is-"+feedback:letter?"is-filled":"";
              const description=feedback?", "+(feedback==="correct"?"posição correta":feedback==="present"?"posição diferente":"não está na palavra"):"";
              return html`<div role="gridcell" class=${"termo-cell "+stateClass+(row===this.guesses.length&&this.status==="playing"?" is-current":"")}
                aria-label=${"Linha "+(row+1)+", letra "+(col+1)+": "+(letter||"vazio")+description}>${letter}</div>`;
            })}
          </div>`)}
        </div>
        <p class="termo-message" role="status" aria-live="polite">${this.message||(!finished?"Tentativa "+(this.guesses.length+1)+" de 6":"")}</p>
        ${finished?html`<div class="termo-result" role="status">
          <span class="games-kicker">${this.status==="won"?"PALAVRA DESCOBERTA":"FIM DAS TENTATIVAS"}</span>
          <strong>${this.answer.word}</strong>
          <p>${this.status==="won"?"Acertou em "+this.guesses.length+(this.guesses.length===1?" tentativa.":" tentativas."):"Mais uma rodada? A próxima palavra está pronta."}</p>
          <button type="button" class="termo-next" @click=${()=>this.restart()}>Nova palavra <span aria-hidden="true">↗</span></button>
        </div>`:""}
        <div class="termo-keyboard" role="group" aria-label="Teclado do TERMO">
          ${rows.map(row=>html`<div class="termo-key-row">
            ${row.split("").map(c=>html`<button type="button" class=${"termo-key key-"+(this.keyboardStatus(c)||"unused")}
              @click=${()=>this.key(c)} ?disabled=${finished} aria-label=${"Letra "+c}>${c}</button>`)}
          </div>`)}
          <div class="termo-key-actions">
            <button type="button" @click=${()=>this.key("BACKSPACE")} ?disabled=${finished}>⌫ Apagar</button>
            <button type="button" class="termo-enter" @click=${()=>this.key("ENTER")} ?disabled=${finished}>Confirmar ↵</button>
          </div>
        </div>
      </div>
      <div class="termo-guide">
        <div><span class="termo-legend exact"></span><strong>Correta</strong><small>Letra na posição certa</small></div>
        <div><span class="termo-legend misplaced"></span><strong>Em outra posição</strong><small>Letra presente na palavra</small></div>
        <div><span class="termo-legend missing"></span><strong>Não aparece</strong><small>Letra ausente ou excedente</small></div>
      </div>
      <div class="termo-hint">
        <button type="button" aria-expanded=${this.hintOpen} @click=${()=>this.hintOpen=!this.hintOpen}>${this.hintOpen?"Ocultar dica":"Precisa de uma dica?"} <span aria-hidden="true">${this.hintOpen?"−":"+"}</span></button>
        ${this.hintOpen?html`<span>Pista: <strong>${this.answer.hint}</strong></span>`:""}
      </div>
    </section>`;
  }
}
