import {html} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Curriculum} from './content';
import type {Backup,Language} from './model';
import './units';import './assessment';import './errors';
@customElement('learn-advanced')
export class LearnAdvanced extends LightElement {
 @property() language:Language='en';@property() mode='reading';@property({attribute:false}) catalog!:Curriculum;@property({attribute:false}) progress!:Backup;
 render(){return ['reading','grammar'].includes(this.mode)?html`<learn-units .language=${this.language} .mode=${this.mode} .catalog=${this.catalog} .progress=${this.progress}></learn-units>`:this.mode==='test'?html`<learn-assessment .language=${this.language} .catalog=${this.catalog} .progress=${this.progress}></learn-assessment>`:html`<learn-errors .language=${this.language} .targeted=${this.mode==='targeted'} .catalog=${this.catalog} .progress=${this.progress}></learn-errors>`}
}
