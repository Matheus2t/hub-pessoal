import {html} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import {LightElement} from '../ui';
export const studyAreas=[
  ['Vocabulário','Palavras e expressões por tema.'],['Flashcards','Memorização e revisões espaçadas.'],
  ['Listening','Compreensão de palavras e diálogos.'],['Ditado','Escuta e escrita de frases.'],
  ['Escrita','Frases, traduções e ordem das palavras.'],['Leitura','Textos e compreensão por nível.'],
  ['Gramática','Explicações e prática por assunto.'],['Avaliações','Verificação do conteúdo estudado.'],
] as const;
@customElement('learn-area-card')
export class LearnAreaCard extends LightElement {
  @property() heading='';@property() description='';
  render(){return html`<article class="learn-area"><div><h3>${this.heading}</h3><p>${this.description}</p></div><span class="learn-status">Conteúdo em preparação</span></article>`}
}
