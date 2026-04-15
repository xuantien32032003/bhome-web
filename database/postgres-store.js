const crypto = require("crypto");
const fs = require("fs");

const HASH_PREFIX = "scrypt";

function hashPassword(password) {
  const normalized = String(password || "").trim();
  if (!normalized) throw new Error("Mật khẩu không được để trống.");
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(normalized, salt, 64).toString("hex");
  return `${HASH_PREFIX}:${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const candidate = String(password || "");
  const stored = String(storedHash || "");
  if (!stored) return false;
  if (!stored.startsWith(`${HASH_PREFIX}:`)) {
    return stored === candidate;
  }

  const [, salt, derived] = stored.split(":");
  if (!salt || !derived) return false;
  const candidateHash = crypto.scryptSync(candidate, salt, 64);
  const targetHash = Buffer.from(derived, "hex");
  if (candidateHash.length !== targetHash.length) return false;
  return crypto.timingSafeEqual(candidateHash, targetHash);
}

function normalizeContent(defaultContent, rows) {
  const content = Object.assign({}, defaultContent);
  rows.forEach((row) => {
    content[row.key] = row.value;
  });
  return content;
}

function mapCompanyRow(row, fallback) {
  if (!row) return Object.assign({}, fallback);
  return {
    name: row.name,
    logo: row.logo_url,
    headline: row.headline,
    description: row.description,
    story: row.story,
    heroImage: row.hero_image_url,
    industry: row.industry,
    address: row.address,
    email: row.email,
    phone: row.phone,
    zalo: row.zalo_url,
    facebook: row.facebook_url,
  };
}

function mapAdminRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: "",
    role: row.role || "admin",
  };
}

function mapBuildingRow(row, galleries) {
  return {
    id: row.id,
    name: row.name,
    region: row.region,
    address: row.address,
    image: row.image_url,
    gallery: galleries[row.id] || [],
    floors: row.floors,
    occupancy: row.occupancy_percent,
    averageRent: row.average_rent,
    investmentHighlight: row.investment_highlight,
    description: row.description,
  };
}

function mapRoomRow(row) {
  return {
    id: row.id,
    buildingId: row.building_id,
    name: row.code,
    region: row.region,
    image: row.image_url,
    type: row.room_type,
    rent: row.rent_text,
    status: row.status,
    availableFrom: row.available_from ? row.available_from.toISOString().slice(0, 10) : "",
    checkInDate: row.check_in_date ? row.check_in_date.toISOString().slice(0, 10) : "",
    checkOutDate: row.check_out_date ? row.check_out_date.toISOString().slice(0, 10) : "",
    area: row.area_text,
    amenities: row.amenities,
  };
}

function mapNewsRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    status: row.status,
    publishedAt: row.published_at ? row.published_at.toISOString().slice(0, 10) : "",
    image: row.cover_image_url,
    excerpt: row.excerpt,
    body: row.body,
    createdBy: row.created_by || "",
  };
}

function mapCustomerRow(row) {
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone,
    platform: row.platform_name,
    region: row.region_name,
    status: row.status_name,
    closeStatus: row.close_status,
    demand: row.demand,
    note: row.note,
    createdByEmail: row.created_by_email || "",
    createdByName: row.created_by_name || "Admin",
    createdAt: row.created_at ? row.created_at.toISOString() : "",
    updatedAt: row.updated_at ? row.updated_at.toISOString() : "",
  };
}

async function ensureSchema(pool, schemaPath) {
  const sql = fs.readFileSync(schemaPath, "utf8");
  await pool.query(sql);
}

async function hasRelationalData(pool) {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM admins) AS admins_count,
      (SELECT COUNT(*)::int FROM company_profile) AS company_count
  `);
  const row = result.rows[0] || {};
  return Number(row.admins_count || 0) > 0 || Number(row.company_count || 0) > 0;
}

