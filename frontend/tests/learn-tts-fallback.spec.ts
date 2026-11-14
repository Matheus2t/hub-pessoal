import {test,expect} from '@playwright/test';
import {serveBuiltSite} from './helpers/serve-built-site';

for(const lang of ['en','ru'] as const){
  test(`Listening ${lang} reproduces the hosted clip without SpeechSynthesis`,async({page})=>{
    await serveBuiltSite(page);
    await page.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{configurable:true,value:undefined}));
    await page.goto(`/#/learn/${lang}/listening`);
    await page.getByRole('button',{name:'Iniciar prática'}).click();
    const session=page.locator('learn-session'),player=session.locator('learn-recording-player'),media=player.locator('audio');
    await expect(player).toBeVisible();await expect(session.locator('learn-audio')).toHaveCount(0);
    await player.getByRole('button',{name:'Reproduzir gravação'}).click();
    await expect.poll(()=>media.evaluate((audio:HTMLAudioElement)=>audio.currentTime)).toBeGreaterThan(0);
    await expect.poll(()=>session.evaluate((element:any)=>element.heard)).toBe(true);
    await expect.poll(()=>session.evaluate((element:any)=>element.heardValidated)).toBe(false);
  });
}
