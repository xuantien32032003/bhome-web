const express = require("express");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { Pool } = require("pg");
const {
  ensureSchema,
  findAdminForLogin,
  hasRelationalData,
  readStateFromPostgres,
  verifyPassword,
  writeStateToPostgres,
} = require("./database/postgres-store");
require("dotenv").config();

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const SCHEMA_FILE = path.join(ROOT, "database", "schema.sql");
const USE_POSTGRES = Boolean(process.env.DATABASE_URL);
const USE_CLOUDINARY =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const LOGIN_WINDOW_MS = 1000 * 60 * 15;
const MAX_LOGIN_ATTEMPTS = 5;

const pool = USE_POSTGRES
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
    })
  : null;
const loginAttempts = new Map();

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

function shouldAttemptUtf8Repair(value) {
  return /Ã.|Ä.|á»|áº|Æ°|Æ¡|Â|Ð|�/.test(String(value || ""));
}

function repairUtf8String(value) {
  const text = String(value ?? "");
  if (!text || !shouldAttemptUtf8Repair(text)) return text;
  try {
    const repaired = Buffer.from(text, "latin1").toString("utf8");
    if (repaired && repaired !== text) {
      return repaired;
    }
  } catch (_error) {
    return text;
  }
  return text;
}

function repairUtf8Deep(value) {
  if (Array.isArray(value)) {
    return value.map(repairUtf8Deep);
  }
  if (!value || typeof value !== "object") {
    return typeof value === "string" ? repairUtf8String(value) : value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, repairUtf8Deep(entry)])
  );
}

function hasBrokenReplacementChar(value) {
  return typeof value === "string" && value.includes("�");
}

function mergeCorruptedWithFallback(current, fallback) {
  if (Array.isArray(current)) {
    const fallbackArray = Array.isArray(fallback) ? fallback : [];
    return current.map((item, index) => mergeCorruptedWithFallback(item, fallbackArray[index]));
  }

  if (!current || typeof current !== "object") {
    if (hasBrokenReplacementChar(current) && typeof fallback === "string" && fallback) {
      return fallback;
    }
    return current;
  }

  const result = {};
  const keys = new Set([
    ...Object.keys(fallback && typeof fallback === "object" ? fallback : {}),
    ...Object.keys(current),
  ]);

  keys.forEach((key) => {
    const currentValue = key in current ? current[key] : undefined;
    const fallbackValue = fallback && typeof fallback === "object" ? fallback[key] : undefined;
    if (currentValue === undefined) {
      result[key] = fallbackValue;
      return;
    }
    result[key] = mergeCorruptedWithFallback(currentValue, fallbackValue);
  });

  return result;
}

const defaultState = {
  content: {
    brandEyebrow: "Nền tảng đầu tư căn hộ",
    navAbout: "Giới Thiệu",
    navRooms: "Tìm Phòng",
    navAdmin: "Đăng nhập",
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
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
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
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_MS,
    },
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
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!String(file.mimetype || "").startsWith("image/")) {
      cb(new Error("Chá»‰ cho phÃ©p táº£i áº£nh."));
      return;
    }
    cb(null, true);
  },
});

app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(ROOT));

