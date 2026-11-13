import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedPreviewClient,allowedPreviewHost,safeLocalAudioPath} from './local-study-preview.mjs';

test('V14 preview server is bound to its exact loopback Host and client',()=>{
 assert.equal(allowedPreviewHost('127.0.0.1:18789',18789),true);
 assert.equal(allowedPreviewHost('localhost:18789',18789),false);
 assert.equal(allowedPreviewHost('matheus2t.com.br',18789),false);
 assert.equal(allowedPreviewClient('127.0.0.1'),true);
 assert.equal(allowedPreviewClient('::ffff:127.0.0.1'),true);
 assert.equal(allowedPreviewClient('192.0.2.4'),false);
});

test('V14 audio paths accept only safe filenames under the private audio directory',()=>{
 assert.match(safeLocalAudioPath('audio/en-dict-v14-01.mp3'),/private[\\/]learn-audio-v19[\\/]audio[\\/]en-dict-v14-01\.mp3$/);
 assert.equal(safeLocalAudioPath('../frontend/public/secret.mp3'),null);
 assert.equal(safeLocalAudioPath('audio/../../secret.mp3'),null);
 assert.equal(safeLocalAudioPath('audio/en-dict-v14-01.wav'),null);
});
