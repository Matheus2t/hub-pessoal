import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedPreviewClient,allowedPreviewHost,safeLocalAudioPath,previewManifest} from './local-study-preview.mjs';

test('V19 private preview is limited to its exact loopback Host and remote address',()=>{
 assert.equal(allowedPreviewHost('127.0.0.1:18789',18789),true);
 assert.equal(allowedPreviewHost('localhost:18789',18789),false);
 assert.equal(allowedPreviewHost('127.0.0.1:18790',18789),false);
 assert.equal(allowedPreviewHost('evil.example:18789',18789),false);
 assert.equal(allowedPreviewClient('127.0.0.1'),true);
 assert.equal(allowedPreviewClient('::ffff:127.0.0.1'),true);
 assert.equal(allowedPreviewClient('192.168.1.4'),false);
});
test('V19 file lookup forbids traversal, absolute paths, models, unknown formats',()=>{
 for(const value of ['../../secret.mp3','audio/../secret.mp3','audio/..\\secret.mp3',
  '/private/audio/sample.mp3','models/model.onnx','audio/foo.wav','audio/foo.mp3/../bad.mp3',
  'audio/%2e%2e.mp3','audio/a b.mp3','audio/.env.mp3',undefined]){
  assert.equal(safeLocalAudioPath(value),null,String(value));
 }
 assert.match(safeLocalAudioPath('audio/en-listen-v13-01-v1.mp3'),/audio[/\\]en-listen-v13-01-v1\.mp3$/);
});
test('V19 refuses missing, public, assessable or incomplete private inventories',()=>{
 for(const value of [{schemaVersion:1,publicRelease:false,assessmentEnabled:false,records:[]},
  {schemaVersion:1,publicRelease:true,assessmentEnabled:false,records:new Array(68).fill({})},
  {schemaVersion:1,publicRelease:false,assessmentEnabled:true,records:new Array(68).fill({})}]){
  assert.throws(()=>previewManifest(value,{}));
 }
});
