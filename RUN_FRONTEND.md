How to run and verify the frontend locally (Windows PowerShell)

1) Prereqs
  - Node.js v18+ recommended. Check with `node -v`.
  - pnpm recommended; if not installed use Corepack or `npm i -g pnpm`.

2) Install dependencies
  In PowerShell:
  ```powershell
  pnpm install
  ```

  If you don't have pnpm:
  ```powershell
  corepack enable; corepack prepare pnpm@latest --activate
  pnpm install
  ```

3) Start backend demo server
  Use the synthetic local demo database, not any existing database:
  ```powershell
  cd backend
  $env:DATABASE_URL='file:./justicelink-demo.db'
  $env:HOST='127.0.0.1'
  $env:PORT='4000'
  $env:JUSTICELINK_DEMO_MODE='true'
  npx prisma migrate deploy
  npm run seed
  npm run dev
  ```

4) Start frontend dev server
  ```powershell
  pnpm dev
  ```

5) If you encounter errors, capture logs to a file and share them:
  ```powershell
  pnpm dev 2>&1 | Tee-Object -FilePath dev.log
  ```

6) Open the app in your browser at the address printed by Vite (default in this repo: http://127.0.0.1:8080)

7) Common fixes
  - If frontend port is in use: edit `vite.config.ts` or pass another Vite port.
  - If backend port is in use: `$env:PORT=4001; npm run dev` and update the Vite proxy target.
  - If TypeScript errors block hot-reload: run `pnpm run build` to see full compile errors.
