# Nova Habitat Platform

Web gioi thieu cong ty, tim phong va khu quan tri admin chay bang Node.js + Express.
Ho tro 2 che do:

- Local/dev: luu bang `data/state.json` va `uploads/`
- Production: luu bang `PostgreSQL` va anh tren `Cloudinary` khi co bien moi truong

## Chay local

1. Cai Node.js LTS
2. Cai dependencies:

```powershell
npm install
```

3. Chay server:

```powershell
npm start
```

4. Mo trinh duyet:

```text
http://localhost:3000
```

## Tai khoan admin mac dinh

- Email: `admin@nova.vn`
- Mat khau: `123456`

## Deploy len Render

- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `npm start`
- Them Environment Variables tu `.env.example`

Sau khi deploy, mo:

- Trang public: `/`
- Admin login: `/admin-login.html`

## Luu y production

- Production nen dat:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Neu khong dat `DATABASE_URL`, he thong se fallback sang file JSON local
- Neu khong dat Cloudinary, he thong se fallback sang thu muc `uploads/`
