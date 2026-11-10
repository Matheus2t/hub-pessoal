import { html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { LightElement } from "../ui";
import { gameHeader, pick, saveGame } from "./arcade-core";

type Ball={x:number;y:number;vx:number;vy:number};
type Brick={x:number;y:number;alive:boolean};
const BG="#101113",FG="#ededed",MUTED="#828589";
const clamp=(n:number,low:number,high:number)=>Math.max(low,Math.min(high,n));

@customElement("arcade-breakout")
export class ArcadeBreakout extends LightElement {
  @state() private score=0;
  @state() private lives=3;
  @state() private level=1;
  @state() private status:"ready"|"playing"|"paused"|"over"|"won"="ready";
  private canvas:HTMLCanvasElement|null=null;
  private frameId=0;
  private last=0;
  private left=false;
  private right=false;
  private paddle=300;
  private ball:Ball={x:350,y:390,vx:3.4,vy:-4};
  private bricks:Brick[]=[];
  private readonly W=700;
  private readonly H=450;
  protected firstUpdated(){this.canvas=this.querySelector("canvas");this.setup();this.paint();}
  connectedCallback(){super.connectedCallback();window.addEventListener("keydown",this.onKeyDown);window.addEventListener("keyup",this.onKeyUp);}
  disconnectedCallback(){cancelAnimationFrame(this.frameId);window.removeEventListener("keydown",this.onKeyDown);window.removeEventListener("keyup",this.onKeyUp);super.disconnectedCallback();}
  private setup(){
    this.paddle=300;this.ball={x:350,y:380,vx:3.25+this.level*.3,vy:-(3.6+this.level*.3)};
    this.bricks=Array.from({length:50},(_,i)=>({x:20+(i%10)*67,y:50+Math.floor(i/10)*33,alive:true}));
  }
  private reset(){cancelAnimationFrame(this.frameId);this.score=0;this.lives=3;this.level=1;this.status="ready";this.setup();this.paint();}
  private start(){if(this.status==="paused"){this.status="playing";this.last=0;this.frameId=requestAnimationFrame(this.tick);return;}if(this.status==="over"||this.status==="won")this.reset();this.status="playing";this.last=0;this.frameId=requestAnimationFrame(this.tick);}
  private pause(){if(this.status==="playing"){this.status="paused";cancelAnimationFrame(this.frameId);this.paint();}}
  private onKeyDown=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest("input,textarea,select"))return;if(["ArrowLeft","ArrowRight","a","d"].includes(e.key)){e.preventDefault();if(e.key==="ArrowLeft"||e.key==="a")this.left=true;else this.right=true;}if(e.code==="Space"){e.preventDefault();this.status==="playing"?this.pause():this.start();}};
  private onKeyUp=(e:KeyboardEvent)=>{if(e.key==="ArrowLeft"||e.key==="a")this.left=false;if(e.key==="ArrowRight"||e.key==="d")this.right=false;};
  private pointer(e:PointerEvent){const rect=(e.currentTarget as HTMLCanvasElement).getBoundingClientRect();this.paddle=clamp((e.clientX-rect.left)*this.W/rect.width-54,0,this.W-108);if(this.status!=="playing")this.paint();}
  private tick=(time:number)=>{
    if(this.status!=="playing")return;
    const delta=this.last?clamp((time-this.last)/16.67,.3,2):1;this.last=time;
    if(this.left)this.paddle-=7*delta;if(this.right)this.paddle+=7*delta;this.paddle=clamp(this.paddle,0,this.W-108);
    this.ball.x+=this.ball.vx*delta;this.ball.y+=this.ball.vy*delta;
    const b=this.ball;
    if(b.x<=8||b.x>=this.W-8){b.vx*=-1;b.x=clamp(b.x,8,this.W-8);}
    if(b.y<=8){b.vy=Math.abs(b.vy);b.y=8;}
    if(b.vy>0&&b.y>=414&&b.y<=429&&b.x>=this.paddle-7&&b.x<=this.paddle+115){
      b.y=414;b.vy=-Math.abs(b.vy);b.vx=clamp((b.x-(this.paddle+54))/12,-6.6,6.6);
    }
    for(const brick of this.bricks)if(brick.alive&&b.x+7>=brick.x&&b.x-7<=brick.x+62&&b.y+7>=brick.y&&b.y-7<=brick.y+25){
      brick.alive=false;b.vy*=-1;this.score+=10;break;
    }
    if(b.y>this.H+10){this.lives--;if(this.lives<=0){this.status="over";saveGame("breakout",this.score);this.paint();return;}this.ball={x:this.paddle+54,y:380,vx:3.3+this.level*.3,vy:-(3.5+this.level*.3)};}
    if(this.bricks.every(br=>!br.alive)){
      if(this.level>=3){this.status="won";saveGame("breakout",this.score);this.paint();return;}
      this.level++;this.setup();
    }
    this.paint();this.frameId=requestAnimationFrame(this.tick);
  };
  private paint(){
    const ctx=this.canvas?.getContext("2d");if(!ctx)return;
    ctx.fillStyle=BG;ctx.fillRect(0,0,this.W,this.H);
    for(const brick of this.bricks)if(brick.alive){ctx.fillStyle=["#d7d7d7","#c2c2c2","#a6a6a6","#898989","#666666"][Math.floor((brick.y-50)/33)];ctx.fillRect(brick.x,brick.y,62,25);}
    ctx.fillStyle=FG;ctx.fillRect(this.paddle,420,108,10);
    ctx.beginPath();ctx.fillStyle="#f6f6f6";ctx.arc(this.ball.x,this.ball.y,7,0,Math.PI*2);ctx.fill();
    if(this.status!=="playing"){ctx.fillStyle="rgba(12,13,15,.67)";ctx.fillRect(0,0,this.W,this.H);ctx.fillStyle=FG;ctx.textAlign="center";ctx.font="600 30px sans-serif";ctx.fillText(this.status==="ready"?"Breakout":this.status==="paused"?"Pausado":this.status==="won"?"Você venceu!":"Fim de jogo",350,225);ctx.textAlign="left";}
  }
  render(){return html`<section class="arcade-game">${gameHeader("breakout","Destrua os blocos em três fases sem perder suas três vidas.")}
    <div class="arcade-toolbar"><span>Pontos: <strong>${this.score}</strong></span><span>Vidas: <strong>${this.lives}</strong></span><span>Fase: <strong>${this.level}/3</strong></span><button @click=${()=>this.status==="playing"?this.pause():this.start()}>${this.status==="playing"?"Pausar":this.status==="paused"?"Continuar":"Jogar"}</button><button @click=${()=>this.reset()}>Reiniciar</button></div>
    <div class="arcade-canvas-wrap"><canvas width="700" height="450" @pointermove=${(e:PointerEvent)=>this.pointer(e)} @pointerdown=${(e:PointerEvent)=>this.pointer(e)} aria-label="Jogo Breakout: mova a plataforma com o mouse, toque ou setas"></canvas></div>
    <div class="arcade-mobile-pad"><button @pointerdown=${()=>this.left=true} @pointerup=${()=>this.left=false} @pointerleave=${()=>this.left=false}>←</button><button @pointerdown=${()=>this.right=true} @pointerup=${()=>this.right=false} @pointerleave=${()=>this.right=false}>→</button></div>
    <p class="arcade-status">Controle com mouse, toque, setas ou A/D. Espaço pausa o jogo.</p>
  </section>`;}
}

