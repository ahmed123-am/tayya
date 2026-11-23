const cors = require("cors");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Readable } = require("node:stream");
const express = require("express");
const multer = require("multer");
const database = require("./database");
const telegram = require("./telegram");

const app = express();
const port = Number(process.env.PORT || 5000);
const serverRoot = __dirname;
const uploadsDirectory = path.join(serverRoot, "uploads");
const productImagesDirectory = path.join(uploadsDirectory, "products");
const dataDirectory = path.join(serverRoot, "data");
const quotesFile = path.join(dataDirectory, "quotes.jsonl");
const productsFile = path.join(dataDirectory, "products.json");
const categoriesFile = path.join(dataDirectory, "categories.json");
const ordersFile = path.join(dataDirectory, "orders.json");
const storefrontContentFile = path.join(dataDirectory, "storefront-content.json");
const defaultStorefrontContent = {
  titlePrimary: "مجسمات مختارة",
  titleAccent: "بتفاصيل مميزة",
  description: "اكتشف الأشكال والقطع المطبوعة من طيّة، واختار المجسم اللي يضيف لمستك.",
};
const clientBuildDirectory = path.resolve(serverRoot, "../client/dist");
const allowedExtensions = new Set([".stl", ".obj", ".3mf"]);
const allowedMaterials = new Set(["PLA+", "PETG", "ABS", "Resin"]);
const allowedColors = new Set(["#202124", "#E36414", "#F8F9FA", "#0F4C5C", "#ADB5BD"]);
const layerHeights = new Set([0.1, 0.2, 0.3]);

if (process.env.VERCEL !== "1") {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
  fs.mkdirSync(productImagesDirectory, { recursive: true });
  fs.mkdirSync(dataDirectory, { recursive: true });
}

const allowedOrigins = new Set([
  process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed."));
    },
  }),
);
app.use(express.json({ limit: "1mb" }));

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension)) {
      callback(new Error("نوع الملف غير مدعوم. ارفع STL أو OBJ أو 3MF."));
      return;
    }
    callback(null, true);
  },
});

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension) || !file.mimetype.startsWith("image/")) {
      callback(new Error("نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WEBP."));
      return;
    }
    callback(null, true);
  },
});

const defaultCategories = [
  {
    id: "decor",
    title: "مجسمات ديكور",
    description: "أشكال مطبوعة تضيف لمسة مختلفة لبيتك أو مكتبك.",
    icon: "decor",
  },
  {
    id: "collectibles",
    title: "أشكال وهدايا",
    description: "قطع مميزة للعرض أو الإهداء بتفاصيل مطبوعة بعناية.",
    icon: "gift",
  },
  {
    id: "custom-printing",
    title: "مجسمات حسب الطلب",
    description: "شاركنا فكرتك أو تصميمك ونحوّله إلى مجسم ملموس.",
    icon: "model",
  },
  {
    id: "one-piece",
    title: "ون بيس",
    description: "مجسمات شخصيات ون بيس لعشّاق عالم القراصنة.",
    icon: "model",
  },
];
const orderStatuses = new Set(["new", "confirmed", "preparing", "shipped", "completed", "canceled"]);
const sessionCookieName = "tayya_admin_session";
const oauthStateCookieName = "tayya_google_state";
const sessionDurationSeconds = 7 * 24 * 60 * 60;

const seedProducts = JSON.parse(fs.readFileSync(productsFile, "utf8"));
if (database.isEnabled()) {
  app.use("/api", (request, _response, next) => {
    if (request.path === "/health" || request.path === "/estimate") {
      next();
      return;
    }
    database
      .initialize({
        categories: defaultCategories,
        products: seedProducts,
        content: defaultStorefrontContent,
      })
      .then(() => next())
      .catch(next);
  });
}

function googleAuthConfigured() {
  return Boolean(
    database.isEnabled() &&
      process.env.ADMIN_EMAIL &&
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI,
  );
}

