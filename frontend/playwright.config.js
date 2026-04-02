import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command:
        "rm -f /tmp/badminton-roster-rename-e2e.db && DATABASE_URL=sqlite:////tmp/badminton-roster-rename-e2e.db ../backend/venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port 8000",
      cwd: "../backend",
      url: "http://127.0.0.1:8000/docs",
      reuseExistingServer: true,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 4173",
      cwd: ".",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
    },
  ],
});