function normalizeState(state) {
  const defaults = repairUtf8Deep(defaultState);
  const nextState = mergeCorruptedWithFallback(repairUtf8Deep(state || {}), defaults);
  nextState.content = Object.assign({}, defaults.content, {
    announcementEnabled: "true",
    announcementText: "Chào mừng bạn đến với Bhome. Danh mục căn hộ đang được cập nhật liên tục.",
  }, nextState.content || {});
  nextState.customers = Array.isArray(nextState.customers) ? nextState.customers : [];
  nextState.customerConfig = Object.assign({}, {
    platforms: ["Facebook", "Zalo", "Website", "TikTok"],
    regions: ["Nha Trang", "Cam Ranh", "Diên Khánh"],
    statuses: ["Mới", "Đang tư vấn", "Đã xem phòng", "Đã chốt", "Chưa phù hợp"],
  }, nextState.customerConfig || {});
  nextState.customerConfig = repairUtf8Deep(nextState.customerConfig);
  const legacyAdmin = nextState.admin || defaults.admin;
  nextState.admins = Array.isArray(nextState.admins) && nextState.admins.length
    ? nextState.admins
      : [{
          id: "admin-root",
          name: "Admin chính",
          email: legacyAdmin.email,
          password: legacyAdmin.password,
          role: "admin",
        }];
  nextState.admins = nextState.admins.map((admin) => Object.assign({ role: "admin" }, admin));
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

function preserveBlankAdminPasswords(nextState, currentState) {
  const currentById = new Map((currentState.admins || []).map((admin) => [admin.id, admin.password || ""]));
  const currentByEmail = new Map((currentState.admins || []).map((admin) => [admin.email, admin.password || ""]));
  nextState.admins = (nextState.admins || []).map((admin) => {
    if (String(admin.password || "").trim()) return admin;
    return Object.assign({}, admin, {
      password: currentById.get(admin.id) || currentByEmail.get(admin.email) || "",
    });
  });
  if (nextState.admins[0]) {
    nextState.admin = {
      email: nextState.admins[0].email,
      password: nextState.admins[0].password,
    };
  }
  return nextState;
}

async function initPersistence() {
  if (!USE_POSTGRES) return;
  await ensureSchema(pool, SCHEMA_FILE);
  const seeded = await hasRelationalData(pool);
  if (!seeded) {
    const initialState = fs.existsSync(STATE_FILE) ? readState() : normalizeState(defaultState);
    await writeStateToPostgres(pool, initialState);
  }
}

async function readStateAny() {
  if (!USE_POSTGRES) return readState();
  return normalizeState(await readStateFromPostgres(pool, defaultState));
}

async function writeStateAny(state) {
  let normalized = normalizeState(state);
  if (!USE_POSTGRES) {
    normalized = preserveBlankAdminPasswords(normalized, readState());
    writeState(normalized);
    return;
  }
  await writeStateToPostgres(pool, normalized);
}

function requireAuth(req, res, next) {
  if (!req.session.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function requireAdminRole(req, res, next) {
  if (!req.session.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.session.adminRole !== "admin") {
    res.status(403).json({ error: "Báº¡n khÃ´ng cÃ³ quyá»n thá»±c hiá»‡n chá»©c nÄƒng nÃ y." });
    return;
  }
  next();
}

function parsePositiveInt(value, fallback, max = Infinity) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function normalizeKeyword(value) {
  return String(value || "").trim().toLowerCase();
}

function getLoginAttemptKey(req, email) {
  return `${req.ip || "unknown"}:${String(email || "").trim().toLowerCase()}`;
}

function isLoginBlocked(req, email) {
  const key = getLoginAttemptKey(req, email);
  const current = loginAttempts.get(key);
  if (!current) return false;
  if (Date.now() > current.expiresAt) {
    loginAttempts.delete(key);
    return false;
  }
  return current.count >= MAX_LOGIN_ATTEMPTS;
}

function recordLoginFailure(req, email) {
  const key = getLoginAttemptKey(req, email);
  const current = loginAttempts.get(key);
  const nextCount = current && Date.now() <= current.expiresAt ? current.count + 1 : 1;
  loginAttempts.set(key, {
    count: nextCount,
    expiresAt: Date.now() + LOGIN_WINDOW_MS,
  });
}

function clearLoginFailures(req, email) {
  loginAttempts.delete(getLoginAttemptKey(req, email));
}

function buildRoomCountMap(rooms) {
  return rooms.reduce((accumulator, room) => {
    accumulator[room.buildingId] = (accumulator[room.buildingId] || 0) + 1;
    return accumulator;
  }, {});
}

function filterRooms(rooms, query = {}) {
  const keyword = normalizeKeyword(query.search);
  const status = normalizeKeyword(query.status);
  const buildingId = String(query.buildingId || "").trim();
  return rooms.filter((room) => {
    const matchesKeyword = !keyword || [room.name, room.region, room.type, room.rent, room.area]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(keyword);
    const matchesStatus = !status || String(room.status || "").toLowerCase() === status;
    const matchesBuilding = !buildingId || room.buildingId === buildingId;
    return matchesKeyword && matchesStatus && matchesBuilding;
  });
}

function paginate(items, page, limit) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const start = (currentPage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    page: currentPage,
    limit,
    totalItems,
    totalPages,
  };
}

function uniqueList(items) {
  return Array.from(new Set((items || []).map((item) => String(item || "").trim()).filter(Boolean)));
}

function serializeRoom(room, buildings) {
  const building = buildings.find((item) => item.id === room.buildingId);
  return Object.assign({}, room, {
    buildingName: building ? building.name : "",
  });
}

function filterCustomers(customers, query = {}) {
  const keyword = normalizeKeyword(query.search);
  const status = String(query.status || "").trim();
  const platform = String(query.platform || "").trim();
  const region = String(query.region || "").trim();
  const period = String(query.period || "").trim();
  const fromDate = String(query.fromDate || "").trim();
  const toDate = String(query.toDate || "").trim();
  const range = resolveCustomerDateRange(period, fromDate, toDate);
  return customers.filter((customer) => {
    const matchesKeyword = !keyword || [
      customer.name,
      customer.phone,
      customer.platform,
      customer.region,
      customer.demand,
      customer.note,
      customer.createdByName,
      customer.createdByEmail,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(keyword);
    const matchesStatus = !status || customer.status === status;
    const matchesPlatform = !platform || customer.platform === platform;
    const matchesRegion = !region || customer.region === region;
    const createdTime = customer.createdAt ? new Date(customer.createdAt).getTime() : NaN;
    const matchesDate =
      !range ||
      (Number.isFinite(createdTime) &&
        createdTime >= range.start.getTime() &&
        createdTime <= range.end.getTime());
    return matchesKeyword && matchesStatus && matchesPlatform && matchesRegion && matchesDate;
  });
}

function resolveCustomerDateRange(period, fromDate, toDate) {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }
  if (period === "7days") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (period === "1month") {
    const start = new Date(now);
    start.setMonth(start.getMonth() - 1);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (period === "1year") {
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }
  if (fromDate || toDate) {
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date("1970-01-01T00:00:00");
    const end = toDate ? new Date(`${toDate}T23:59:59.999`) : now;
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start, end };
  }
  return null;
}

function toCsvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildCustomerStats(state) {
  const customers = Array.isArray(state.customers) ? state.customers : [];
  const byAdminMap = {};
  customers.forEach((customer) => {
    const key = customer.createdByEmail || "unknown";
    if (!byAdminMap[key]) {
      byAdminMap[key] = {
        adminEmail: customer.createdByEmail || "",
        adminName: customer.createdByName || "KhÃ´ng xÃ¡c Ä‘á»‹nh",
        totalCustomers: 0,
        closedCustomers: 0,
      };
    }
    byAdminMap[key].totalCustomers += 1;
    if (customer.closeStatus === "closed") {
      byAdminMap[key].closedCustomers += 1;
    }
  });
  return {
    totalCustomers: customers.length,
    totalClosedCustomers: customers.filter((customer) => customer.closeStatus === "closed").length,
    byAdmin: Object.values(byAdminMap).sort((left, right) => right.totalCustomers - left.totalCustomers),
  };
}

function getVisibleCustomersForSession(customers, session) {
  if ((session && session.adminRole) === "admin") return customers;
  const adminEmail = session && session.adminEmail ? session.adminEmail : "";
  return customers.filter((customer) => customer.createdByEmail === adminEmail);
}

function canManageCustomer(customer, session) {
  if (!customer) return false;
  if ((session && session.adminRole) === "admin") return true;
  return customer.createdByEmail === (session && session.adminEmail ? session.adminEmail : "");
}

function sanitizeRoomInput(input, state, existingRoom) {
  const buildingId = String(input.buildingId || existingRoom?.buildingId || "").trim();
  const building = state.buildings.find((item) => item.id === buildingId);
  if (!building) {
    throw new Error("TÃ²a nhÃ  khÃ´ng há»£p lá»‡.");
  }

  const status = String(input.status || existingRoom?.status || "available").trim();
  const allowedStatuses = new Set(["available", "occupied", "upcoming"]);
  if (!allowedStatuses.has(status)) {
    throw new Error("Tráº¡ng thÃ¡i phÃ²ng khÃ´ng há»£p lá»‡.");
  }

  return {
    id: String(input.id || existingRoom?.id || `room-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`).trim(),
    name: String(input.name || existingRoom?.name || "").trim(),
    buildingId,
    region: String(input.region || building.region || existingRoom?.region || "").trim(),
    image: String(input.image || existingRoom?.image || FALLBACK_ROOM_IMAGE).trim(),
    type: String(input.type || existingRoom?.type || "").trim(),
    rent: String(input.rent || existingRoom?.rent || "").trim(),
    status,
    availableFrom: String(input.availableFrom || existingRoom?.availableFrom || "").trim(),
    checkInDate: String(input.checkInDate || existingRoom?.checkInDate || "").trim(),
    checkOutDate: String(input.checkOutDate || existingRoom?.checkOutDate || "").trim(),
    area: String(input.area || existingRoom?.area || "").trim(),
    amenities: String(input.amenities || existingRoom?.amenities || "").trim(),
  };
}

function sanitizeRoomOccupancyInput(input, existingRoom) {
  const status = String(input.status || existingRoom?.status || "available").trim();
  const allowedStatuses = new Set(["available", "occupied", "upcoming"]);
  if (!allowedStatuses.has(status)) {
    throw new Error("Tráº¡ng thÃ¡i phÃ²ng khÃ´ng há»£p lá»‡.");
  }

  return {
    status,
    checkInDate: String(input.checkInDate || existingRoom?.checkInDate || "").trim(),
    checkOutDate: String(input.checkOutDate || existingRoom?.checkOutDate || "").trim(),
  };
}

function sanitizeCustomerInput(input, state, sessionInfo, existingCustomer) {
  const statuses = uniqueList((state.customerConfig && state.customerConfig.statuses) || []);
  const status = String(input.status || existingCustomer?.status || statuses[0] || "Má»›i").trim();
  if (!statuses.includes(status)) {
    throw new Error("TÃ¬nh tráº¡ng khÃ¡ch hÃ ng khÃ´ng há»£p lá»‡.");
  }

  const createdByEmail = existingCustomer?.createdByEmail || sessionInfo.adminEmail || "";
  const createdByName =
    existingCustomer?.createdByName ||
    (state.admins || []).find((admin) => admin.email === createdByEmail)?.name ||
    sessionInfo.adminEmail ||
    "Admin";

  return {
    id: String(input.id || existingCustomer?.id || `customer-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`).trim(),
    name: String(input.name || existingCustomer?.name || "").trim(),
    phone: String(input.phone || existingCustomer?.phone || "").trim(),
    platform: String(input.platform || existingCustomer?.platform || "").trim(),
    region: String(input.region || existingCustomer?.region || "").trim(),
    status,
    demand: String(input.demand || existingCustomer?.demand || "").trim(),
    note: String(input.note || existingCustomer?.note || "").trim(),
    closeStatus: String(input.closeStatus || existingCustomer?.closeStatus || "open").trim() === "closed" ? "closed" : "open",
    createdByEmail,
    createdByName,
    createdAt: existingCustomer?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function mergeCustomerOptions(state, customer) {
  state.customerConfig = state.customerConfig || {};
  state.customerConfig.platforms = uniqueList([...(state.customerConfig.platforms || []), customer.platform]);
  state.customerConfig.regions = uniqueList([...(state.customerConfig.regions || []), customer.region]);
  state.customerConfig.statuses = uniqueList(state.customerConfig.statuses || []);
}

function buildAdminBootstrap(state, sessionInfo = {}) {
  const role = String(sessionInfo.adminRole || "admin").toLowerCase();
  const scopedAdmins = role === "manager"
    ? (state.admins || []).filter((admin) => admin.email === sessionInfo.adminEmail)
    : state.admins;
  return Object.assign({}, state, {
    rooms: [],
    customers: [],
    admins: scopedAdmins,
    meta: {
      roomCountsByBuilding: buildRoomCountMap(state.rooms || []),
      totalRooms: Array.isArray(state.rooms) ? state.rooms.length : 0,
      customerStats: buildCustomerStats(state),
      customerConfig: state.customerConfig || { platforms: [], regions: [], statuses: [] },
      session: Object.assign({ adminEmail: "", adminRole: "admin", adminName: "" }, sessionInfo),
    },
  });
}

function buildPublicState(state) {
  return {
    content: state.content || {},
    company: state.company || {},
    investorStats: state.investorStats || [],
    results: state.results || [],
    buildings: state.buildings || [],
    rooms: state.rooms || [],
    news: state.news || [],
  };
}

app.get("/api/state", async (_req, res, next) => {
  try {
    res.json(buildPublicState(await readStateAny()));
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/bootstrap", requireAuth, async (_req, res, next) => {
  try {
    const state = await readStateAny();
    const currentAdmin = (state.admins || []).find((admin) => admin.email === (_req.session.adminEmail || ""));
    res.json(buildAdminBootstrap(state, {
      adminEmail: _req.session.adminEmail || "",
      adminRole: _req.session.adminRole || currentAdmin?.role || "admin",
      adminName: _req.session.adminName || currentAdmin?.name || "",
    }));
  } catch (error) {
    next(error);
  }
});

app.get("/api/customers", requireAuth, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 12, 100);
    const visibleCustomers = getVisibleCustomersForSession(state.customers || [], req.session);
    const filtered = filterCustomers(visibleCustomers, req.query)
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));
    res.json(Object.assign(
      paginate(filtered, page, limit),
      {
        filters: {
          platforms: uniqueList((state.customerConfig && state.customerConfig.platforms) || []),
          regions: uniqueList((state.customerConfig && state.customerConfig.regions) || []),
          statuses: uniqueList((state.customerConfig && state.customerConfig.statuses) || []),
        },
        stats: buildCustomerStats({ customers: visibleCustomers }),
      }
    ));
  } catch (error) {
    next(error);
  }
});

