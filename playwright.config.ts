import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { baseURL: "http://localhost:3001", channel: "msedge", headless: true },
  reporter: "list",
});