@customElement("arcade-pong")
export class ArcadePong extends LightElement {
  @state() private player=0;
  @state() private cpu=0;
  @state() private status:"ready"|"playing"|"paused"|"over"="ready";
  private canvas:HTMLCanvasElement|null=null;
  private frameId=0;
  private last=0;
  private up=false;
  private down=false;
  private y=175;
  private aiY=175;
  private ball:Ball={x:350,y:210,vx:-5,vy:2.5};
  private readonly W=700;
  private readonly H=420;
  protected firstUpdated(){this.canvas=this.querySelector("canvas");this.paint();}
  connectedCallback(){super.connectedCallback();window.addEventListener("keydown",this.onKeyDown);window.addEventListener("keyup",this.onKeyUp);}
  disconnectedCallback(){cancelAnimationFrame(this.frameId);window.removeEventListener("keydown",this.onKeyDown);window.removeEventListener("keyup",this.onKeyUp);super.disconnectedCallback();}
  private serve(toRight:boolean){this.ball={x:350,y:210,vx:(toRight?1:-1)*5,vy:(Math.random()-.5)*5};this.y=175;this.aiY=175;}
  private reset(){cancelAnimationFrame(this.frameId);this.player=0;this.cpu=0;this.status="ready";this.serve(false);this.paint();}
  private start(){if(this.status==="over")this.reset();if(this.status==="playing")return;this.status="playing";this.last=0;this.frameId=requestAnimationFrame(this.tick);}
  private pause(){if(this.status==="playing"){this.status="paused";cancelAnimationFrame(this.frameId);this.paint();}}
  private onKeyDown=(e:KeyboardEvent)=>{
    if((e.target as HTMLElement)?.closest("input,textarea,select"))return;
    if(["ArrowUp","ArrowDown","w","s"].includes(e.key)){e.preventDefault();if(e.key==="ArrowUp"||e.key==="w")this.up=true;else this.down=true;}
    if(e.code==="Space"){e.preventDefault();this.status==="playing"?this.pause():this.start();}
  };
  private onKeyUp=(e:KeyboardEvent)=>{if(e.key==="ArrowUp"||e.key==="w")this.up=false;if(e.key==="ArrowDown"||e.key==="s")this.down=false;};
  private pointer(e:PointerEvent){const rect=(e.currentTarget as HTMLCanvasElement).getBoundingClientRect();this.y=clamp((e.clientY-rect.top)*this.H/rect.height-35,0,this.H-70);}
  private tick=(time:number)=>{
    if(this.status!=="playing")return;
    const dt=this.last?clamp((time-this.last)/16.67,.3,2):1;this.last=time;
    if(this.up)this.y-=7*dt;if(this.down)this.y+=7*dt;this.y=clamp(this.y,0,this.H-70);
    this.aiY+=clamp(this.ball.y-(this.aiY+35),-4.3*dt,4.3*dt);this.aiY=clamp(this.aiY,0,this.H-70);
    const b=this.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.y<8||b.y>this.H-8){b.vy*=-1;b.y=clamp(b.y,8,this.H-8);}
    if(b.vx<0&&b.x<=34&&b.x>=15&&b.y>=this.y-7&&b.y<=this.y+77){b.vx=Math.abs(b.vx)*1.035;b.vy=clamp((b.y-(this.y+35))/9,-6,6);}
    if(b.vx>0&&b.x>=666&&b.x<=687&&b.y>=this.aiY-7&&b.y<=this.aiY+77){b.vx=-Math.abs(b.vx)*1.035;b.vy=clamp((b.y-(this.aiY+35))/9,-6,6);}
    if(b.x<0||b.x>this.W){
      if(b.x<0)this.cpu++;else this.player++;
      if(this.player>=7||this.cpu>=7){this.status="over";saveGame("pong",this.player>this.cpu?1:0);this.paint();return;}
      this.serve(b.x>this.W);
    }
    this.paint();this.frameId=requestAnimationFrame(this.tick);
  };
  private paint(){
    const ctx=this.canvas?.getContext("2d");if(!ctx)return;
    ctx.fillStyle=BG;ctx.fillRect(0,0,this.W,this.H);ctx.strokeStyle="#3e4044";ctx.setLineDash([9,12]);ctx.beginPath();ctx.moveTo(350,0);ctx.lineTo(350,this.H);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle=FG;ctx.fillRect(22,this.y,12,70);ctx.fillRect(666,this.aiY,12,70);
    ctx.fillRect(this.ball.x-7,this.ball.y-7,14,14);
    if(this.status!=="playing"){ctx.fillStyle="rgba(12,13,15,.60)";ctx.fillRect(0,0,this.W,this.H);ctx.fillStyle=FG;ctx.textAlign="center";ctx.font="600 30px sans-serif";ctx.fillText(this.status==="ready"?"Pong":this.status==="paused"?"Pausado":this.player>this.cpu?"Você venceu!":"A máquina venceu",350,205);ctx.textAlign="left";}
  }
  render(){return html`<section class="arcade-game">${gameHeader("pong","Dispute contra o computador. Vence quem fizer sete pontos primeiro.")}
    <div class="arcade-toolbar"><span>Você: <strong>${this.player}</strong></span><span>Computador: <strong>${this.cpu}</strong></span><button @click=${()=>this.status==="playing"?this.pause():this.start()}>${this.status==="playing"?"Pausar":this.status==="paused"?"Continuar":"Jogar"}</button><button @click=${()=>this.reset()}>Reiniciar</button></div>
    <div class="arcade-canvas-wrap"><canvas width="700" height="420" @pointermove=${(e:PointerEvent)=>this.pointer(e)} @pointerdown=${(e:PointerEvent)=>this.pointer(e)} aria-label="Jogo Pong contra computador"></canvas></div>
    <div class="arcade-mobile-pad"><button @pointerdown=${()=>this.up=true} @pointerup=${()=>this.up=false} @pointerleave=${()=>this.up=false}>↑</button><button @pointerdown=${()=>this.down=true} @pointerup=${()=>this.down=false} @pointerleave=${()=>this.down=false}>↓</button></div>
    <p class="arcade-status">Mova a plataforma com W/S, setas, mouse ou toque.</p>
  </section>`;}
}

