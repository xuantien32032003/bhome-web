const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { ensureSchema, writeStateToPostgres } = require("./postgres-store");

const ROOT = path.join(__dirname, "..");
const STATE_FILE = path.join(ROOT, "data", "state.json");
const SCHEMA_FILE = path.join(ROOT, "database", "schema.sql");

if (!process.env.DATABASE_URL) {
  throw new Error("Thiếu DATABASE_URL. Cần cấu hình PostgreSQL trước khi seed.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

function loadBaseState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  }
  throw new Error("Không tìm thấy data/state.json để làm dữ liệu gốc.");
}

function createId(prefix, index) {
  return `${prefix}-${String(index + 1).padStart(4, "0")}`;
}

function isoDateOffset(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function buildSeedState() {
  const base = loadBaseState();
  const regions = ["Nha Trang", "Cam Ranh", "Diên Khánh", "Vĩnh Hải", "Phước Long"];
  const statuses = ["Mới", "Đang tư vấn", "Đã xem phòng", "Đã chốt", "Chưa phù hợp"];
  const platforms = ["Facebook", "Zalo", "Website", "TikTok", "Google Maps"];
  const newsCategories = ["Tin tức", "Tuyển dụng", "Thông báo"];

  const fallbackBuildingImage = (((base.buildings || [])[0] || {}).image) || "";
  const fallbackRoomImage = (((base.rooms || [])[0] || {}).image) || fallbackBuildingImage;

  const buildings = Array.from({ length: 30 }, (_, index) => {
    const region = regions[index % regions.length];
    return {
      id: createId("building", index),
      name: `Bhome ${region} ${index + 1}`,
      region,
      address: `${12 + index} Nguyễn Thị Minh Khai, ${region}`,
      image: fallbackBuildingImage,
      gallery: [fallbackBuildingImage, fallbackBuildingImage, fallbackBuildingImage],
      floors: 6 + (index % 12),
      occupancy: 70 + (index % 28),
      averageRent: `${10 + (index % 8)} - ${16 + (index % 10)} triệu VND`,
      investmentHighlight: `Tài sản vận hành ổn định tại ${region}`,
      description: `Tòa nhà ${index + 1} thuộc khu vực ${region}, phù hợp vận hành căn hộ cho thuê dài hạn.`,
    };
  });

  const rooms = Array.from({ length: 1000 }, (_, index) => {
    const building = buildings[index % buildings.length];
    const roomIndex = index + 1;
    const status = index % 7 === 0 ? "upcoming" : index % 3 === 0 ? "occupied" : "available";
    return {
      id: createId("room", index),
      buildingId: building.id,
      name: `${String.fromCharCode(65 + (index % 4))}${String(100 + (roomIndex % 900))}`,
      region: building.region,
      image: fallbackRoomImage,
      type: ["Studio", "1PN", "2PN"][index % 3],
      rent: `${9 + (index % 12)} triệu VND`,
      status,
      availableFrom: isoDateOffset((index % 45) - 10),
      checkInDate: status === "occupied" ? isoDateOffset(-(index % 120)) : "",
      checkOutDate: status === "occupied" ? isoDateOffset((index % 60) + 30) : "",
      area: `${24 + (index % 35)} m2`,
      amenities: "Đầy đủ nội thất, wifi, máy giặt, khóa từ",
    };
  });

  const news = Array.from({ length: 36 }, (_, index) => ({
    id: createId("news", index),
    title: `Bài viết ${index + 1} của Bhome`,
    category: newsCategories[index % newsCategories.length],
    status: index % 9 === 0 ? "draft" : "published",
    publishedAt: isoDateOffset(-index),
    image: fallbackBuildingImage,
    excerpt: `Cập nhật hoạt động số ${index + 1} từ Bhome.`,
    body: `Nội dung bài viết số ${index + 1}.\nThông tin chi tiết về vận hành, tuyển dụng và thông báo nội bộ.`,
    createdBy: ((base.admins || [])[0] || {}).id || "admin-root",
  }));

  const customers = Array.from({ length: 240 }, (_, index) => {
    const status = statuses[index % statuses.length];
    const closed = status === "Đã chốt";
    const createdBy = (base.admins || [])[index % Math.max((base.admins || []).length, 1)] || {};
    const createdAt = new Date(Date.now() - (index * 6 * 60 * 60 * 1000)).toISOString();
    return {
      id: createId("customer", index),
      name: `Khách ${index + 1}`,
      phone: `09${String(10000000 + index).slice(0, 8)}`,
      platform: platforms[index % platforms.length],
      region: regions[index % regions.length],
      status,
      closeStatus: closed ? "closed" : "open",
      demand: `${["Studio", "1PN", "2PN"][index % 3]} khu vực ${regions[index % regions.length]}`,
      note: closed ? "Đã chốt thành công" : "Đang theo dõi thêm nhu cầu",
      createdByEmail: createdBy.email || "",
      createdByName: createdBy.name || "Admin",
      createdAt,
      updatedAt: createdAt,
    };
  });

  return Object.assign({}, base, {
    buildings,
    rooms,
    news,
    customers,
    customerConfig: {
      platforms,
      regions,
      statuses,
    },
  });
}

async function main() {
  const seedState = buildSeedState();
  await ensureSchema(pool, SCHEMA_FILE);
  await writeStateToPostgres(pool, seedState);
  console.log(`Seeded PostgreSQL with ${seedState.buildings.length} buildings, ${seedState.rooms.length} rooms, ${seedState.news.length} news posts, ${seedState.customers.length} customers.`);
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end().catch(() => null);
    process.exit(1);
  });
