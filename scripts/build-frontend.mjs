import {build} from 'esbuild';

const publicBuild=process.env.VERCEL==='1'||process.env.LEARN_PUBLIC_BUILD==='1';
const omitLocalPreviewContent=publicBuild?{
 name:'omit-local-preview-content',
 setup(context){
  context.onResolve({filter:/^\.\/(?:progression-v17-page|reading-b1-v16)$/},args=>
   args.importer.replaceAll('\\','/').endsWith('/frontend/src/learn/page.ts')
    ?{path:args.path,namespace:'learn-public-preview-disabled'}
    :undefined);
  context.onLoad({filter:/.*/,namespace:'learn-public-preview-disabled'},()=>({contents:'',loader:'js'}));
 },
}:undefined;

await Promise.all([
 build({entryPoints:['frontend/src/main.ts'],bundle:true,minify:true,outfile:'dist/bundle.js'}),
 build({entryPoints:['frontend/src/learn/page.ts'],bundle:true,format:'esm',minify:true,outfile:'dist/learn.js',define:{__2T_PUBLIC_BUILD__:JSON.stringify(publicBuild)},plugins:omitLocalPreviewContent?[omitLocalPreviewContent]:[]}),
 build({entryPoints:['frontend/src/components/distributions-page.ts'],bundle:true,format:'esm',minify:true,outfile:'dist/distributions.js'}),
]);