function cookieValue(request, name) {
  const cookieHeader = request.headers.cookie || "";
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(item.slice(separator + 1).trim());
  }
  return "";
}

function setCookie(response, name, value, maxAge, cookiePath = "/api") {
  const secure = process.env.GOOGLE_REDIRECT_URI?.startsWith("https://");
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${cookiePath}`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (secure) parts.push("Secure");
  response.append("Set-Cookie", parts.join("; "));
}

function clearCookie(response, name, cookiePath = "/api") {
  const secure = process.env.GOOGLE_REDIRECT_URI?.startsWith("https://");
  const parts = [`${name}=`, `Path=${cookiePath}`, "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  response.append("Set-Cookie", parts.join("; "));
}

function requirePersistentStorage(_request, response, next) {
  if (process.env.VERCEL === "1" && !database.isEnabled()) {
    response.status(503).json({ error: "اربط قاعدة البيانات المجانية قبل استقبال الطلبات أو حفظ التعديلات." });
    return;
  }
  next();
}

async function requireAdmin(request, response, next) {
  if (!googleAuthConfigured()) {
    response.status(503).json({ error: "إعداد قاعدة البيانات وتسجيل دخول Google مطلوب قبل فتح لوحة الإدارة." });
    return;
  }
  const token = cookieValue(request, sessionCookieName);
  if (!token) {
    response.status(401).json({ error: "سجّل الدخول لحساب الإدارة أولًا." });
    return;
  }
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = await database.findAdminSession(tokenHash, process.env.ADMIN_EMAIL);
    if (!session) {
      clearCookie(response, sessionCookieName);
      response.status(401).json({ error: "جلسة الإدارة انتهت. سجّل الدخول مرة أخرى." });
      return;
    }
    request.admin = session;
    next();
  } catch (error) {
    next(error);
  }
}

const materialDensitiesGramPerCm3 = {
  "PLA+": 1.24,
  PETG: 1.27,
  ABS: 1.04,
  Resin: 1.1,
};
const estimateRatePerGramEgp = 6;
const layerPriceSensitivity = 0.2;

function makeEstimate(input) {
  const volume = Number(input.volumeCm3);
  const modelHeightMm = Number(input.modelHeightMm);
  const infill = Number(input.infill);
  const layerHeight = Number(input.layerHeight);
  const material = String(input.material || "");

  if (!Number.isFinite(volume) || volume <= 0 || volume > 50000) {
    throw new Error("تعذر تقدير حجم النموذج؛ راجع الملف وحاول مرة أخرى.");
  }
  if (!Number.isFinite(modelHeightMm) || modelHeightMm <= 0 || modelHeightMm > 10000) {
    throw new Error("تعذر تقدير ارتفاع النموذج؛ راجع الملف وحاول مرة أخرى.");
  }
  if (!Number.isFinite(infill) || infill < 20 || infill > 100) {
    throw new Error("نسبة الحشو لازم تكون بين 20% و100%.");
  }
  if (!layerHeights.has(layerHeight)) {
    throw new Error("اختار دقة طبقة متاحة.");
  }
  if (!allowedMaterials.has(material)) {
    throw new Error("اختار خامة متاحة.");
  }
  if (!allowedColors.has(String(input.color || "").toUpperCase())) {
    throw new Error("اختار لونًا متاحًا.");
  }

  const fillFactor = 0.55 + (infill / 100) * 0.45;
  const estimatedWeightGrams =
    volume * materialDensitiesGramPerCm3[material] * fillFactor;
  const estimatedLayerCount = Math.ceil(modelHeightMm / layerHeight);
  const standardLayerCount = Math.ceil(modelHeightMm / 0.2);
  const layerCountFactor = estimatedLayerCount / standardLayerCount;
  const layerPriceFactor = 1 + (layerCountFactor - 1) * layerPriceSensitivity;
  const totalEgp = Math.ceil(
    estimatedWeightGrams * estimateRatePerGramEgp * layerPriceFactor,
  );

  return {
    totalEgp,
    estimatedWeightGrams: Number(estimatedWeightGrams.toFixed(1)),
    currency: "EGP",
  };
}

function normalizePhone(value) {
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return String(value || "")
    .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
    .trim();
}

function isValidContact(name, phone) {
  return (
    name.length >= 2 &&
    name.length <= 80 &&
    /^\+?[\d\s()-]{8,20}$/.test(phone)
  );
}

async function removeUploadedFile(file) {
  if (!file?.path) return;
  await fs.promises.rm(file.path, { force: true }).catch(() => {});
}

async function readProducts() {
  if (database.isEnabled()) return database.readProducts();
  try {
    const contents = await fs.promises.readFile(productsFile, "utf8");
    const products = JSON.parse(contents);
    return Array.isArray(products) ? products : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeProducts(products) {
  if (database.isEnabled()) return database.writeProducts(products);
  const temporaryFile = productsFile + "." + crypto.randomUUID() + ".tmp";
  await fs.promises.writeFile(temporaryFile, JSON.stringify(products, null, 2), "utf8");
  await fs.promises.rename(temporaryFile, productsFile);
}

async function readCategories() {
  if (database.isEnabled()) return database.readCategories();
  try {
    const categories = JSON.parse(await fs.promises.readFile(categoriesFile, "utf8"));
    return Array.isArray(categories) ? categories : defaultCategories;
  } catch (error) {
    if (error.code === "ENOENT") return defaultCategories;
    throw error;
  }
}

async function writeCategories(categories) {
  if (database.isEnabled()) return database.writeCategories(categories);
  const temporaryFile = categoriesFile + "." + crypto.randomUUID() + ".tmp";
  await fs.promises.writeFile(temporaryFile, JSON.stringify(categories, null, 2), "utf8");
  await fs.promises.rename(temporaryFile, categoriesFile);
}

async function readOrders() {
  if (database.isEnabled()) return database.readOrders();
  try {
    const orders = JSON.parse(await fs.promises.readFile(ordersFile, "utf8"));
    return Array.isArray(orders) ? orders : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeOrders(orders) {
  if (database.isEnabled()) return database.writeOrders(orders);
  const temporaryFile = ordersFile + "." + crypto.randomUUID() + ".tmp";
  await fs.promises.writeFile(temporaryFile, JSON.stringify(orders, null, 2), "utf8");
  await fs.promises.rename(temporaryFile, ordersFile);
}

async function readStorefrontContent() {
  if (database.isEnabled()) return database.readStorefrontContent(defaultStorefrontContent);
  try {
    const contents = JSON.parse(await fs.promises.readFile(storefrontContentFile, "utf8"));
    return { ...defaultStorefrontContent, ...contents };
  } catch (error) {
    if (error.code === "ENOENT") return defaultStorefrontContent;
    throw error;
  }
}

async function writeStorefrontContent(content) {
  if (database.isEnabled()) return database.writeStorefrontContent(content);
  const temporaryFile = storefrontContentFile + "." + crypto.randomUUID() + ".tmp";
  await fs.promises.writeFile(temporaryFile, JSON.stringify(content, null, 2), "utf8");
  await fs.promises.rename(temporaryFile, storefrontContentFile);
}

function normalizeProductInput(body) {
  const name = String(body.name || "").trim().slice(0, 100);
  const category = String(body.category || "").trim().slice(0, 60);
  const description = String(body.description || "").trim().slice(0, 800);
  const rawPriceEgp = String(body.priceEgp ?? "").trim();
  const priceEgp = rawPriceEgp ? Number(rawPriceEgp) : null;
  if (name.length < 2 || !category) {
    throw new Error("اكتب اسم المنتج واختار القسم.");
  }
  if (priceEgp !== null && (!Number.isFinite(priceEgp) || priceEgp < 0 || priceEgp > 100000000)) {
    throw new Error("اكتب سعرًا صحيحًا بالجنيه المصري.");
  }
  return { name, category, description, priceEgp };
}

async function removeProductImage(imageUrl) {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("/api/product-images/")) return;
  const filename = path.basename(imageUrl);
  if (!filename) return;
  await fs.promises.rm(path.join(productImagesDirectory, filename), { force: true }).catch(() => {});
}

async function persistUpload(file, { kind, productId = "" }) {
  if (!file) return null;
  const extension = path.extname(file.originalname).toLowerCase();
  const filename = crypto.randomUUID() + extension;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${kind}/${filename}`, file.buffer, {
      access: "private",
      contentType: file.mimetype,
    });
    return {
      filename: path.basename(blob.pathname),
      imageUrl: kind === "products" ? `/api/product-images/${productId}` : "",
      blobPath: blob.pathname,
      localPath: "",
    };
  }

  if (process.env.VERCEL === "1") {
    throw new Error("وصّل تخزين الملفات المجاني Vercel Blob قبل رفع الصور أو ملفات الطباعة.");
  }

  const directory = kind === "products" ? productImagesDirectory : uploadsDirectory;
  await fs.promises.mkdir(directory, { recursive: true });
  const localPath = path.join(directory, filename);
  await fs.promises.writeFile(localPath, file.buffer, { flag: "wx" });
  return {
    filename,
    imageUrl: kind === "products" ? `/api/product-images/${filename}` : "",
    blobPath: "",
    localPath,
  };
}

