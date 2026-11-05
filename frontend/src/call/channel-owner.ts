import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {channelLink,type ChannelAdmin,type ChannelStatus} from './protocol';
import {requestChannel} from './channel';

@customElement('call-channel-owner')
export class CallChannelOwner extends LightElement {
 @state() private channel?:ChannelStatus;
 @state() private busy=false;
 @state() private message='';
 @state() private error='';
 private pending?:AbortController;

 disconnectedCallback(){this.pending?.abort();super.disconnectedCallback()}

 private async submit(event:SubmitEvent){
  event.preventDefault();
  if(this.busy)return;
  const form=event.currentTarget as HTMLFormElement;
  const input=form.elements.namedItem('admin') as HTMLInputElement;
  const data=new FormData(form),admin=input.value,name=String(data.get('name')??'').trim();
  const [action,target]=((event.submitter as HTMLButtonElement|null)?.value??'status').split(':');
  if(!admin){input.focus();return}
  let request:ChannelAdmin;
  if(action==='create'||action==='rename'){
   if(!name){this.error='Informe o nome da sala.';return}
   request={type:'channel_admin',admin,action,name};
  }else if(action==='kick'||action==='block'||action==='unblock'){
   request={type:'channel_admin',admin,action,target};
  }else if(action==='rotate'||action==='status'){
   if(action==='rotate'&&!window.confirm('Revogar este endereço e desconectar quem está na sala?'))return;
   request={type:'channel_admin',admin,action};
  }else return;
  input.value='';this.busy=true;this.error='';this.message='';
  const controller=this.pending=new AbortController();
  try{
   const channel=await requestChannel(request,controller.signal);
   if(!controller.signal.aborted){this.channel=channel;this.message=action==='status'?'':action==='rotate'?'Novo link gerado.':'Alteração salva.'}
  }catch(error){if(!controller.signal.aborted)this.error=(error as Error).message}
  finally{if(this.pending===controller){this.pending=undefined;this.busy=false}}
 }

 private async copy(room:string){
  try{await navigator.clipboard.writeText(channelLink(room));this.message='Link copiado.';this.error=''}
  catch{this.error='Não foi possível copiar. Abra a sala e copie o endereço do navegador.'}
 }

 render(){
  const channel=this.channel?.room?this.channel:undefined;
  return html`<header><div><a href="#/call">Voltar ao 2T Call</a><h1>Gerenciar sala permanente</h1></div></header>
  <form class="call-channel-panel" @submit=${this.submit}>
   <label>Credencial do proprietário<input name="admin" type="password" autocomplete="off" maxlength="256" required></label>
   <p class="call-note">Use a credencial do 2T Call a cada ação administrativa.</p>
   <button type="submit" value="status" ?disabled=${this.busy}>Consultar sala</button>
   ${this.channel?html`
    <label>Nome da sala<input name="name" maxlength="40" .value=${channel?.name??''}></label>
    <button type="submit" value=${channel?'rename':'create'} ?disabled=${this.busy}>${channel?'Renomear sala':'Criar sala permanente'}</button>`:nothing}
   ${channel?html`
    <div class="call-channel-actions"><a href=${channelLink(channel.room)}>Abrir sala</a>
     <button type="button" @click=${()=>this.copy(channel.room)}>Copiar link</button>
     <button type="submit" value="rotate" ?disabled=${this.busy}>Revogar link</button></div>
    <h2>Participantes · ${channel.online}/5</h2>
    ${channel.participants?.length?html`<ul>${channel.participants.map(p=>html`<li><span>${p.name}</span>
     <button type="submit" value=${`kick:${p.id}`} ?disabled=${this.busy} aria-label=${`Expulsar ${p.name}`}>Expulsar</button>
     <button type="submit" value=${`block:${p.id}`} ?disabled=${this.busy} aria-label=${`Bloquear ${p.name}`}>Bloquear</button></li>`)}</ul>`:html`<p>Ninguém conectado.</p>`}
    <h2>Bloqueios de navegador</h2><p class="call-note">Limpar os dados ou usar outro navegador contorna o bloqueio. Revogue o link se ele tiver sido divulgado.</p>
    ${channel.blocked?.length?html`<ul>${channel.blocked.map(p=>html`<li><span>${p.name}</span>
     <button type="submit" value=${`unblock:${p.id}`} ?disabled=${this.busy} aria-label=${`Desbloquear ${p.name}`}>Desbloquear</button></li>`)}</ul>`:nothing}
   `:nothing}
  </form>
  ${this.busy||this.message?html`<p role="status">${this.busy?'Consultando o sinalizador…':this.message}</p>`:nothing}
  ${this.error?html`<p class="call-error" role="alert">${this.error}</p>`:nothing}`;
 }
}
