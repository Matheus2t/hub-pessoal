import {test,expect} from '@playwright/test';
for(const width of [1920,1366,768,390,320])test(`Learn routes and themes ${width}`,async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const loads:string[]=[];page.on('request',r=>{if(/\/learn(?:\.js|\/)/.test(r.url()))loads.push(r.url())});
 await page.setViewportSize({width,height:1000});await page.goto('/#/');expect(loads).toEqual([]);
 const card=page.locator('home-page a[href="#/learn"]');await expect(card).toBeVisible();await card.focus();await page.keyboard.press('Enter');
 await expect(page.getByRole('heading',{name:'Idiomas',exact:true})).toBeVisible();await expect(page.locator('.learn-languages a')).toHaveCount(2);
 await expect(page.locator('.learn-language-detail').first()).toHaveText('Sem histórico de estudo');expect(loads.filter(u=>/\/learn\//.test(u))).toHaveLength(0);
 for(const route of ['','en','ru']){
  await page.goto('/#/learn'+(route?'/'+route:''));await expect(page.locator('.learn-heading')).toBeVisible();await expect(page.locator('.learn-page [role="status"]')).toHaveCount(0);
  if(route){await expect(page.locator('learn-area-card')).toHaveCount(3);await expect(page.locator('learn-area-card a, learn-area-card button')).toHaveCount(0);await expect(page.locator('.learn-area-link')).toHaveCount(5);await expect(page.locator('.learn-progress')).toContainText('Sem respostas');await expect(page).toHaveTitle(new RegExp(route==='en'?'Inglês':'Russo'));}
  for(const theme of ['dark','light']){await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath(`${route||'select'}-${theme}.png`),fullPage:true,animations:'disabled'});}
  await page.reload();await expect(page.locator('.learn-heading h1')).toHaveText(route==='en'?'Inglês':route==='ru'?'Russo':'Idiomas');
 }
 expect(errors).toEqual([]);
});
test('history, breadcrumbs, isolated persisted progress and no destructive writes',async({page})=>{
 const content:string[]=[];page.on('request',r=>{if(r.url().endsWith('.json'))content.push(r.url())});
 await page.goto('/#/learn/en');await expect(page.locator('.learn-progress')).toBeVisible();expect(content.some(u=>u.endsWith('/ru.json'))).toBe(false);
 await page.evaluate(async()=>{await new Promise<void>((resolve,reject)=>{const r=indexedDB.open('2t-learn',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('attempts','readwrite');tx.objectStore('attempts').put({id:'real-saved-fixture',language:'en',itemId:'word-1',skill:'vocabulary',topic:'Teste de persistência',answer:'answer',expected:'answer',correct:true,at:Date.now(),seconds:42});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}})});
 await page.reload();await expect(page.locator('.learn-progress')).toContainText('100%');await expect(page.locator('.learn-progress')).toContainText('42 s');
 await page.getByRole('link',{name:'Trocar idioma'}).click();await expect(page.locator('.learn-language-detail').first()).toContainText('1 palavras estudadas');await page.locator('.learn-language[href="#/learn/ru"]').click();await expect(page.locator('.learn-progress')).toContainText('Sem respostas');await expect(page.locator('.learn-progress')).toContainText('0 min 0 s');
 const crumbs=page.getByRole('navigation',{name:'Caminho da página'});await expect(crumbs.getByRole('link',{name:'2T Learn'})).toBeVisible();await page.goBack();await expect(page.locator('.learn-languages')).toBeVisible();await page.goForward();await expect(page.locator('.learn-heading h1')).toHaveText('Russo');
 await page.goto('/#/learn/en');await expect(page.locator('.learn-progress')).toContainText('42 s');
 const count=await page.evaluate(async()=>await new Promise<number>(resolve=>{const r=indexedDB.open('2t-learn');r.onsuccess=()=>{const db=r.result,tx=db.transaction('attempts');const c=tx.objectStore('attempts').count();c.onsuccess=()=>resolve(c.result);tx.oncomplete=()=>db.close()}}));expect(count).toBe(1);
});
test('invalid routes do not open the database or fetch curricula',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw Error('MUST NOT OPEN')}})});
 for(const path of ['xx','en/unknown','ru/']){await page.goto('/#/learn/'+path);await expect(page.getByRole('heading',{name:'Página do Learn não encontrada'})).toBeVisible();await expect(page.getByRole('link',{name:'Selecionar idioma'})).toHaveAttribute('href','#/learn');}
});
test('storage failure, recovery and catalogue failure stay independent',async({page})=>{
 await page.addInitScript(()=>{const original=indexedDB.open.bind(indexedDB);indexedDB.open=((...args:Parameters<IDBFactory['open']>)=>{if(sessionStorage.getItem('learn-denied')!=='no')throw Error('private technical error');return original(...args)}) as IDBFactory['open']});
 await page.goto('/#/learn/en');await expect(page.locator('.learn-message')).toContainText('Progresso local indisponível');await expect(page.locator('learn-page')).not.toContainText('private technical error');await expect(page.locator('learn-area-card')).toHaveCount(3);
 await page.evaluate(()=>sessionStorage.setItem('learn-denied','no'));await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await expect(page.locator('.learn-progress')).toBeVisible();
 await page.route('**/learn/ru.json',r=>r.fulfill({status:503,body:'Unavailable'}));await page.goto('/#/learn/ru');await expect(page.locator('.learn-message')).toContainText('Não foi possível carregar o catálogo');await expect(page.locator('.learn-progress')).toBeVisible();
 await page.unroute('**/learn/ru.json');await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await expect(page.locator('.learn-area-link')).toHaveCount(5);
});

test('language links support keyboard navigation and visible focus',async({page})=>{
 await page.goto('/#/learn');const link=page.locator('.learn-language[href="#/learn/en"]');await link.focus();await expect(link).toBeFocused();expect(await link.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');await page.keyboard.press('Enter');await expect(page.locator('.learn-heading h1')).toHaveText('Inglês');const back=page.getByRole('link',{name:'Trocar idioma'});await back.focus();await page.keyboard.press('Enter');await expect(page.locator('.learn-languages')).toBeVisible();
});
