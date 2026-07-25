# Frontend CI/CD - VeloCart Expo

Frontend nay la Expo Router app va duoc export thanh static web app de deploy len Vercel.

## API backend

Mac dinh production frontend goi backend:

```env
EXPO_PUBLIC_API_BASE_URL=https://backend-5nxv.vercel.app
```

Neu muon doi backend URL, tao GitHub Actions variable hoac Vercel env:

- `EXPO_PUBLIC_API_BASE_URL`

Local dev:

```bash
cp .env.example .env.local
npm run web
```

Neu chay tren Android emulator, app se fallback ve `http://10.0.2.2:3000`.
Neu chay web/iOS simulator tren cung may, app se fallback ve `http://localhost:3000`.
Neu chay tren dien thoai that, dat `.env.local` thanh IP LAN cua may dang chay backend, vi du:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:3000
```

## Scripts

```bash
npm run typecheck
npm run build:web
```

`npm run build:web` xuat static site vao thu muc `dist/`.

## GitHub Actions

Workflow: `.github/workflows/expo-build.yml`

Khi push len `main`, workflow se:

1. Cai dependencies bang `npm ci`
2. Chay `npm run typecheck`
3. Chay `npm run build:web`
4. Deploy len Vercel bang prebuilt output

## GitHub secrets can thiet de deploy Vercel

Them cac secret nay vao repo `frontend` tren GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Co the lay `VERCEL_ORG_ID` va `VERCEL_PROJECT_ID` sau khi link project:

```bash
npx vercel link
```

Vercel se tao file `.vercel/project.json` local. Khong commit thu muc `.vercel`.

## Vercel project settings

Neu dung Vercel Git integration, dat:

| Setting | Value |
| --- | --- |
| Framework Preset | Other |
| Build Command | `npm run build:web` |
| Output Directory | `dist` |
| Install Command | `npm ci` |

## Backend CORS

Sau khi frontend co domain Vercel, them domain do vao env backend:

```env
FRONTEND_URL=https://your-frontend.vercel.app
EXTRA_CORS_ORIGINS=https://your-frontend.vercel.app
```

Sau do redeploy backend.
