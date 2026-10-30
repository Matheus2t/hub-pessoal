import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./frontend/tests",
  timeout: 30000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL || "http://127.0.0.1:8123",
    channel: process.env.PW_CHANNEL || "msedge",
    headless: true,
    colorScheme: "dark",
  },
});
