import {test,expect} from '@playwright/test';
async function mount(page:import('@playwright/test').Page,area='test-layout'){
 await page.goto('/#/');await page.reload();await page.evaluate(async area=>{
  await customElements.whenDefined('panel-workspace');
  if(!customElements.get('persistent-panel-probe'))customElements.define('persistent-panel-probe',class extends HTMLElement{connectedCallback(){(window as any).panelConnections=((window as any).panelConnections||0)+1}});
  const w=document.createElement('panel-workspace') as any;w.area=area;w.className='workspace-v2';w.dataset.test='true';
  w.panels=[{id:'form',title:'Formulário',required:true,size:'small',resizable:false},{id:'chart',title:'Gráfico',essential:true,size:'medium'},{id:'table',title:'Tabela',size:'large'}];
  w.innerHTML='<section slot="form" class="workspace-panel"><input aria-label="Valor preservado" value="123"></section><section slot="chart" class="workspace-panel"><persistent-panel-probe>Gráfico</persistent-panel-probe></section><section slot="table" class="workspace-panel">Tabela</section>';
  document.querySelector('main')!.append(w);
 },area);return page.locator('panel-workspace[data-test]');
}
test('modes, keyboard order, sizes, persistence and restore keep live slotted state',async({page})=>{
 let w=await mount(page);await w.getByRole('button',{name:'Essencial',exact:true}).click();await expect(w.locator('[data-panel=table]')).toBeHidden();
 await w.getByRole('button',{name:'Completo',exact:true}).click();await expect(w.locator('[data-panel=table]')).toBeVisible();
 await w.getByRole('button',{name:'Personalizar painel',exact:true}).click();await expect(w.getByRole('checkbox',{name:'Formulário',exact:true})).toBeDisabled();
 const move=w.getByRole('button',{name:'Mover Tabela para cima'});await move.focus();await page.keyboard.press('Enter');
 expect(await w.locator('.ws-cell').evaluateAll(es=>es.map(e=>e.getAttribute('data-panel')))).toEqual(['form','table','chart']);
 await w.getByRole('combobox',{name:'Tamanho de Gráfico'}).selectOption('large');await w.getByRole('checkbox',{name:'Tabela',exact:true}).uncheck();
 await page.keyboard.press('Escape');await expect(w.getByRole('dialog')).not.toBeVisible();
 await expect(w.locator('[data-panel=chart]')).toHaveAttribute('style',/span 12/);
 await expect(page.getByLabel('Valor preservado')).toHaveValue('123');expect(await page.evaluate(()=>(window as any).panelConnections)).toBe(1);
 w=await mount(page);await expect(w.locator('[data-panel=table]')).toBeHidden();await w.getByRole('button',{name:'Personalizar painel',exact:true}).click();
 await w.getByRole('button',{name:'Restaurar layout padrão',exact:true}).click();await w.getByRole('button',{name:'Concluir',exact:true}).click();await expect(w.locator('[data-panel=table]')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('2t:panels:v1:test-layout')!).mode)).toBe('complete');
});
test('corrupt or unwritable storage does not block tools; navigation closes the modal',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('2t:panels:v1:test-layout','{broken'));
 const w=await mount(page);await expect(w.getByRole('status')).toContainText('layout padrão');
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new DOMException('Quota exceeded','QuotaExceededError')}});
 await w.getByRole('button',{name:'Essencial',exact:true}).click();await expect(w.getByRole('status')).toContainText('Não foi possível salvar');await expect(w.locator('[data-panel=table]')).toBeHidden();
 await w.getByRole('button',{name:'Personalizar painel',exact:true}).click();await page.evaluate(()=>location.hash='#/calculadoras');await expect(w.getByRole('dialog')).not.toBeVisible();
});