async function removeStoredProductImage(product) {
  if (product?.imageBlobPath && process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import("@vercel/blob");
    await del(product.imageBlobPath, { access: "private" }).catch(() => {});
    return;
  }
  await removeProductImage(product?.imageUrl);
}

async function removeStoredUpload(uploaded) {
  if (uploaded?.blobPath && process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import("@vercel/blob");
    await del(uploaded.blobPath, { access: "private" }).catch(() => {});
    return;
  }
  if (uploaded?.localPath) await fs.promises.rm(uploaded.localPath, { force: true }).catch(() => {});
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "Tayya API" });
});

app.get("/api/auth/me", async (request, response, next) => {
  if (!googleAuthConfigured()) {
    response.status(503).json({ error: "إعداد Neon وحساب Google للإدارة مطلوب أولًا." });
    return;
  }
  const token = cookieValue(request, sessionCookieName);
  if (!token) {
    response.json({ user: null });
    return;
  }
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await database.findAdminSession(tokenHash, process.env.ADMIN_EMAIL);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/google", (request, response) => {
  if (!googleAuthConfigured()) {
    response.status(503).json({ error: "إعداد Neon وبيانات Google OAuth مطلوب قبل تسجيل الدخول." });
    return;
  }
  const state = crypto.randomBytes(32).toString("base64url");
  setCookie(response, oauthStateCookieName, state, 10 * 60, "/api/auth");
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();
  response.redirect(302, authorizationUrl.toString());
});