app.get("/api/customers/:id", requireAuth, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const item = (state.customers || []).find((customer) => customer.id === req.params.id);
    if (!item) {
      res.status(404).json({ error: "KhÃ´ng tÃ¬m tháº¥y khÃ¡ch hÃ ng." });
      return;
    }
    if (!canManageCustomer(item, req.session)) {
      res.status(403).json({ error: "Báº¡n khÃ´ng cÃ³ quyá»n xem khÃ¡ch hÃ ng nÃ y." });
      return;
    }
    res.json({ item });
  } catch (error) {
    next(error);
  }
});

app.get("/api/customers-export", requireAuth, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const visibleCustomers = getVisibleCustomersForSession(state.customers || [], req.session);
    const filtered = filterCustomers(visibleCustomers, req.query)
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")));

    const rows = [
      ["TÃªn khÃ¡ch", "Sá»‘ Ä‘iá»‡n thoáº¡i", "Ná»n táº£ng", "Khu vá»±c", "TÃ¬nh tráº¡ng", "Chá»‘t cÄƒn", "Nhu cáº§u", "Ghi chÃº", "NgÆ°á»i nháº­p", "Email ngÆ°á»i nháº­p", "Thá»i gian táº¡o", "Cáº­p nháº­t láº§n cuá»‘i"],
      ...filtered.map((customer) => [
        customer.name,
        customer.phone,
        customer.platform,
        customer.region,
        customer.status,
        customer.closeStatus === "closed" ? "ÄÃ£ chá»‘t" : "ChÆ°a chá»‘t",
        customer.demand,
        customer.note,
        customer.createdByName,
        customer.createdByEmail,
        customer.createdAt,
        customer.updatedAt,
      ]),
    ];

    const csv = "\uFEFF" + rows.map((row) => row.map(toCsvCell).join(",")).join("\r\n");
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="khach-hang-${stamp}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

app.get("/api/rooms", async (req, res, next) => {
  try {
    const state = await readStateAny();
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, 12, 100);
    const filteredRooms = filterRooms(state.rooms || [], req.query)
      .map((room) => serializeRoom(room, state.buildings || []));
    res.json(paginate(filteredRooms, page, limit));
  } catch (error) {
    next(error);
  }
});

