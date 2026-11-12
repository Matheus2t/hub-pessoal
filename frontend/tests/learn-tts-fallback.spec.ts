import {test,expect} from '@playwright/test';

for(const lang of ['en','ru'] as const){
  test(`Ouvir no Listening ${lang} não fica desativado com lista vazia de vozes`,async({page})=>{
    await page.addInitScript(()=>{
      class Utterance {
        text:string;lang='';voice:unknown=null;rate=1;volume=1;
        onend:(()=>void)|null=null;onerror:(()=>void)|null=null;
        constructor(t:string){this.text=t;}
      }
      const api={
        getVoices:()=>[],addEventListener:()=>{},removeEventListener:()=>{},
        cancel:()=>{},pause:()=>{},resume:()=>{},
        speak:(u:Utterance)=>{(window as any).__spoken={text:u.text,lang:u.lang,voice:u.voice};setTimeout(()=>u.onend?.(),25);}
      };
      Object.defineProperty(window,'SpeechSynthesisUtterance',{configurable:true,value:Utterance});
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:api});
    });
    await page.goto(`/#/learn/${lang}/listening`);
    await page.getByRole('button',{name:'Iniciar prática'}).click();
    const player=page.locator('learn-session learn-audio');
    const listen=player.getByRole('button',{name:'Ouvir / repetir'});
    await expect(listen).toBeEnabled();
    await listen.click();
    await expect.poll(()=>page.evaluate(()=>(window as any).__spoken?.lang)).toBe(lang==='en'?'en-US':'ru-RU');
    await expect.poll(()=>page.locator('learn-session').evaluate((e:any)=>({heard:e.heard,validated:e.heardValidated})))
      .toEqual({heard:true,validated:false});
    await expect(player.locator('.learn-audio__status')).toContainText('não identificou uma voz',{timeout:5000});
  });
}
test('Sem API de síntese, Ouvir permanece indisponível com explicação',async({page})=>{
  await page.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{configurable:true,value:undefined}));
  await page.goto('/#/learn/en/listening');
  await page.getByRole('button',{name:'Iniciar prática'}).click();
  const audio=page.locator('learn-session learn-audio');
  await expect(audio.getByRole('button',{name:'Ouvir / repetir'})).toBeDisabled();
  await expect(audio.locator('.learn-audio__status')).toContainText('indisponível neste navegador');
});
