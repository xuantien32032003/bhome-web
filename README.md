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

## PostgreSQL that

- Runtime se uu tien PostgreSQL bang schema quan he trong [database/schema.sql](C:\Users\Admin\Documents\New folder\database\schema.sql) khi co `DATABASE_URL`
- Neu database chua co du lieu, server se tu import du lieu tu `data/state.json` vao PostgreSQL o lan khoi dong dau tien
- De tao data test lon cho PostgreSQL:

```powershell
npm run seed:postgres
```

Script seed hien tai tao:
- 30 toa nha
- 1000 phong
- 36 bai viet
- 240 khach hang

## Backup

- Admin co nut `Tai backup` trong dashboard
- Backup hien tai tra ve file JSON day du cua he thong
- Khach hang van co the xuat CSV/Excel tu trang khach hang

## Luu y production

- Production nen dat:
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Neu khong dat `DATABASE_URL`, he thong se fallback sang file JSON local
- Neu khong dat Cloudinary, he thong se fallback sang thu muc `uploads/`
