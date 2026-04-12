const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const USE_POSTGRES = Boolean(process.env.DATABASE_URL);
const USE_CLOUDINARY =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

const pool = USE_POSTGRES
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    })
  : null;

const FALLBACK_BUILDING_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%230d5c63'/><stop offset='1' stop-color='%23d7a86e'/></linearGradient></defs><rect width='1200' height='800' fill='%23ede2d3'/><rect x='120' y='180' width='360' height='460' rx='24' fill='url(%23g)' opacity='0.95'/><rect x='520' y='120' width='250' height='520' rx='24' fill='%232f241d' opacity='0.92'/><rect x='810' y='220' width='250' height='420' rx='24' fill='%230d5c63' opacity='0.88'/><rect y='650' width='1200' height='150' fill='%23f4efe7'/></svg>";
const FALLBACK_ROOM_IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%23f8f3ea'/><stop offset='1' stop-color='%23d8b38a'/></linearGradient></defs><rect width='1200' height='800' fill='url(%23g)'/><rect x='120' y='120' width='960' height='520' rx='36' fill='%23fffaf2'/><rect x='180' y='200' width='310' height='270' rx='24' fill='%23d7a86e'/><rect x='540' y='220' width='420' height='170' rx='24' fill='%230d5c63'/><rect x='540' y='430' width='250' height='120' rx='20' fill='%232f241d'/><rect x='820' y='430' width='140' height='120' rx='20' fill='%23715d4e'/></svg>";

function makeBuilding(id, name, region, address, floors, occupancy, averageRent, investmentHighlight, description) {
  return {
    id,
    name,
    region,
    address,
    image: FALLBACK_BUILDING_IMAGE,
    gallery: [FALLBACK_BUILDING_IMAGE, FALLBACK_BUILDING_IMAGE, FALLBACK_BUILDING_IMAGE],
    floors,
    occupancy,
    averageRent,
    investmentHighlight,
    description,
  };
}

