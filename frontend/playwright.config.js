import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command:
        "rm -f /tmp/badminton-roster-rename-e2e.db && DATABASE_URL=sqlite:////tmp/badminton-roster-rename-e2e.db ../backend/venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8010",
      cwd: "../backend",
      url: "http://127.0.0.1:8010/docs",
      reuseExistingServer: false,
    },
    {
      command: "VITE_API_URL=http://127.0.0.1:8010 npm run dev -- --host 127.0.0.1 --port 4174",
      cwd: ".",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
    },
  ],
});
