import { spawnSync } from "node:child_process";
import { context } from "esbuild";
import { frontendBuildDefines } from "./frontend-build-defines.mjs";
import { loadLocalMindFrontendEnv } from "./dev-mind-env.mjs";

if (loadLocalMindFrontendEnv()) {
  console.log("Mente local habilitada para loopback; somente a chave Supabase anon vai para o frontend.");
}

const npmCli = process.env.npm_execpath;
const build = npmCli
  ? spawnSync(process.execPath, [npmCli, "run", "build"], { stdio: "inherit", env: process.env })
  : spawnSync("npm", ["run", "build"], { stdio: "inherit", env: process.env, shell: process.platform === "win32" });

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const server = await context({
  entryPoints: ["frontend/src/main.ts"],
  bundle: true,
  sourcemap: true,
  outfile: "dist/bundle.js",
  define: frontendBuildDefines({ devServer: true }),
});
await server.watch();
const address = await server.serve({
  host: "localhost",
  port: Number(process.env.PORT || 3000),
  servedir: "dist",
});
console.log(`Frontend local disponível em http://localhost:${address.port}`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await server.dispose();
    process.exit(0);
  });
}
