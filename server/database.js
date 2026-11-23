const { Pool } = require("pg");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    })
  : null;

const schema = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT 'model',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_egp NUMERIC(12, 2),
    image_url TEXT NOT NULL DEFAULT '',
    image_blob_path TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
  CREATE INDEX IF NOT EXISTS products_created_at_idx ON products(created_at DESC);

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    total_egp NUMERIC(12, 2) NOT NULL CHECK (total_egp >= 0),
    status TEXT NOT NULL CHECK (status IN ('new', 'confirmed', 'preparing', 'shipped', 'completed', 'canceled')),
    customer_name TEXT NOT NULL DEFAULT '',
    customer_phone TEXT NOT NULL DEFAULT '',
    governorate TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    payment_method TEXT NOT NULL DEFAULT 'cash',
    customer_notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  );
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT '';
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '';
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS governorate TEXT NOT NULL DEFAULT '';
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT NOT NULL DEFAULT '';
  CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders(created_at DESC);
  CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);

  CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 99),
    unit_price_egp NUMERIC(12, 2) NOT NULL CHECK (unit_price_egp >= 0)
  );
  CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON order_items(order_id);

  CREATE TABLE IF NOT EXISTS storefront_content (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    title_primary TEXT NOT NULL,
    title_accent TEXT NOT NULL,
    description TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS print_quotes (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    stored_file_name TEXT NOT NULL,
    file_blob_path TEXT,
    material TEXT NOT NULL,
    color TEXT NOT NULL,
    infill INTEGER NOT NULL,
    layer_height NUMERIC(4, 2) NOT NULL,
    volume_cm3 NUMERIC(12, 3) NOT NULL,
    dimensions_mm TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    estimated_weight_grams NUMERIC(12, 1) NOT NULL,
    total_egp NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending-review'
  );
  CREATE INDEX IF NOT EXISTS print_quotes_created_at_idx ON print_quotes(created_at DESC);

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx ON admin_sessions(expires_at);
`;

let initialization;

function isEnabled() {
  return Boolean(pool);
}

async function initialize({ categories, products, content }) {
  if (!pool) return;
  if (!initialization) {
    initialization = (async () => {
      await pool.query(schema);
      const currentCategories = await pool.query("SELECT COUNT(*)::int AS count FROM categories");
      if (currentCategories.rows[0].count === 0) {
        for (const category of categories) {
          await pool.query(
            "INSERT INTO categories (id, title, description, icon) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
            [category.id, category.title, category.description || "", category.icon || "model"],
          );
        }
      }

      const currentProducts = await pool.query("SELECT COUNT(*)::int AS count FROM products");
      if (currentProducts.rows[0].count === 0) {
        for (const product of products) {
          await pool.query(
            `INSERT INTO products (id, name, category, description, price_egp, image_url, image_blob_path, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING`,
            [
              product.id,
              product.name,
              product.category,
              product.description || "",
              product.priceEgp ?? null,
              product.imageUrl || "",
              product.imageBlobPath || null,
              product.createdAt || new Date().toISOString(),
              product.updatedAt || new Date().toISOString(),
            ],
          );
        }
      }

      await pool.query(
        `INSERT INTO storefront_content (id, title_primary, title_accent, description)
         VALUES (1, $1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [content.titlePrimary, content.titleAccent, content.description],
      );
      await pool.query("DELETE FROM admin_sessions WHERE expires_at <= NOW()");
    })().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  await initialization;
}

async function ready() {
  if (!pool) throw new Error("DATABASE_URL is not configured.");
  if (!initialization) throw new Error("Database initialization has not completed.");
  await initialization;
}

async function withTransaction(callback) {
  await ready();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7162026)");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    priceEgp: row.price_egp === null ? null : Number(row.price_egp),
    imageUrl: row.image_url,
    ...(row.image_blob_path ? { imageBlobPath: row.image_blob_path } : {}),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function readProducts() {
  await ready();
  const result = await pool.query("SELECT * FROM products ORDER BY created_at DESC, id");
  return result.rows.map(mapProduct);
}