app.get("/api/auth/google/callback", async (request, response) => {
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173";
  const redirectToAdmin = (errorCode = "") => {
    const target = new URL("/admin", clientOrigin);
    if (errorCode) target.searchParams.set("authError", errorCode);
    response.redirect(302, target.toString());
  };
  clearCookie(response, oauthStateCookieName, "/api/auth");
  if (!googleAuthConfigured()) {
    redirectToAdmin("setup");
    return;
  }

  const expectedState = cookieValue(request, oauthStateCookieName);
  const receivedState = String(request.query.state || "");
  const stateMatches = expectedState.length === receivedState.length && expectedState.length > 0 &&
    crypto.timingSafeEqual(Buffer.from(expectedState), Buffer.from(receivedState));
  if (!stateMatches || !request.query.code || request.query.error) {
    redirectToAdmin("signin");
    return;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: String(request.query.code),
        grant_type: "authorization_code",
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      }),
    });
    if (!tokenResponse.ok) throw new Error("Google authorization code was rejected.");
    const tokens = await tokenResponse.json();
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!profileResponse.ok) throw new Error("Could not read Google profile.");
    const profile = await profileResponse.json();
    const email = String(profile.email || "").trim().toLowerCase();
    if (profile.email_verified !== true || email !== process.env.ADMIN_EMAIL.trim().toLowerCase()) {
      redirectToAdmin("not-allowed");
      return;
    }

    const sessionToken = crypto.randomBytes(32).toString("base64url");
    const sessionTokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
    const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);
    await database.createAdminSession(sessionTokenHash, email, expiresAt);
    setCookie(response, sessionCookieName, sessionToken, sessionDurationSeconds);
    redirectToAdmin();
  } catch (error) {
    console.error("Google sign-in failed:", error.message);
    redirectToAdmin("signin");
  }
});

