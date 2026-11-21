import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { serveBuiltSite } from "./helpers/serve-built-site";

test.skip(!/^(true|1|yes)$/i.test(process.env.MIND_CLOUD_ENABLED ?? "") || !/^(true|1|yes)$/i.test(process.env.MIND_GOOGLE_DRIVE_ENABLED ?? ""), "Requer build com Mente Cloud + Google Drive habilitados");
const supabase = "https://mocktestproj.supabase.co";
const adminId = "11111111-2222-4333-8444-555555555555";
const session = { access_token: "mock-admin-token", refresh_token: "mock-refresh", expires_at: Date.now() + 3_600_000, user_id: adminId };
const baseItem = { id: "22222222-3333-4444-8555-666666666666", owner_id: adminId, kind: "note", title: "Nota", topic: "Estudos", tags: [], description: "", content: "", favorite: false, file_name: null, file_size: null, storage_path: null, video_url: null, storage_provider: null, drive_file_id: null, poster_data_url: null, created_at: "2026-11-20T00:00:00.000Z", updated_at: "2026-11-20T00:00:00.000Z" };
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "PUT, OPTIONS", "Access-Control-Allow-Headers": "content-type, content-range", "Access-Control-Expose-Headers": "Range" };
const supabaseCors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, prefer" };
async function prepareAdmin(page: Page) {
  await page.addInitScript(value => sessionStorage.setItem("2t-mind-supabase-session-v1", JSON.stringify(value)), session);
  await page.route(supabase + "/**", async route => {
    const url = new URL(route.request().url());
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: supabaseCors });
    if (url.pathname === "/auth/v1/user") return route.fulfill({ status: 200, headers: supabaseCors, json: { id: adminId } });
    if (url.pathname === "/rest/v1/rpc/mind_is_admin") return route.fulfill({ status: 200, headers: supabaseCors, json: true });
    if (url.pathname === "/rest/v1/mind_items" && route.request().method() === "GET") return route.fulfill({ status: 200, headers: supabaseCors, json: [] });
    return route.fulfill({ status: 404, headers: supabaseCors, json: {} });
  });
}

