import {existsSync,readFileSync} from 'node:fs';
import {extname,resolve,sep} from 'node:path';
import type {Page} from '@playwright/test';

/** Serves dist through Playwright routes so browser tests need no local listening socket. */
export async function serveBuiltSite(page:Page,fixtureResponse?:{status:number;contentType:string;body:string|Buffer}){
  const root=resolve('dist'),origin=process.env.BASE_URL||'http://127.0.0.1:8123',types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.png':'image/png'};
  await page.route(`${origin}/**`,async route=>{
    const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
    if(pathname==='/learn/audio/fixture-tone.wav'&&fixtureResponse)return route.fulfill(fixtureResponse);
    const file=resolve(root,pathname==='/'?'index.html':pathname.slice(1));
    if(!file.toLowerCase().startsWith(`${root.toLowerCase()}${sep}`)||!existsSync(file))return route.fulfill({status:404,body:'Not found'});
    return route.fulfill({status:200,contentType:types[extname(file)]||'application/octet-stream',body:readFileSync(file)});
  });
}
