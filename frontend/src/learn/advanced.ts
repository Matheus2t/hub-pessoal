import {html} from 'lit';
import {customElement,property} from 'lit/decorators.js';
import {LightElement} from '../ui';
import type {Curriculum} from './content';
import type {Backup,Language} from './model';
import './path-page';import './units';import './assessment';import './errors';
import './daily';import './dashboard';import './backup-page';
@customElement('learn-advanced')
export class LearnAdvanced extends LightElement {
 @property() language:Language='en';@property() mode='reading';@property({attribute:false}) catalog!:Curriculum;@property({attribute:false}) progress!:Backup;
 render(){return this.mode==='path'?html`<learn-path .language=${this.language} .catalog=${this.catalog} .progress=${this.progress}></learn-path>`:this.mode==='daily'?html`<learn-daily .language=${this.language} .catalog=${this.catalog} .progress=${this.progress}></learn-daily>`:this.mode==='dashboard'?html`<learn-dashboard .catalog=${this.catalog} .language=${this.language} .progress=${this.progress}></learn-dashboard>`:this.mode==='backup'?html`<learn-backup></learn-backup>`:['reading','grammar'].includes(this.mode)?html`<learn-units .language=${this.language} .mode=${this.mode} .catalog=${this.catalog} .progress=${this.progress}></learn-units>`:this.mode==='test'?html`<learn-assessment .language=${this.language} .catalog=${this.catalog} .progress=${this.progress}></learn-assessment>`:html`<learn-errors .language=${this.language} .targeted=${this.mode==='targeted'} .catalog=${this.catalog} .progress=${this.progress}></learn-errors>`}
}