async function readStateFromPostgres(pool, defaults) {
  const [
    contentResult,
    companyResult,
    investorStatsResult,
    resultsResult,
    adminsResult,
    buildingsResult,
    galleriesResult,
    roomsResult,
    newsResult,
    platformsResult,
    regionsResult,
    statusesResult,
    customersResult,
  ] = await Promise.all([
    pool.query("SELECT key, value FROM site_content"),
    pool.query("SELECT * FROM company_profile WHERE id = 1"),
    pool.query("SELECT * FROM investor_stats ORDER BY sort_order ASC, created_at ASC"),
    pool.query("SELECT * FROM result_highlights ORDER BY sort_order ASC, created_at ASC"),
    pool.query("SELECT * FROM admins WHERE is_active = TRUE ORDER BY created_at ASC"),
    pool.query("SELECT * FROM buildings ORDER BY created_at ASC, name ASC"),
    pool.query("SELECT * FROM building_gallery_images ORDER BY building_id ASC, sort_order ASC, created_at ASC"),
    pool.query("SELECT * FROM rooms ORDER BY created_at ASC, code ASC"),
    pool.query("SELECT * FROM news_posts ORDER BY updated_at DESC, created_at DESC"),
    pool.query("SELECT name FROM customer_platforms ORDER BY sort_order ASC, name ASC"),
    pool.query("SELECT name FROM customer_regions ORDER BY sort_order ASC, name ASC"),
    pool.query("SELECT name, is_closed FROM customer_statuses ORDER BY sort_order ASC, name ASC"),
    pool.query(`
      SELECT
        customers.*,
        admins.email AS created_by_email,
        admins.name AS created_by_name
      FROM customers
      LEFT JOIN admins ON admins.id = customers.created_by
      ORDER BY customers.created_at DESC
    `),
  ]);

  const galleriesByBuilding = galleriesResult.rows.reduce((accumulator, row) => {
    if (!accumulator[row.building_id]) accumulator[row.building_id] = [];
    accumulator[row.building_id].push(row.image_url);
    return accumulator;
  }, {});

  const admins = adminsResult.rows.map(mapAdminRow);

  return {
    content: normalizeContent(defaults.content || {}, contentResult.rows),
    company: mapCompanyRow(companyResult.rows[0], defaults.company || {}),
    investorStats: investorStatsResult.rows.map((row) => ({
      label: row.label,
      value: row.value,
      note: row.note,
    })),
    results: resultsResult.rows.map((row) => ({
      title: row.title,
      description: row.description,
    })),
    admin: {
      email: admins[0] ? admins[0].email : (defaults.admin || {}).email || "",
      password: "",
    },
    admins,
    buildings: buildingsResult.rows.map((row) => mapBuildingRow(row, galleriesByBuilding)),
    rooms: roomsResult.rows.map(mapRoomRow),
    news: newsResult.rows.map(mapNewsRow),
    customerConfig: {
      platforms: platformsResult.rows.map((row) => row.name),
      regions: regionsResult.rows.map((row) => row.name),
      statuses: statusesResult.rows.map((row) => row.name),
    },
    customers: customersResult.rows.map(mapCustomerRow),
  };
}

async function findAdminForLogin(pool, email) {
  const result = await pool.query(
    "SELECT id, name, email, password_hash, role, is_active FROM admins WHERE email = $1 LIMIT 1",
    [String(email || "").trim()]
  );
  return result.rows[0] || null;
}

