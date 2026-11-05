import {html,nothing} from 'lit';
import {customElement,state} from 'lit/decorators.js';
import {LightElement} from '../ui';
import {channelLink,type ChannelAdmin,type ChannelStatus} from './protocol';
import {requestChannel} from './channel';

@customElement('call-channel-owner')
export class CallChannelOwner extends LightElement {
 @state() private channel?:ChannelStatus;
 @state() private busy=false;
 @state() private authorized=false;
 private ownerCredential='';
 @state() private message='';
 @state() private error='';
 private pending?:AbortController;

 disconnectedCallback(){this.pending?.abort();this.ownerCredential='';this.authorized=false;super.disconnectedCallback()}

 private async submit(event:SubmitEvent){
  event.preventDefault();
  if(this.busy)return;
  const form=event.currentTarget as HTMLFormElement;
  const input=form.elements.namedItem('admin') as HTMLInputElement;
  const passwordInput=form.elements.namedItem('password') as HTMLInputElement|null;
  const password=passwordInput?.value??'';
  const data=new FormData(form),admin=input.value||this.ownerCredential,name=String(data.get('name')??'').trim();
  const [action,target]=((event.submitter as HTMLButtonElement|null)?.value??'status').split(':');
  if(!admin){input.focus();return}
  let request:ChannelAdmin;
  if(action==='create'||action==='rename'){
   if(!name){this.error='Informe o nome da sala.';return}
   if(action==='create'&&password.length<5){this.error='Informe uma senha com pelo menos 5 caracteres.';passwordInput?.focus();return}
   request=action==='create'?{type:'channel_admin',admin,action,name,password}:{type:'channel_admin',admin,action,name};
  }else if(action==='password'){
   if(password.length<5){this.error='Informe uma senha com pelo menos 5 caracteres.';passwordInput?.focus();return}
   request={type:'channel_admin',admin,action,password};
  }else if(action==='kick'||action==='block'||action==='unblock'){
   request={type:'channel_admin',admin,action,target};
  }else if(action==='rotate'||action==='status'){
   if(action==='rotate'&&!window.confirm('Revogar este endereço e desconectar quem está na sala?'))return;
   request={type:'channel_admin',admin,action};
  }else return;
  input.value='';if(passwordInput)passwordInput.value='';this.busy=true;this.error='';this.message='';
  const controller=this.pending=new AbortController();
  try{
   const channel=await requestChannel(request,controller.signal);
   if(!controller.signal.aborted){this.ownerCredential=admin;this.authorized=true;this.channel=channel;this.message=action==='status'?'':action==='rotate'?'Novo link gerado.':'Alteração salva.'}
  }catch(error){if(!controller.signal.aborted){this.error=(error as Error).message;if(/Credencial inválida/.test(this.error)){this.ownerCredential='';this.authorized=false}}}
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
   ${this.authorized?html`<p class="call-note call-owner-authorized">Proprietário autorizado nesta visita. Não será necessário digitar novamente a credencial até sair desta tela.</p>`:html`<label>Credencial do proprietário<input name="admin" type="password" autocomplete="off" maxlength="256" required></label>`}
   <p class="call-note">${this.authorized?'As alterações continuam protegidas pela credencial administrativa.':'Informe sua credencial para gerenciar esta sala.'}</p>
   <button type="submit" value="status" ?disabled=${this.busy}>Consultar sala</button>
   ${this.channel?html`
    <label>Nome da sala<input name="name" maxlength="40" .value=${channel?.name??''}></label>
    ${channel?html`<button type="submit" value="rename" ?disabled=${this.busy}>Renomear sala</button>`:nothing}
    <label>${channel?'Nova senha da sala':'Senha da sala'}<input name="password" type="password" autocomplete="new-password" maxlength="128"></label>
    <p class="call-note">Mínimo de 5 caracteres. Use uma senha diferente da credencial do proprietário.
     ${channel?'Salvar a senha encerra as sessões atuais. O link continua válido.':''}</p>
    <button type="submit" value=${channel?'password':'create'} ?disabled=${this.busy}>${channel?(channel.requiresPassword?'Alterar senha':'Definir senha'):'Criar sala permanente'}</button>`:nothing}
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