const defaultState = {
  content: {
    brandEyebrow: "Nền tảng đầu tư căn hộ",
    navAbout: "Giới Thiệu",
    navRooms: "Tìm Phòng",
    navAdmin: "Admin",
    heroKicker: "Vận hành căn hộ cho thuê",
    heroPrimaryButton: "Tìm phòng ngay",
    heroSecondaryButton: "Xem tòa nhà đang vận hành",
    companySectionKicker: "Giới thiệu về công ty",
    companySectionTitle: "Doanh nghiệp vận hành căn hộ cho thuê hướng đến nhà đầu tư",
    portfolioSectionKicker: "Những gì công ty đang vận hành",
    portfolioSectionTitle: "Danh mục và quy mô hiện tại",
    resultsSectionKicker: "Kết quả đạt được",
    resultsSectionTitle: "Chỉ số hiệu quả và thành tựu vận hành",
    buildingsSectionKicker: "Tòa nhà đang vận hành",
    buildingsSectionTitle: "Chọn tòa nhà để xem chi tiết ở trang riêng",
    detailPageKicker: "Chi tiết tòa nhà",
    detailRoomsButton: "Mở trang tìm phòng",
    detailRoomsSectionKicker: "Phòng thuộc tòa nhà",
    detailRoomsSectionTitle: "Danh mục phòng liên quan",
    roomsPageKicker: "Tìm phòng",
    roomsPageTitle: "Chọn phòng theo tòa nhà và khu vực",
    roomsPageDescription: "Danh mục được cập nhật từ hệ thống quản trị, hiển thị trạng thái trống phòng và ngày trống.",
    contactToggle: "Liên hệ",
    contactTitle: "Thông tin liên hệ",
    contactPhoneLabel: "SĐT",
    contactZaloLabel: "Zalo",
    contactFacebookLabel: "Facebook",
    adminLoginTitle: "Đăng nhập admin",
    adminLoginDescription: "Đăng nhập để vào trang quản trị hệ thống.",
    adminLoginButton: "Đăng nhập",
  },
  company: {
    name: "Bhome",
    logo: "",
    headline: "Nền tảng giới thiệu danh mục tài sản đến các nhà đầu tư.",
    description: "Bhome vận hành danh mục căn hộ cho thuê tại nhiều khu vực trung tâm, tối ưu lấp đầy, doanh thu và trải nghiệm khách thuê.",
    story: "Bhome chuyên vận hành và khai thác căn hộ cho thuê, xây dựng hệ thống vận hành minh bạch để giới thiệu đến nhà đầu tư và đối tác.",
    heroImage: FALLBACK_BUILDING_IMAGE,
    industry: "Thuê và cho thuê căn hộ",
    address: "Nha Trang, Khánh Hòa",
    email: "info@bhome.vn",
    phone: "0900123456",
    zalo: "https://zalo.me/0900123456",
    facebook: "https://facebook.com/bhome",
  },
  investorStats: [
    { label: "Tổng căn hộ quản lý", value: "186", note: "Danh mục đang vận hành ở nhiều khu vực" },
    { label: "Tỷ lệ lấp đầy trung bình", value: "91%", note: "Duy trì ổn định trên danh mục hiện hữu" },
    { label: "Doanh thu dự kiến năm", value: "48 tỷ VND", note: "Danh mục có dòng tiền từ vận hành cho thuê" },
    { label: "Nhà đầu tư mục tiêu", value: "Core-plus", note: "Tập trung tài sản có khả năng mở rộng" },
  ],
  results: [
    { title: "Hệ thống vận hành minh bạch", description: "Báo cáo vận hành, số lượng phòng, công suất và hiện trạng danh mục được cập nhật liên tục." },
    { title: "Tốc độ lấp đầy ổn định", description: "Phòng trống được đưa vào kênh tìm kiếm và tiếp cận khách thuê nhanh hơn." },
    { title: "Danh mục phân bổ theo khu vực", description: "Tài sản phân bổ tại nhiều khu vực có nhu cầu cao." },
  ],
  admin: {
    email: "admin@nova.vn",
    password: "123456",
  },
  admins: [
    {
      id: "admin-root",
      name: "Admin chính",
      email: "admin@nova.vn",
      password: "123456",
    },
  ],
  buildings: [
    makeBuilding("b1", "Riverfront Residence", "Thủ Đức", "12 Nguyễn Văn Bá, Thủ Đức", 12, 94, "14 - 22 triệu VND", "Gần khu công nghệ cao và tuyến metro", "Tài sản hướng sông, tệp khách chuyên gia dài hạn, công suất lấp đầy ổn định quanh năm."),
    makeBuilding("b2", "Central Square Apartments", "Quận 7", "88 Nguyễn Thị Thập, Quận 7", 16, 89, "16 - 27 triệu VND", "Tập trung nguồn cầu từ khách doanh nghiệp", "Tòa nhà có hệ thống dịch vụ vận hành và chuỗi căn hộ studio đến 2PN."),
    makeBuilding("b3", "Lotus Business Stay", "Bình Thạnh", "135 Điện Biên Phủ, Bình Thạnh", 10, 92, "12 - 19 triệu VND", "Tỷ lệ quay vòng thấp, khách thuê bền vững", "Danh mục căn hộ phục vụ khách làm việc gần trung tâm thành phố."),
  ],
  rooms: [
    { id: "r1", buildingId: "b1", name: "A1205", region: "Thủ Đức", image: FALLBACK_ROOM_IMAGE, type: "1PN Deluxe", rent: "18 triệu VND", status: "available", availableFrom: "2026-04-12", area: "48 m2", amenities: "Nội thất đầy đủ, máy giặt riêng, ban công hướng sông" },
    { id: "r2", buildingId: "b1", name: "A0902", region: "Thủ Đức", image: FALLBACK_ROOM_IMAGE, type: "Studio Premium", rent: "14.5 triệu VND", status: "occupied", availableFrom: "2026-08-01", area: "34 m2", amenities: "Lễ tân 24/7, gym, khu tiếp khách" },
    { id: "r3", buildingId: "b2", name: "B1508", region: "Quận 7", image: FALLBACK_ROOM_IMAGE, type: "2PN Executive", rent: "26 triệu VND", status: "upcoming", availableFrom: "2026-05-04", area: "72 m2", amenities: "Hồ bơi, parking, nội thất đồng bộ" },
    { id: "r4", buildingId: "b2", name: "B1103", region: "Quận 7", image: FALLBACK_ROOM_IMAGE, type: "1PN Signature", rent: "17 triệu VND", status: "available", availableFrom: "2026-04-18", area: "45 m2", amenities: "Thẻ từ, bảo trì nhanh, tầng trung" },
    { id: "r5", buildingId: "b3", name: "L0801", region: "Bình Thạnh", image: FALLBACK_ROOM_IMAGE, type: "Studio Flex", rent: "13 triệu VND", status: "occupied", availableFrom: "2026-09-15", area: "32 m2", amenities: "Gần trung tâm, dọn dẹp hàng tuần, wifi tốc độ cao" },
  ],
};

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(STATE_FILE)) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(defaultState, null, 2));
}