app.get("/api/rooms/:id", requireAuth, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const room = (state.rooms || []).find((item) => item.id === req.params.id);
    if (!room) {
      res.status(404).json({ error: "KhÃ´ng tÃ¬m tháº¥y phÃ²ng." });
      return;
    }
    res.json({ item: serializeRoom(room, state.buildings || []) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/session", (req, res) => {
  res.json({
    authenticated: Boolean(req.session.isAdmin),
    adminEmail: req.session.adminEmail || "",
    adminRole: req.session.adminRole || "",
    adminName: req.session.adminName || "",
  });
});

function finalizeLoginSession(req, res, admin) {
  req.session.isAdmin = true;
  req.session.adminEmail = admin.email;
  req.session.adminRole = admin.role || "admin";
  req.session.adminName = admin.name || "";
  req.session.save((error) => {
    if (error) {
      res.status(500).json({ ok: false, error: "Không thể khởi tạo phiên đăng nhập." });
      return;
    }
    res.json({ ok: true });
  });
}

app.post("/api/admin/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (isLoginBlocked(req, email)) {
      res.status(429).json({ ok: false, error: "Bạn thử lại sau ít phút." });
      return;
    }

    if (USE_POSTGRES) {
      const admin = await findAdminForLogin(pool, email);
      if (admin && admin.is_active && verifyPassword(password, admin.password_hash)) {
        clearLoginFailures(req, email);
        finalizeLoginSession(req, res, admin);
        return;
      }
    } else {
      const state = await readStateAny();
      const admin = state.admins.find((item) => item.email === email && item.password === password);
      if (admin) {
        clearLoginFailures(req, email);
        finalizeLoginSession(req, res, admin);
        return;
      }
    }

    recordLoginFailure(req, email);
    res.status(401).json({ ok: false, error: "Sai email hoặc mật khẩu." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

app.put("/api/state", requireAdminRole, async (req, res, next) => {
  try {
    await writeStateAny(req.body);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/backup", requireAdminRole, async (_req, res, next) => {
  try {
    const snapshot = await readStateAny();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="bhome-backup-${stamp}.json"`);
    res.json({
      exportedAt: new Date().toISOString(),
      source: USE_POSTGRES ? "postgresql" : "json-file",
      state: snapshot,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/rooms", requireAdminRole, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const room = sanitizeRoomInput(req.body, state);
    state.rooms.unshift(room);
    await writeStateAny(state);
    res.json({ ok: true, item: serializeRoom(room, state.buildings || []) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/rooms/:id", requireAdminRole, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const index = (state.rooms || []).findIndex((item) => item.id === req.params.id);
    if (index < 0) {
      res.status(404).json({ error: "KhÃ´ng tÃ¬m tháº¥y phÃ²ng." });
      return;
    }
    const room = sanitizeRoomInput(Object.assign({}, req.body, { id: req.params.id }), state, state.rooms[index]);
    state.rooms[index] = room;
    await writeStateAny(state);
    res.json({ ok: true, item: serializeRoom(room, state.buildings || []) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/rooms/:id/occupancy", requireAuth, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const index = (state.rooms || []).findIndex((item) => item.id === req.params.id);
    if (index < 0) {
      res.status(404).json({ error: "KhÃ´ng tÃ¬m tháº¥y phÃ²ng." });
      return;
    }
    const patch = sanitizeRoomOccupancyInput(req.body, state.rooms[index]);
    state.rooms[index] = Object.assign({}, state.rooms[index], patch);
    await writeStateAny(state);
    res.json({ ok: true, item: serializeRoom(state.rooms[index], state.buildings || []) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/rooms/:id", requireAdminRole, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const existing = (state.rooms || []).find((item) => item.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: "KhÃ´ng tÃ¬m tháº¥y phÃ²ng." });
      return;
    }
    state.rooms = state.rooms.filter((item) => item.id !== req.params.id);
    await writeStateAny(state);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post("/api/customers", requireAuth, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const customer = sanitizeCustomerInput(req.body, state, { adminEmail: req.session.adminEmail || "" });
    mergeCustomerOptions(state, customer);
    state.customers.unshift(customer);
    await writeStateAny(state);
    res.json({ ok: true, item: customer, stats: buildCustomerStats(state), filters: state.customerConfig });
  } catch (error) {
    next(error);
  }
});

app.put("/api/customers/:id", requireAuth, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const index = (state.customers || []).findIndex((item) => item.id === req.params.id);
    if (index < 0) {
      res.status(404).json({ error: "KhÃ´ng tÃ¬m tháº¥y khÃ¡ch hÃ ng." });
      return;
    }
    if (!canManageCustomer(state.customers[index], req.session)) {
      res.status(403).json({ error: "Báº¡n khÃ´ng cÃ³ quyá»n cáº­p nháº­t khÃ¡ch hÃ ng nÃ y." });
      return;
    }
    const customer = sanitizeCustomerInput(
      Object.assign({}, req.body, { id: req.params.id }),
      state,
      { adminEmail: req.session.adminEmail || "" },
      state.customers[index]
    );
    mergeCustomerOptions(state, customer);
    state.customers[index] = customer;
    await writeStateAny(state);
    res.json({ ok: true, item: customer, stats: buildCustomerStats(state), filters: state.customerConfig });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/customers/:id", requireAuth, async (req, res, next) => {
  try {
    const state = await readStateAny();
    const existing = (state.customers || []).find((item) => item.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: "KhÃ´ng tÃ¬m tháº¥y khÃ¡ch hÃ ng." });
      return;
    }
    if (!canManageCustomer(existing, req.session)) {
      res.status(403).json({ error: "Báº¡n khÃ´ng cÃ³ quyá»n xÃ³a khÃ¡ch hÃ ng nÃ y." });
      return;
    }
    state.customers = state.customers.filter((item) => item.id !== req.params.id);
    await writeStateAny(state);
    res.json({ ok: true, stats: buildCustomerStats(state) });
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

