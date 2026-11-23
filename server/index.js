const cors = require("cors");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const multer = require("multer");

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

fs.mkdirSync(uploadsDirectory, { recursive: true });
fs.mkdirSync(productImagesDirectory, { recursive: true });
fs.mkdirSync(dataDirectory, { recursive: true });

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

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, uploadsDirectory),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, crypto.randomUUID() + extension);
  },
});

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

const productImageStorage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, productImagesDirectory),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, crypto.randomUUID() + extension);
  },
});
const productImageUpload = multer({
  storage: productImageStorage,
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
  const temporaryFile = productsFile + "." + crypto.randomUUID() + ".tmp";
  await fs.promises.writeFile(temporaryFile, JSON.stringify(products, null, 2), "utf8");
  await fs.promises.rename(temporaryFile, productsFile);
}

async function readCategories() {
  try {
    const categories = JSON.parse(await fs.promises.readFile(categoriesFile, "utf8"));
    return Array.isArray(categories) ? categories : defaultCategories;
  } catch (error) {
    if (error.code === "ENOENT") return defaultCategories;
    throw error;
  }
}

async function writeCategories(categories) {
  const temporaryFile = categoriesFile + "." + crypto.randomUUID() + ".tmp";
  await fs.promises.writeFile(temporaryFile, JSON.stringify(categories, null, 2), "utf8");
  await fs.promises.rename(temporaryFile, categoriesFile);
}

async function readOrders() {
  try {
    const orders = JSON.parse(await fs.promises.readFile(ordersFile, "utf8"));
    return Array.isArray(orders) ? orders : [];
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeOrders(orders) {
  const temporaryFile = ordersFile + "." + crypto.randomUUID() + ".tmp";
  await fs.promises.writeFile(temporaryFile, JSON.stringify(orders, null, 2), "utf8");
  await fs.promises.rename(temporaryFile, ordersFile);
}

async function readStorefrontContent() {
  try {
    const contents = JSON.parse(await fs.promises.readFile(storefrontContentFile, "utf8"));
    return { ...defaultStorefrontContent, ...contents };
  } catch (error) {
    if (error.code === "ENOENT") return defaultStorefrontContent;
    throw error;
  }
}

async function writeStorefrontContent(content) {
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

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "Tayya API" });
});

app.get("/api/categories", async (_request, response, next) => {
  try {
    response.json({ categories: await readCategories() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/categories", async (request, response, next) => {
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

app.put("/api/categories/:id", async (request, response, next) => {
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

app.delete("/api/categories/:id", async (request, response, next) => {
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

app.get("/api/orders", async (_request, response, next) => {
  try {
    response.json({ orders: await readOrders() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders", async (request, response, next) => {
  try {
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
      totalEgp,
      status: "new",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const orders = await readOrders();
    orders.unshift(order);
    await writeOrders(orders);
    response.status(201).json({ order, message: "تم تسجيل الطلب." });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/orders/:id", async (request, response, next) => {
  const status = String(request.body?.status || "");
  if (!orderStatuses.has(status)) {
    response.status(400).json({ error: "حالة الطلب غير صالحة." });
    return;
  }
  try {
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

app.put("/api/storefront-content", async (request, response, next) => {
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

app.post("/api/products", productImageUpload.single("image"), async (request, response, next) => {
  try {
    const fields = normalizeProductInput(request.body || {});
    const product = {
      id: crypto.randomUUID(),
      ...fields,
      imageUrl: request.file ? "/api/product-images/" + request.file.filename : "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const products = await readProducts();
    products.unshift(product);
    await writeProducts(products);
    response.status(201).json({ product });
  } catch (error) {
    await removeUploadedFile(request.file);
    if (error instanceof SyntaxError || error.message?.startsWith("اكتب ")) {
      response.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.put("/api/products/:id", productImageUpload.single("image"), async (request, response, next) => {
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
    const updatedProduct = {
      ...currentProduct,
      ...fields,
      imageUrl: request.file ? "/api/product-images/" + request.file.filename : currentProduct.imageUrl,
      updatedAt: new Date().toISOString(),
    };
    products[productIndex] = updatedProduct;
    await writeProducts(products);
    if (request.file && currentProduct.imageUrl) await removeProductImage(currentProduct.imageUrl);
    response.json({ product: updatedProduct });
  } catch (error) {
    await removeUploadedFile(request.file);
    next(error);
  }
});

app.delete("/api/products/:id", async (request, response, next) => {
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
      await removeProductImage(deletedProduct.imageUrl);
    }
    response.json({ id: deletedProduct.id, message: "تم حذف المنتج." });
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

app.post("/api/quotes", upload.single("model"), async (request, response, next) => {
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
    const record = {
      id: quoteId,
      createdAt: new Date().toISOString(),
      name,
      phone,
      originalFileName: originalName,
      storedFileName: request.file.filename,
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

    await fs.promises.appendFile(quotesFile, JSON.stringify(record) + "\n", "utf8");
    response.status(201).json({
      id: quoteId,
      estimate,
      message: "تم تسجيل طلب التسعير للمراجعة.",
    });
  } catch (error) {
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