const TEXTS=[
  "Aprender a programar exige consistência e prática. Pequenas melhorias realizadas todos os dias criam resultados duradouros. O importante é continuar estudando e construir projetos que resolvam problemas reais.",
  "A tecnologia conecta pessoas e transforma ideias em ferramentas úteis. A velocidade não é tudo: escrever com atenção, clareza e precisão faz diferença em qualquer atividade profissional.",
  "O mercado financeiro acompanha mudanças na economia. Investidores analisam riscos, custos e oportunidades antes de decidir. Informação confiável e planejamento ajudam a tomar decisões conscientes.",
  "Em uma boa rotina de estudos, cada sessão tem um objetivo. Exercícios frequentes fortalecem a memória, a leitura melhora o vocabulário e a revisão ajuda a consolidar o conhecimento."
];
@customElement("arcade-typing")
export class ArcadeTyping extends LightElement {
  @state() private duration=60;
  @state() private remaining=60;
  @state() private text=TEXTS[0];
  @state() private typed="";
  @state() private status:"ready"|"playing"|"over"="ready";
  @state() private wpm=0;
  @state() private accuracy=100;
  private interval:ReturnType<typeof setInterval>|undefined;
  private started=0;
  connectedCallback(){super.connectedCallback();this.reset();}
  disconnectedCallback(){clearInterval(this.interval);super.disconnectedCallback();}
  private reset(){clearInterval(this.interval);this.text=pick(TEXTS.filter(t=>t!==this.text));this.typed="";this.remaining=this.duration;this.wpm=0;this.accuracy=100;this.status="ready";this.started=0;}
  private onInput(e:Event){
    if(this.status==="over")return;
    const value=(e.target as HTMLTextAreaElement).value.slice(0,this.text.length);
    if(this.status==="ready"){
      this.status="playing";this.started=performance.now();
      this.interval=setInterval(()=>this.updateMetrics(),100);
    }
    this.typed=value;this.updateMetrics();
    if(this.typed.length===this.text.length)this.finish();
  }
  private updateMetrics(){
    if(this.status!=="playing")return;
    const elapsed=Math.min(this.duration,(performance.now()-this.started)/1000);
    const correct=[...this.typed].filter((c,i)=>c===this.text[i]).length;
    this.accuracy=this.typed.length?Math.round(correct/this.typed.length*100):100;
    this.wpm=elapsed>0?Math.round(correct/5/(elapsed/60)):0;
    this.remaining=Math.max(0,Math.ceil(this.duration-elapsed));
    if(elapsed>=this.duration)this.finish();
  }
  private finish(){if(this.status==="over")return;clearInterval(this.interval);this.status="over";saveGame("digitacao",this.wpm);}
  render(){return html`<section class="arcade-game">${gameHeader("digitacao","Digite o texto com precisão e descubra sua velocidade em palavras por minuto.")}
    <div class="arcade-toolbar"><label>Duração <select .value=${String(this.duration)} @change=${(e:Event)=>{this.duration=Number((e.target as HTMLSelectElement).value);this.reset();}}><option value="30">30 segundos</option><option value="60">60 segundos</option></select></label><span>Tempo: <strong>${this.remaining}s</strong></span><span>WPM: <strong>${this.wpm}</strong></span><span>Precisão: <strong>${this.accuracy}%</strong></span><button @click=${()=>this.reset()}>Novo teste</button></div>
    <div class="arcade-typing"><div class="arcade-typing-text" aria-label="Texto a digitar">${[...this.text].map((ch,i)=>html`<span class=${i>=this.typed.length?"untyped":this.typed[i]===ch?"typed-correct":"typed-wrong"}>${ch}</span>`)}</div>
    <textarea rows="5" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Comece a digitar aqui para iniciar o cronômetro..." .value=${this.typed} @input=${(e:Event)=>this.onInput(e)} ?disabled=${this.status==="over"} aria-label="Digite o texto apresentado"></textarea>
    <p class="arcade-status" role="status">${this.status==="over"?`Fim! ${this.wpm} WPM com ${this.accuracy}% de precisão.`:"O tempo começa no primeiro caractere."}</p></div>
  </section>`;}
}