app.post("/api/auth/logout", async (request, response, next) => {
  const token = cookieValue(request, sessionCookieName);
  clearCookie(response, sessionCookieName);
  if (!database.isEnabled() || !token) {
    response.json({ ok: true });
    return;
  }
  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await database.deleteAdminSession(tokenHash);
    response.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/categories", async (_request, response, next) => {
  try {
    response.json({ categories: await readCategories() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/categories", requireAdmin, async (request, response, next) => {
  const title = String(request.body?.title || "").trim().slice(0, 60);
  if (title.length < 2) {
    response.status(400).json({ error: "اكتب اسمًا للقسم من حرفين على الأقل." });
    return;
  }
  try {
    const categories = await readCategories();
    if (categories.some((category) => category.title.trim().toLocaleLowerCase("ar") === title.toLocaleLowerCase("ar"))) {
      response.status(409).json({ error: "فيه قسم بنفس الاسم بالفعل." });
      return;
    }
    const category = { id: crypto.randomUUID(), title, description: `مجسمات وأشكال من قسم ${title}.`, icon: "model" };
    categories.push(category);
    await writeCategories(categories);
    response.status(201).json({ category, categories });
  } catch (error) {
    next(error);
  }
});

app.put("/api/categories/:id", requireAdmin, async (request, response, next) => {
  const title = String(request.body?.title || "").trim().slice(0, 60);
  if (title.length < 2) {
    response.status(400).json({ error: "اكتب اسمًا للقسم من حرفين على الأقل." });
    return;
  }
  try {
    const categories = await readCategories();
    const categoryIndex = categories.findIndex((category) => category.id === request.params.id);
    if (categoryIndex < 0) {
      response.status(404).json({ error: "القسم المطلوب غير موجود." });
      return;
    }
    if (categories.some((category) => category.id !== request.params.id && category.title.trim().toLocaleLowerCase("ar") === title.toLocaleLowerCase("ar"))) {
      response.status(409).json({ error: "فيه قسم بنفس الاسم بالفعل." });
      return;
    }
    const previousTitle = categories[categoryIndex].title;
    const updatedCategories = categories.map((category) => category.id === request.params.id ? { ...category, title } : category);
    const products = await readProducts();
    const updatedProducts = products.map((product) => product.category === previousTitle
      ? { ...product, category: title, updatedAt: new Date().toISOString() }
      : product);
    if (updatedProducts.some((product, index) => product.category !== products[index].category)) await writeProducts(updatedProducts);
    await writeCategories(updatedCategories);
    response.json({ category: updatedCategories[categoryIndex], categories: updatedCategories, previousTitle });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/categories/:id", requireAdmin, async (request, response, next) => {
  try {
    const categories = await readCategories();
    const category = categories.find((item) => item.id === request.params.id);
    if (!category) {
      response.status(404).json({ error: "القسم المطلوب غير موجود." });
      return;
    }
    const products = await readProducts();
    if (products.some((product) => product.category === category.title)) {
      response.status(409).json({ error: "انقل منتجات القسم إلى قسم آخر قبل حذفه." });
      return;
    }
    const updatedCategories = categories.filter((item) => item.id !== request.params.id);
    await writeCategories(updatedCategories);
    response.json({ id: category.id, categories: updatedCategories, message: "تم حذف القسم." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders", requireAdmin, async (_request, response, next) => {
  try {
    response.json({ orders: await readOrders() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders", requirePersistentStorage, async (request, response, next) => {
  try {
    const customerInput = request.body?.customer || {};
    const phone = String(customerInput.phone || "")
      .replace(/[٠-٩]/g, (digit) => "٠١٢٣٤٥٦٧٨٩".indexOf(digit))
      .replace(/[۰-۹]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
      .trim();
    const customer = {
      name: String(customerInput.name || "").trim(),
      phone,
      governorate: String(customerInput.governorate || "").trim(),
      city: String(customerInput.city || "").trim(),
      address: String(customerInput.address || "").trim(),
      paymentMethod: String(customerInput.paymentMethod || ""),
      notes: String(customerInput.notes || "").trim(),
    };
    const phoneDigits = phone.replace(/\D/g, "");
    if (
      customer.name.length < 2 || customer.name.length > 80 ||
      !/^[+0-9()\s-]{7,20}$/.test(phone) || phoneDigits.length < 7 ||
      customer.governorate.length < 2 || customer.governorate.length > 60 ||
      customer.city.length < 2 || customer.city.length > 80 ||
      customer.address.length < 8 || customer.address.length > 300 ||
      customer.notes.length > 400 ||
      !["cash", "instapay"].includes(customer.paymentMethod)
    ) {
      response.status(400).json({ error: "راجع الاسم ورقم الموبايل وبيانات العنوان وطريقة الدفع." });
      return;
    }
    const requestedItems = request.body?.items;
    if (!Array.isArray(requestedItems) || requestedItems.length < 1 || requestedItems.length > 50) {
      response.status(400).json({ error: "السلة فاضية أو فيها عدد غير صالح من المنتجات." });
      return;
    }
    const products = await readProducts();
    const orderItems = [];
    for (const requested of requestedItems) {
      const product = products.find((item) => item.id === requested.productId);
      const quantity = Number(requested.quantity);
      if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || !Number.isFinite(product.priceEgp)) {
        response.status(400).json({ error: "أحد المنتجات لم يعد متاحًا بسعر صالح. حدّث الصفحة وراجع السلة." });
        return;
      }
      const existing = orderItems.find((item) => item.productId === product.id);
      if (existing) existing.quantity += quantity;
      else orderItems.push({ productId: product.id, name: product.name, quantity, unitPriceEgp: product.priceEgp });
    }
    const totalEgp = orderItems.reduce((sum, item) => sum + item.quantity * item.unitPriceEgp, 0);
    const order = {
      id: crypto.randomUUID(),
      items: orderItems,
      customer,
      totalEgp,
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (database.isEnabled()) {
      await database.insertOrder(order);
    } else {
      const orders = await readOrders();
      orders.unshift(order);
      await writeOrders(orders);
    }
    await telegram.notifyTelegramSafely(() => telegram.orderNotification(order));
    response.status(201).json({ order, message: "تم تسجيل الطلب." });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/orders/:id", requireAdmin, async (request, response, next) => {
  const status = String(request.body?.status || "");
  if (!orderStatuses.has(status)) {
    response.status(400).json({ error: "حالة الطلب غير صالحة." });
    return;
  }
  try {
    if (database.isEnabled()) {
      const updatedOrder = await database.updateOrderStatus(request.params.id, status, new Date().toISOString());
      if (!updatedOrder) {
        response.status(404).json({ error: "الطلب المطلوب غير موجود." });
        return;
      }
      response.json({ order: updatedOrder });
      return;
    }
    const orders = await readOrders();
    const orderIndex = orders.findIndex((order) => order.id === request.params.id);
    if (orderIndex < 0) {
      response.status(404).json({ error: "الطلب المطلوب غير موجود." });
      return;
    }
    orders[orderIndex] = { ...orders[orderIndex], status, updatedAt: new Date().toISOString() };
    await writeOrders(orders);
    response.json({ order: orders[orderIndex] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/storefront-content", async (_request, response, next) => {
  try {
    response.json({ content: await readStorefrontContent() });
  } catch (error) {
    next(error);
  }
});

app.put("/api/storefront-content", requireAdmin, async (request, response, next) => {
  const content = {
    titlePrimary: String(request.body?.titlePrimary || "").trim().slice(0, 80),
    titleAccent: String(request.body?.titleAccent || "").trim().slice(0, 80),
    description: String(request.body?.description || "").trim().slice(0, 300),
  };
  if (content.titlePrimary.length < 2 || content.titleAccent.length < 2 || content.description.length < 2) {
    response.status(400).json({ error: "اكتب عنوان القسم ووصفه قبل الحفظ." });
    return;
  }
  try {
    await writeStorefrontContent(content);
    response.json({ content, message: "تم حفظ نص قسم المنتجات." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products", async (_request, response, next) => {
  try {
    response.json({ products: await readProducts() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/products", requirePersistentStorage, requireAdmin, productImageUpload.single("image"), async (request, response, next) => {
  let storedImage;
  try {
    const fields = normalizeProductInput(request.body || {});
    const id = crypto.randomUUID();
    storedImage = request.file ? await persistUpload(request.file, { kind: "products", productId: id }) : null;
    const product = {
      id,
      ...fields,
      imageUrl: storedImage?.imageUrl || "",
      imageBlobPath: storedImage?.blobPath || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const products = await readProducts();
    products.unshift(product);
    await writeProducts(products);
    response.status(201).json({ product });
  } catch (error) {
    await removeStoredUpload(storedImage);
    if (error instanceof SyntaxError || error.message?.startsWith("اكتب ")) {
      response.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.put("/api/products/:id", requirePersistentStorage, requireAdmin, productImageUpload.single("image"), async (request, response, next) => {
  let storedImage;
  try {
    const products = await readProducts();
    const productIndex = products.findIndex((product) => product.id === request.params.id);
    if (productIndex < 0) {
      await removeUploadedFile(request.file);
      response.status(404).json({ error: "المنتج المطلوب غير موجود." });
      return;
    }
    let fields;
    try {
      fields = normalizeProductInput(request.body || {});
    } catch (error) {
      await removeUploadedFile(request.file);
      response.status(400).json({ error: error.message });
      return;
    }
    const currentProduct = products[productIndex];
    storedImage = request.file
      ? await persistUpload(request.file, { kind: "products", productId: currentProduct.id })
      : null;
    const updatedProduct = {
      ...currentProduct,
      ...fields,
      imageUrl: storedImage?.imageUrl || currentProduct.imageUrl,
      imageBlobPath: storedImage?.blobPath || currentProduct.imageBlobPath || "",
      updatedAt: new Date().toISOString(),
    };
    products[productIndex] = updatedProduct;
    await writeProducts(products);
    if (request.file && currentProduct.imageUrl) await removeStoredProductImage(currentProduct);
    response.json({ product: updatedProduct });
  } catch (error) {
    await removeStoredUpload(storedImage);
    next(error);
  }
});

app.delete("/api/products/:id", requirePersistentStorage, requireAdmin, async (request, response, next) => {
  try {
    const products = await readProducts();
    const productIndex = products.findIndex((product) => product.id === request.params.id);
    if (productIndex < 0) {
      response.status(404).json({ error: "المنتج المطلوب غير موجود." });
      return;
    }
    const [deletedProduct] = products.splice(productIndex, 1);
    await writeProducts(products);
    if (deletedProduct.imageUrl && !products.some((product) => product.imageUrl === deletedProduct.imageUrl)) {
      await removeStoredProductImage(deletedProduct);
    }
    response.json({ id: deletedProduct.id, message: "تم حذف المنتج." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/product-images/:imageId", async (request, response, next) => {
  try {
    const product = (await readProducts()).find((item) => item.id === request.params.imageId && item.imageBlobPath);
    if (!product) {
      next();
      return;
    }
    const { get } = await import("@vercel/blob");
    const blob = await get(product.imageBlobPath, { access: "private" });
    if (!blob) {
      response.status(404).end();
      return;
    }
    response.setHeader("Content-Type", blob.blob.contentType || "application/octet-stream");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "public, max-age=300");
    Readable.fromWeb(blob.stream).pipe(response);
  } catch (error) {
    next(error);
  }
});
app.use("/api/product-images", express.static(productImagesDirectory, { maxAge: "1d" }));

app.post("/api/estimate", (request, response) => {
  try {
    response.json({ estimate: makeEstimate(request.body || {}) });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post("/api/quotes", requirePersistentStorage, upload.single("model"), async (request, response, next) => {
  let storedUpload;
  try {
    const name = String(request.body.name || "").trim();
    const phone = normalizePhone(request.body.phone);
    if (!isValidContact(name, phone)) {
      await removeUploadedFile(request.file);
      response.status(400).json({
        error: "اكتب الاسم ورقم تواصل صحيح عشان نقدر نراجع طلبك.",
      });
      return;
    }
    if (!request.file) {
      response.status(400).json({ error: "ارفع ملف STL أو OBJ أو 3MF أولًا." });
      return;
    }

    let estimate;
    try {
      estimate = makeEstimate(request.body);
    } catch (error) {
      await removeUploadedFile(request.file);
      response.status(400).json({ error: error.message });
      return;
    }

    const quoteId = crypto.randomUUID();
    const originalName = path
      .basename(request.file.originalname)
      .replace(/[\r\n\t]/g, " ")
      .slice(0, 120);
    storedUpload = await persistUpload(request.file, { kind: "quotes" });
    const record = {
      id: quoteId,
      createdAt: new Date().toISOString(),
      name,
      phone,
      originalFileName: originalName,
      storedFileName: storedUpload.filename,
      fileBlobPath: storedUpload.blobPath || "",
      material: request.body.material,
      color: request.body.color,
      infill: Number(request.body.infill),
      layerHeight: Number(request.body.layerHeight),
      volumeCm3: Number(request.body.volumeCm3),
      dimensionsMm: String(request.body.dimensionsMm || "").slice(0, 120),
      notes: String(request.body.notes || "").trim().slice(0, 600),
      estimate,
      status: "pending-review",
    };

    if (database.isEnabled()) await database.insertQuote(record);
    else await fs.promises.appendFile(quotesFile, JSON.stringify(record) + "\n", "utf8");
    await telegram.notifyTelegramSafely(() => telegram.quoteNotification(record));
    response.status(201).json({
      id: quoteId,
      estimate,
      message: "تم تسجيل طلب التسعير للمراجعة.",
    });
  } catch (error) {
    await removeStoredUpload(storedUpload);
    next(error);
  }
});

if (fs.existsSync(clientBuildDirectory)) {
  app.use(express.static(clientBuildDirectory));
  app.use((request, response, next) => {
    if (request.path.startsWith("/api/")) {
      next();
      return;
    }
    response.sendFile(path.join(clientBuildDirectory, "index.html"));
  });
}

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "المسار المطلوب غير موجود." });
});

app.use((error, request, response, _next) => {
  if (error.message?.startsWith("وصّل تخزين الملفات")) {
    response.status(503).json({ error: error.message });
    return;
  }
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? request.path.startsWith("/api/products")
          ? "حجم صورة المنتج أكبر من 8 ميجابايت."
          : "حجم الملف أكبر من الحد المسموح (50 ميجابايت)."
        : "تعذر استقبال الملف. حاول مرة أخرى.";
    response.status(400).json({ error: message });
    return;
  }
  if (error.message?.startsWith("نوع الملف غير مدعوم")) {
    response.status(400).json({ error: error.message });
    return;
  }
  if (error.message?.startsWith("نوع الصورة غير مدعوم")) {
    response.status(400).json({ error: error.message });
    return;
  }
  console.error(error);
  response.status(500).json({ error: "حصل خطأ غير متوقع. حاول مرة أخرى." });
});

app.listen(port, () => {
  console.log("Tayya API listening on http://localhost:" + port);
});