async function writeStateToPostgres(pool, state) {
  const existingAdmins = await pool.query("SELECT id, email, password_hash FROM admins");
  const existingHashById = new Map(existingAdmins.rows.map((row) => [row.id, row.password_hash]));
  const existingHashByEmail = new Map(existingAdmins.rows.map((row) => [row.email, row.password_hash]));

  const adminIdByEmail = new Map();

  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM building_gallery_images");
    await pool.query("DELETE FROM rooms");
    await pool.query("DELETE FROM news_posts");
    await pool.query("DELETE FROM customers");
    await pool.query("DELETE FROM customer_platforms");
    await pool.query("DELETE FROM customer_regions");
    await pool.query("DELETE FROM customer_statuses");
    await pool.query("DELETE FROM investor_stats");
    await pool.query("DELETE FROM result_highlights");
    await pool.query("DELETE FROM site_content");
    await pool.query("DELETE FROM buildings");
    await pool.query("DELETE FROM admins");
    await pool.query("DELETE FROM company_profile");

    for (const [key, value] of Object.entries(state.content || {})) {
      await pool.query(
        "INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, NOW())",
        [key, String(value ?? "")]
      );
    }

    const company = state.company || {};
    await pool.query(
      `INSERT INTO company_profile
        (id, name, logo_url, headline, description, story, hero_image_url, industry, address, email, phone, zalo_url, facebook_url, created_at, updated_at)
       VALUES
        (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
      [
        String(company.name || ""),
        String(company.logo || ""),
        String(company.headline || ""),
        String(company.description || ""),
        String(company.story || ""),
        String(company.heroImage || ""),
        String(company.industry || ""),
        String(company.address || ""),
        String(company.email || ""),
        String(company.phone || ""),
        String(company.zalo || ""),
        String(company.facebook || ""),
      ]
    );

    for (const [index, stat] of (state.investorStats || []).entries()) {
      await pool.query(
        `INSERT INTO investor_stats (sort_order, label, value, note, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [index, String(stat.label || ""), String(stat.value || ""), String(stat.note || "")]
      );
    }

    for (const [index, result] of (state.results || []).entries()) {
      await pool.query(
        `INSERT INTO result_highlights (sort_order, title, description, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [index, String(result.title || ""), String(result.description || "")]
      );
    }

    for (const admin of state.admins || []) {
      const existingHash = existingHashById.get(admin.id) || existingHashByEmail.get(admin.email);
      const passwordHash = String(admin.password || "").trim()
        ? hashPassword(admin.password)
        : (existingHash || hashPassword("123456"));
      await pool.query(
        `INSERT INTO admins (id, name, email, password_hash, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW(), NOW())`,
        [admin.id, String(admin.name || ""), String(admin.email || ""), passwordHash, String(admin.role || "admin")]
      );
      adminIdByEmail.set(String(admin.email || ""), admin.id);
    }

    for (const building of state.buildings || []) {
      await pool.query(
        `INSERT INTO buildings
          (id, slug, name, region, address, image_url, floors, occupancy_percent, average_rent, investment_highlight, description, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          building.id,
          null,
          String(building.name || ""),
          String(building.region || ""),
          String(building.address || ""),
          String(building.image || ""),
          Number(building.floors || 0),
          Number(building.occupancy || 0),
          String(building.averageRent || ""),
          String(building.investmentHighlight || ""),
          String(building.description || ""),
        ]
      );

      for (const [index, imageUrl] of (building.gallery || []).entries()) {
        await pool.query(
          `INSERT INTO building_gallery_images (building_id, sort_order, image_url, created_at)
           VALUES ($1, $2, $3, NOW())`,
          [building.id, index, String(imageUrl || "")]
        );
      }
    }

    for (const room of state.rooms || []) {
      await pool.query(
        `INSERT INTO rooms
          (id, building_id, code, region, image_url, room_type, rent_text, status, available_from, check_in_date, check_out_date, area_text, amenities, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, '')::date, NULLIF($10, '')::date, NULLIF($11, '')::date, $12, $13, NOW(), NOW())`,
        [
          room.id,
          room.buildingId,
          String(room.name || ""),
          String(room.region || ""),
          String(room.image || ""),
          String(room.type || ""),
          String(room.rent || ""),
          String(room.status || "available"),
          String(room.availableFrom || ""),
          String(room.checkInDate || ""),
          String(room.checkOutDate || ""),
          String(room.area || ""),
          String(room.amenities || ""),
        ]
      );
    }

    for (const [index, name] of ((state.customerConfig && state.customerConfig.platforms) || []).entries()) {
      await pool.query(
        "INSERT INTO customer_platforms (name, sort_order, created_at) VALUES ($1, $2, NOW())",
        [String(name || ""), index]
      );
    }

    for (const [index, name] of ((state.customerConfig && state.customerConfig.regions) || []).entries()) {
      await pool.query(
        "INSERT INTO customer_regions (name, sort_order, created_at) VALUES ($1, $2, NOW())",
        [String(name || ""), index]
      );
    }

    for (const [index, name] of ((state.customerConfig && state.customerConfig.statuses) || []).entries()) {
      const isClosed = String(name || "").toLowerCase().includes("chốt");
      await pool.query(
        "INSERT INTO customer_statuses (name, sort_order, is_closed, created_at) VALUES ($1, $2, $3, NOW())",
        [String(name || ""), index, isClosed]
      );
    }

    for (const customer of state.customers || []) {
      await pool.query(
        `INSERT INTO customers
          (id, full_name, phone, platform_name, region_name, status_name, close_status, demand, note, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE(NULLIF($11, '')::timestamptz, NOW()), COALESCE(NULLIF($12, '')::timestamptz, NOW()))`,
        [
          customer.id,
          String(customer.name || ""),
          String(customer.phone || ""),
          String(customer.platform || ""),
          String(customer.region || ""),
          String(customer.status || ""),
          String(customer.closeStatus || "open"),
          String(customer.demand || ""),
          String(customer.note || ""),
          adminIdByEmail.get(String(customer.createdByEmail || "")) || null,
          String(customer.createdAt || ""),
          String(customer.updatedAt || ""),
        ]
      );
    }

    for (const item of state.news || []) {
      await pool.query(
        `INSERT INTO news_posts
          (id, slug, title, category, status, published_at, cover_image_url, excerpt, body, created_by, created_at, updated_at)
         VALUES
          ($1, $2, $3, $4, $5, NULLIF($6, '')::date, $7, $8, $9, $10, NOW(), NOW())`,
        [
          item.id,
          null,
          String(item.title || ""),
          String(item.category || "Tin tức"),
          String(item.status || "published"),
          String(item.publishedAt || ""),
          String(item.image || ""),
          String(item.excerpt || ""),
          String(item.body || ""),
          item.createdBy ? item.createdBy : null,
        ]
      );
    }

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

module.exports = {
  ensureSchema,
  hasRelationalData,
  readStateFromPostgres,
  writeStateToPostgres,
  hashPassword,
  verifyPassword,
  findAdminForLogin,
};