async function writeProducts(products) {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM products");
    for (const product of products) {
      await client.query(
        `INSERT INTO products (id, name, category, description, price_egp, image_url, image_blob_path, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          product.id,
          product.name,
          product.category,
          product.description || "",
          product.priceEgp ?? null,
          product.imageUrl || "",
          product.imageBlobPath || null,
          product.createdAt || new Date().toISOString(),
          product.updatedAt || new Date().toISOString(),
        ],
      );
    }
  });
}

async function readCategories() {
  await ready();
  const result = await pool.query("SELECT * FROM categories ORDER BY created_at, id");
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
  }));
}

async function writeCategories(categories) {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM categories");
    for (const category of categories) {
      await client.query(
        "INSERT INTO categories (id, title, description, icon) VALUES ($1, $2, $3, $4)",
        [category.id, category.title, category.description || "", category.icon || "model"],
      );
    }
  });
}

function mapOrderCustomer(row) {
  return {
    name: row.customer_name || "",
    phone: row.customer_phone || "",
    governorate: row.governorate || "",
    city: row.city || "",
    address: row.address || "",
    paymentMethod: row.payment_method || "cash",
    notes: row.customer_notes || "",
  };
}

function orderCustomerValues(order) {
  const customer = order.customer || {};
  return [
    customer.name || "",
    customer.phone || "",
    customer.governorate || "",
    customer.city || "",
    customer.address || "",
    customer.paymentMethod || "cash",
    customer.notes || "",
  ];
}

async function readOrders() {
  await ready();
  const [orders, items] = await Promise.all([
    pool.query("SELECT * FROM orders ORDER BY created_at DESC, id"),
    pool.query("SELECT * FROM order_items ORDER BY id"),
  ]);
  const itemsByOrder = new Map();
  for (const row of items.rows) {
    const list = itemsByOrder.get(row.order_id) || [];
    list.push({
      productId: row.product_id,
      name: row.name,
      quantity: Number(row.quantity),
      unitPriceEgp: Number(row.unit_price_egp),
    });
    itemsByOrder.set(row.order_id, list);
  }
  return orders.rows.map((row) => ({
    id: row.id,
    items: itemsByOrder.get(row.id) || [],
    customer: mapOrderCustomer(row),
    totalEgp: Number(row.total_egp),
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

async function writeOrders(orders) {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM orders");
    for (const order of orders) {
      await client.query(
        "INSERT INTO orders (id, total_egp, status, created_at, updated_at, customer_name, customer_phone, governorate, city, address, payment_method, customer_notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
        [order.id, order.totalEgp, order.status, order.createdAt, order.updatedAt, ...orderCustomerValues(order)],
      );
      for (const item of order.items || []) {
        await client.query(
          "INSERT INTO order_items (order_id, product_id, name, quantity, unit_price_egp) VALUES ($1, $2, $3, $4, $5)",
          [order.id, item.productId, item.name, item.quantity, item.unitPriceEgp],
        );
      }
    }
  });
}

async function insertOrder(order) {
  await withTransaction(async (client) => {
    await client.query(
      "INSERT INTO orders (id, total_egp, status, created_at, updated_at, customer_name, customer_phone, governorate, city, address, payment_method, customer_notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
      [order.id, order.totalEgp, order.status, order.createdAt, order.updatedAt, ...orderCustomerValues(order)],
    );
    for (const item of order.items || []) {
      await client.query(
        "INSERT INTO order_items (order_id, product_id, name, quantity, unit_price_egp) VALUES ($1, $2, $3, $4, $5)",
        [order.id, item.productId, item.name, item.quantity, item.unitPriceEgp],
      );
    }
  });
}

async function updateOrderStatus(id, status, updatedAt) {
  await ready();
  const result = await pool.query(
    "UPDATE orders SET status = $2, updated_at = $3 WHERE id = $1 RETURNING id, total_egp, status, created_at, updated_at, customer_name, customer_phone, governorate, city, address, payment_method, customer_notes",
    [id, status, updatedAt],
  );
  const row = result.rows[0];
  if (!row) return null;
  const items = await pool.query("SELECT * FROM order_items WHERE order_id = $1 ORDER BY id", [id]);
  return {
    id: row.id,
    items: items.rows.map((item) => ({
      productId: item.product_id,
      name: item.name,
      quantity: Number(item.quantity),
      unitPriceEgp: Number(item.unit_price_egp),
    })),
    customer: mapOrderCustomer(row),
    totalEgp: Number(row.total_egp),
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function readStorefrontContent(defaultContent) {
  await ready();
  const result = await pool.query("SELECT * FROM storefront_content WHERE id = 1");
  const row = result.rows[0];
  if (!row) return defaultContent;
  return {
    titlePrimary: row.title_primary,
    titleAccent: row.title_accent,
    description: row.description,
  };
}

async function writeStorefrontContent(content) {
  await ready();
  await pool.query(
    `INSERT INTO storefront_content (id, title_primary, title_accent, description, updated_at)
     VALUES (1, $1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET title_primary = EXCLUDED.title_primary,
       title_accent = EXCLUDED.title_accent, description = EXCLUDED.description, updated_at = NOW()`,
    [content.titlePrimary, content.titleAccent, content.description],
  );
}

async function insertQuote(record) {
  await ready();
  await pool.query(
    `INSERT INTO print_quotes (
      id, created_at, name, phone, original_file_name, stored_file_name, file_blob_path,
      material, color, infill, layer_height, volume_cm3, dimensions_mm, notes,
      estimated_weight_grams, total_egp, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      record.id,
      record.createdAt,
      record.name,
      record.phone,
      record.originalFileName,
      record.storedFileName,
      record.fileBlobPath || null,
      record.material,
      record.color,
      record.infill,
      record.layerHeight,
      record.volumeCm3,
      record.dimensionsMm,
      record.notes,
      record.estimate.estimatedWeightGrams,
      record.estimate.totalEgp,
      record.status,
    ],
  );
}

async function createAdminSession(tokenHash, email, expiresAt) {
  await ready();
  await pool.query("DELETE FROM admin_sessions WHERE expires_at <= NOW()");
  await pool.query(
    "INSERT INTO admin_sessions (token_hash, email, expires_at) VALUES ($1, $2, $3)",
    [tokenHash, email, expiresAt],
  );
}

async function findAdminSession(tokenHash, adminEmail) {
  await ready();
  const result = await pool.query(
    `SELECT email FROM admin_sessions
     WHERE token_hash = $1 AND expires_at > NOW() AND LOWER(email) = LOWER($2)`,
    [tokenHash, adminEmail],
  );
  return result.rows[0] ? { email: result.rows[0].email } : null;
}

async function deleteAdminSession(tokenHash) {
  await ready();
  await pool.query("DELETE FROM admin_sessions WHERE token_hash = $1", [tokenHash]);
}

module.exports = {
  isEnabled,
  initialize,
  readProducts,
  writeProducts,
  readCategories,
  writeCategories,
  readOrders,
  writeOrders,
  insertOrder,
  updateOrderStatus,
  readStorefrontContent,
  writeStorefrontContent,
  insertQuote,
  createAdminSession,
  findAdminSession,
  deleteAdminSession,
};