test("admin vê cota e exclui arquivo órfão somente após confirmação", async ({ page }) => {
  await serveBuiltSite(page);
  await prepareAdmin(page);
  const orphan = { drive_file_id: "Abcdefghij0123456789", file_name: "sem-vinculo.mp4", size_bytes: 1_048_576, trashed: false };
  let exists = true, deletes = 0;
  await page.route("**/api/mind-drive/status", route => route.fulfill({ status: 200, json: { enabled: true, connected: true, google_email: "admin@example.test", used_bytes: exists ? orphan.size_bytes : 0, reserved_bytes: 0, account_free_bytes: 4_000_000_000, quota_verified: true, orphan_files: exists ? [orphan] : [] } }));
  await page.route("**/api/mind-drive/files/**", async route => { expect(route.request().method()).toBe("DELETE"); deletes++; exists=false; return route.fulfill({ status: 200, json: { deleted: true } }); });
  page.on("dialog", dialog => dialog.accept());
  await page.goto("/#/mente");
  await expect(page.getByRole("region", { name: "Armazenamento de vídeos no Google Drive" })).toContainText("Google Drive conectado");
  await expect(page.locator(".mind-drive-orphans")).toContainText("sem-vinculo.mp4");
  await page.locator(".mind-drive-orphans").getByRole("button", { name: "Excluir" }).click();
  await expect(page.locator(".mind-drive-orphans")).toHaveCount(0);
  expect(deletes).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("envio direto usa blocos alinhados e publica somente após confirmação do servidor", async ({ page }) => {
  await serveBuiltSite(page);
  await prepareAdmin(page);
  const items: Record<string, unknown>[] = [], calls: { method: string; path: string; body?: any }[] = [];
  let uploadId = "";
  const fileId = "XyZ1234567890abcde";
  await page.route("**/api/mind-drive/**", async route => {
    const request=route.request(), path=new URL(request.url()).pathname, body=request.postDataJSON?.() as any;
    calls.push({method:request.method(),path,body});
    if(path.endsWith("/status")) return route.fulfill({status:200,json:{enabled:true,connected:true,used_bytes:0,reserved_bytes:0,quota_verified:true,orphan_files:[]}});
    if(path.endsWith("/uploads")&&request.method()==="POST") { uploadId=body.upload_id; return route.fulfill({status:200,json:{upload_id:uploadId,item_id:body.item_id,session_uri:"https://www.googleapis.com/upload/drive/v3/files/session",chunk_bytes:8*1024*1024}}); }
    if(path.endsWith("/complete")) return route.fulfill({status:200,json:{upload_id:uploadId,drive_file_id:fileId,file_size:8_912_896}});
    if(path.endsWith("/publish")) {
      items.push({...baseItem,id:body.id,kind:"video",title:body.title,topic:body.topic,tags:body.tags,description:body.description,content:body.content,favorite:body.favorite,file_name:"aula.mp4",file_size:8_912_896,storage_path:null,video_url:null,storage_provider:"google-drive",drive_file_id:fileId,created_at:body.created_at,updated_at:body.updated_at});
      return route.fulfill({status:200,json:{published:true,drive_file_id:fileId,web_view_url:"https://drive.google.com/file/d/"+fileId+"/view",previous_storage_path:null,previous_drive_file_id:null}});
    }
    return route.fulfill({status:404,json:{detail:"mock route not found"}});
  });
  await page.route(supabase+"/rest/v1/mind_items**",route=>route.request().method()==="OPTIONS"?route.fulfill({status:204,headers:supabaseCors}):route.fulfill({status:200,headers:supabaseCors,json:items}));
  const ranges:string[]=[];
  await page.route("https://www.googleapis.com/**",async route=>{
    if(route.request().method()==="OPTIONS") return route.fulfill({status:204,headers:cors});
    ranges.push(route.request().headers()["content-range"]??"");
    if(ranges.length===1) return route.fulfill({status:308,headers:{...cors,Range:"bytes=0-8388607"}});
    return route.fulfill({status:201,headers:cors,json:{id:fileId}});
  });
  await page.goto("/#/mente");
  await page.getByRole("button",{name:"Adicionar vídeo"}).click();
  await page.getByRole("radio",{name:/Arquivo MP4/}).check();
  const fixture=readFileSync("frontend/tests/fixtures/mind-h264-aac.mp4"), total=8*1024*1024+512*1024, freeSize=total-fixture.length;
  const freeHeader=Buffer.alloc(8);freeHeader.writeUInt32BE(freeSize,0);freeHeader.write("free",4,"ascii");
  const mp4=Buffer.concat([fixture,freeHeader,Buffer.alloc(freeSize-8)]);
  await page.locator('input[name="video-file"]').setInputFiles({name:"aula.mp4",mimeType:"video/mp4",buffer:mp4});
  await expect(page.locator(".mind-video-file-label")).toContainText("aula.mp4");
  await page.locator(".mind-video-draft-preview video").dispatchEvent("loadeddata");
  await page.getByRole("textbox",{name:"Título"}).fill("Aula no Drive");
  await page.getByRole("button",{name:"Publicar vídeo"}).click();
  await expect(page.getByText("Alterações publicadas na biblioteca 2T.")).toBeVisible();
  expect(ranges).toEqual(["bytes 0-8388607/8912896","bytes 8388608-8912895/8912896"]);
  expect(calls.some(call=>call.path.endsWith("/complete"))).toBe(true);
  expect(calls.some(call=>call.path.endsWith("/publish"))).toBe(true);
  expect(items[0].drive_file_id).toBe(fileId);
  await expect(page.locator(".mind-video-player iframe")).toHaveAttribute("src","https://drive.google.com/file/d/"+fileId+"/preview");
  await page.locator(".mind-backup summary").click();
  const backupPromise=page.waitForEvent("download");
  await page.getByRole("button",{name:"Exportar backup"}).click();
  const backup=await backupPromise, stream=await backup.createReadStream(), chunks:Buffer[]=[];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const manifest=JSON.parse(Buffer.concat(chunks).toString("utf8")) as {version:number;assetsComplete:boolean;records:Array<{driveFileId?:string;storageProvider?:string;fileSize?:number;assetName?:string;videoBase64?:unknown;pdfBase64?:unknown}>};
  const videoRecord=manifest.records.find(record=>record.driveFileId===fileId);
  expect(manifest.version).toBe(3);
  expect(manifest.assetsComplete).toBe(false);
  expect(videoRecord).toMatchObject({storageProvider:"google-drive",fileSize:8_912_896});
  expect(videoRecord).not.toHaveProperty("assetName");
  expect(videoRecord).not.toHaveProperty("videoBase64");
  expect(videoRecord).not.toHaveProperty("pdfBase64");
});