if (USE_CLOUDINARY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

app.use((req, res, next) => {
  if (/\.(html?)$/i.test(req.path) || req.path === "/") {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  }
  next();
});

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "bhome-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" },
  })
);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2, 8)}${ext}`);
    },
  }),
});

app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(ROOT));

function normalizeState(state) {
  const nextState = Object.assign({}, state);
  nextState.content = Object.assign({
    announcementEnabled: "true",
    announcementText: "Chào mừng bạn đến với Bhome. Danh mục căn hộ đang được cập nhật liên tục.",
  }, nextState.content || {});
  const legacyAdmin = nextState.admin || defaultState.admin;
  nextState.admins = Array.isArray(nextState.admins) && nextState.admins.length
    ? nextState.admins
    : [{
        id: "admin-root",
        name: "Admin chính",
        email: legacyAdmin.email,
        password: legacyAdmin.password,
      }];
  nextState.admin = {
    email: nextState.admins[0].email,
    password: nextState.admins[0].password,
  };
  return nextState;
}

function readState() {
  return normalizeState(JSON.parse(fs.readFileSync(STATE_FILE, "utf8")));
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(normalizeState(state), null, 2));
}

async function initPersistence() {
  if (!USE_POSTGRES) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY,
      state JSONB NOT NULL
    )
  `);
  const existing = await pool.query("SELECT id FROM app_state WHERE id = 1");
  if (!existing.rowCount) {
    await pool.query("INSERT INTO app_state (id, state) VALUES (1, $1::jsonb)", [JSON.stringify(defaultState)]);
  }
}

async function readStateAny() {
  if (!USE_POSTGRES) return readState();
  const result = await pool.query("SELECT state FROM app_state WHERE id = 1");
  return normalizeState(result.rows[0] ? result.rows[0].state : defaultState);
}

async function writeStateAny(state) {
  const normalized = normalizeState(state);
  if (!USE_POSTGRES) {
    writeState(normalized);
    return;
  }
  await pool.query(
    "INSERT INTO app_state (id, state) VALUES (1, $1::jsonb) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state",
    [JSON.stringify(normalized)]
  );
}

function requireAuth(req, res, next) {
  if (!req.session.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/api/state", async (_req, res, next) => {
  try {
    res.json(await readStateAny());
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/session", (req, res) => {
  res.json({ authenticated: Boolean(req.session.isAdmin) });
});

app.post("/api/admin/login", async (req, res, next) => {
  try {
    const state = await readStateAny();
    const { email, password } = req.body;
    const admin = state.admins.find((item) => item.email === email && item.password === password);
    if (admin) {
      req.session.isAdmin = true;
      req.session.adminEmail = admin.email;
      res.json({ ok: true });
      return;
    }
    res.status(401).json({ ok: false, error: "Sai email hoặc mật khẩu." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.put("/api/state", requireAuth, async (req, res, next) => {
  try {
    await writeStateAny(req.body);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/upload", requireAuth, upload.array("files", 10), async (req, res, next) => {
  try {
    let files = [];
    if (USE_CLOUDINARY) {
      for (const file of req.files || []) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: process.env.CLOUDINARY_FOLDER || "bhome",
          resource_type: "image",
        });
        files.push(uploaded.secure_url);
        fs.unlink(file.path, () => {});
      }
    } else {
      files = (req.files || []).map((file) => `/uploads/${file.filename}`);
    }
    res.json({ files });
  } catch (error) {
    next(error);
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Internal Server Error" });
});

initPersistence()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log(`Persistence: ${USE_POSTGRES ? "PostgreSQL" : "Local JSON file"}`);
      console.log(`Image storage: ${USE_CLOUDINARY ? "Cloudinary" : "Local uploads folder"}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize persistence", error);
    process.exit(1);
  });