@customElement("arcade-reflex")
export class ArcadeReflex extends LightElement {
  @state() private status:"idle"|"waiting"|"ready"|"early"|"done"="idle";
  @state() private ms=0;
  @state() private best=0;
  private timeout:ReturnType<typeof setTimeout>|undefined;
  private startTime=0;
  connectedCallback(){super.connectedCallback();try{this.best=Number(localStorage.getItem("2t.games.reflex.best")||0)||0;}catch{/* storage optional */}}
  disconnectedCallback(){clearTimeout(this.timeout);super.disconnectedCallback();}
  private action(){
    if(this.status==="waiting"){clearTimeout(this.timeout);this.status="early";return;}
    if(this.status==="ready"){
      this.ms=Math.round(performance.now()-this.startTime);
      this.status="done";
      if(this.best===0||this.ms<this.best){this.best=this.ms;try{localStorage.setItem("2t.games.reflex.best",String(this.best));}catch{/* storage optional */}}
      saveGame("reflexos",this.ms,true);return;
    }
    this.status="waiting";this.timeout=setTimeout(()=>{this.startTime=performance.now();this.status="ready";},1500+Math.random()*3000);
  }
  render(){return html`<section class="arcade-game">${gameHeader("reflexos","Espere o sinal e clique o mais rápido possível.")}
    <div class="arcade-toolbar"><span>Melhor resultado: <strong>${this.best?this.best+" ms":"—"}</strong></span><span>Último tempo: <strong>${this.ms?this.ms+" ms":"—"}</strong></span></div>
    <button class=${`arcade-reflex-area reflex-${this.status}`} @click=${()=>this.action()} aria-label="Área de teste de reflexos">
      <strong>${this.status==="idle"?"Clique para começar":this.status==="waiting"?"Aguarde...":this.status==="ready"?"CLIQUE AGORA!":this.status==="early"?"Muito cedo!":"Seu tempo: "+this.ms+" ms"}</strong>
      <span>${this.status==="ready"?"Reaja!":this.status==="waiting"?"Clique somente quando mudar a tela":this.status==="done"?"Clique para tentar novamente":this.status==="early"?"Clique para recomeçar":"O sinal aparece após um intervalo aleatório."}</span>
    </button>
    <p class="arcade-status">O cronômetro só começa quando o sinal aparece. Tocar antes reinicia a tentativa.</p>
  </section>`;}
}
