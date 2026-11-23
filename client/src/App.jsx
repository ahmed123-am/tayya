import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import BrandMark from "./components/BrandMark";
import HeroArtwork from "./components/HeroArtwork";
import "./App.css";

const ModelPreview = lazy(() => import("./components/ModelPreview"));

const fallbackCategories = [
  { id: "decor", title: "مجسمات ديكور", description: "أشكال مطبوعة تضيف لمسة مختلفة لبيتك أو مكتبك.", icon: "decor" },
  { id: "collectibles", title: "أشكال وهدايا", description: "قطع مميزة للعرض أو الإهداء بتفاصيل مطبوعة بعناية.", icon: "gift" },
  { id: "custom-printing", title: "مجسمات حسب الطلب", description: "شاركنا فكرتك أو تصميمك ونحوّله إلى مجسم ملموس.", icon: "model" },
  { id: "one-piece", title: "ون بيس", description: "مجسمات شخصيات ون بيس لعشّاق عالم القراصنة.", icon: "model" },
];
const materials = ["PLA+", "PETG", "ABS", "Resin"];
const colors = [
  { name: "فحمي", value: "#202124" }, { name: "نحاسي", value: "#E36414" },
  { name: "أبيض", value: "#F8F9FA" }, { name: "تركواز", value: "#0F4C5C" },
  { name: "رمادي", value: "#ADB5BD" },
];
const layerHeights = ["0.1", "0.2", "0.3"];
const currentYear = new Date().getFullYear();
const defaultStorefrontContent = {
  titlePrimary: "مجسمات مختارة",
  titleAccent: "بتفاصيل مميزة",
  description: "اكتشف الأشكال والقطع المطبوعة من طيّة، واختار المجسم اللي يضيف لمستك.",
};

function ArrowIcon({ className = "" }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5m0 0 6.5 6.5M5 12l6.5-6.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function CartIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 1.9-1.4L21 8H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="20" r="1.2" fill="currentColor" /><circle cx="18" cy="20" r="1.2" fill="currentColor" /></svg>;
}
function MenuIcon({ open }) {
  return open
    ? <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
    : <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}
function CategoryIcon({ type }) {
  if (type === "decor") return <svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><path d="M28 11h16m-13 0c0 9-6 13-8 24l4 22c1 7 33 7 34 0l4-22C63 24 57 20 57 11M24 35h34" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M25 46c7 5 25 5 32 0" stroke="#E36414" strokeWidth="2.5" strokeLinecap="round" /><path d="M31 11v6m10-6v6m10-6v6" stroke="#0F4C5C" strokeWidth="2.5" strokeLinecap="round" /></svg>;
  if (type === "gift") return <svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><path d="M13 30h46v31H13zM9 22h54v11H9zM36 22v39" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M36 22c-2-12-17-15-19-7-2 7 8 10 19 7Zm0 0c2-12 17-15 19-7 2 7-8 10-19 7Z" fill="#E36414" fillOpacity=".28" stroke="#E36414" strokeWidth="2.5" strokeLinejoin="round" /><path d="M13 43h46" stroke="#0F4C5C" strokeWidth="2.5" /></svg>;
  if (type === "printer") return <svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><path d="M17 57V17h38v40M17 22h38M22 56h28M29 17v12m14-12v12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M29 38h14l7 9H22l7-9Z" fill="#E36414" fillOpacity=".2" stroke="#E36414" strokeWidth="2.5" strokeLinejoin="round" /><path d="M36 30v8m-4-3 4 3 4-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="23" cy="21" r="2" fill="#E36414" /></svg>;

  if (type === "filament") return <svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><ellipse cx="36" cy="18" rx="20" ry="8" fill="#0F4C5C" stroke="currentColor" strokeWidth="2.5" /><path d="M16 18v36c0 4.4 9 8 20 8s20-3.6 20-8V18" fill="#0F4C5C" fillOpacity=".4" stroke="currentColor" strokeWidth="2.5" /><ellipse cx="36" cy="54" rx="20" ry="8" fill="#202124" stroke="#E36414" strokeWidth="2.5" /><ellipse cx="36" cy="18" rx="9" ry="3.5" fill="#202124" stroke="#E36414" strokeWidth="2.5" /><path d="M17 29c0 4.4 9 8 19 8s19-3.6 19-8M17 40c0 4.4 9 8 19 8s19-3.6 19-8" stroke="#E36414" strokeOpacity=".76" strokeWidth="2" /></svg>;
  if (type === "model") return <svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><path d="m36 9 22 13v27L36 62 14 49V22L36 9Z" fill="#0F4C5C" fillOpacity=".46" stroke="currentColor" strokeWidth="2.5" /><path d="m36 9 22 13-22 13-22-13L36 9Z" fill="#0F4C5C" stroke="currentColor" strokeWidth="2.5" /><path d="m36 35 22-13v27L36 62V35Z" fill="#E36414" fillOpacity=".82" stroke="currentColor" strokeWidth="2.5" /><path d="M36 35 14 22v27l22 13V35Z" fill="#0F4C5C" fillOpacity=".76" stroke="currentColor" strokeWidth="2.5" /><path d="m29 26 7-4 7 4-7 4-7-4Z" fill="#F8F9FA" fillOpacity=".68" /></svg>;
  return <svg viewBox="0 0 72 72" fill="none" aria-hidden="true"><path d="m20 20 8-8 12 12-8 8-12-12Zm14 14 8-8 17 17-8 8-17-17Z" fill="#E36414" fillOpacity=".24" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="m14 54 12-12 9 9-12 12-9-9Zm30-8 8-8 8 8-8 8-8-8Z" fill="#0F4C5C" fillOpacity=".72" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /></svg>;
}
function FeatureIcon({ type }) {
  const props = { viewBox: "0 0 28 28", fill: "none", "aria-hidden": true };
  if (type === "precision") return <svg {...props}><path d="M14 3 23 7v7c0 5.4-3.8 9.2-9 11-5.2-1.8-9-5.6-9-11V7l9-4Z" stroke="currentColor" strokeWidth="1.6" /><path d="m10 14 2.6 2.6L18.5 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  if (type === "support") return <svg {...props}><path d="M4 14v-2a10 10 0 0 1 20 0v2m-20 0v5h5v-7H4m20 2v5h-5v-7h5m-5 7c-1.4 2-3.5 3-6 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg {...props}><path d="M18 12a4 4 0 0 1-4 4H9l-5 3v-3.2A7 7 0 0 1 7 3h7a4 4 0 0 1 4 4v5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M11 16v1a7 7 0 0 0 7 7h1l5 2v-4a7 7 0 0 0-7-7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}
function formatEgp(value) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value) + " ج.م";
}
function formatGrams(value) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 1 }).format(value) + " جم";
}
function readSavedCart() {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem("tayya-cart-v1") || "[]");
    return Array.isArray(saved)
      ? saved.filter((item) => typeof item.productId === "string" && Number.isInteger(item.quantity) && item.quantity > 0)
      : [];
  } catch {
    return [];
  }
}
const productCategoryKeywords = {
  decor: ["مجسمات ديكور", "ديكور", "decor"],
  collectibles: ["أشكال وهدايا", "اشكال وهدايا", "هدايا", "collectibles"],
  "custom-printing": ["مجسمات حسب الطلب", "مجسمات مطبوعة مخصصة", "طباعة مخصصة", "حسب الطلب", "custom"],
  "one-piece": ["ون بيس", "one piece", "one-piece"],
};
const onePieceBackdropNames = { "نامي": "NAMI", "سانجي": "SANJI", "إيس": "ACE", "زورو": "ZORO", "لوفي": "LUFFY" };
function matchesProductCategory(product, categoryOrId, categoryList = fallbackCategories) {
  const category = typeof categoryOrId === "string"
    ? categoryList.find((item) => item.id === categoryOrId)
    : categoryOrId;
  const productTitle = String(product.category || "").trim().toLocaleLowerCase("ar");
  if (category?.title && productTitle === category.title.trim().toLocaleLowerCase("ar")) return true;
  const categoryId = category?.id || (typeof categoryOrId === "string" ? categoryOrId : "");
  return (productCategoryKeywords[categoryId] || []).some((keyword) => productTitle.includes(keyword.toLocaleLowerCase("ar")));
}
function formatFileSize(size) {

  return size < 1024 * 1024 ? Math.max(1, Math.round(size / 1024)) + " ك.ب" : (size / (1024 * 1024)).toFixed(1) + " م.ب";
}

function App() {
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shouldLoadPreview, setShouldLoadPreview] = useState(false);
  const customizerSectionRef = useRef(null);
  const [visibleCategories, setVisibleCategories] = useState(fallbackCategories);
  const [products, setProducts] = useState([]);
  const [storefrontContent, setStorefrontContent] = useState(defaultStorefrontContent);
  const [cart, setCart] = useState(readSavedCart);
  const [activeProductCategory, setActiveProductCategory] = useState("all");
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [checkoutValues, setCheckoutValues] = useState({ name: "", phone: "", governorate: "", city: "", address: "", paymentMethod: "cash", notes: "" });
  const [modelFile, setModelFile] = useState(null);
  const [modelStats, setModelStats] = useState(null);
  const [modelError, setModelError] = useState("");
  const [material, setMaterial] = useState("PLA+");
  const [color, setColor] = useState(colors[1]);
  const [infill, setInfill] = useState(20);
  const [layerHeight, setLayerHeight] = useState("0.2");
  const [estimate, setEstimate] = useState(null);

  const [formValues, setFormValues] = useState({ name: "", phone: "", notes: "" });
  const [quoteState, setQuoteState] = useState({ status: "idle", message: "" });
  const currentEstimateKey = modelStats?.volumeCm3 && modelStats?.dimensionsMm?.z
    ? [modelStats.volumeCm3, modelStats.dimensionsMm.z, material, color.value, infill, layerHeight].join("|")
    : "";
  const estimateLoading = Boolean(currentEstimateKey && estimate?.key !== currentEstimateKey && !modelError);
  const activeCategory = visibleCategories.find((category) => category.id === activeProductCategory);
  const filteredProducts = activeProductCategory === "all"
    ? products
    : products.filter((product) => matchesProductCategory(product, activeCategory || activeProductCategory, visibleCategories));
  const cartItems = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return product && Number.isFinite(product.priceEgp) ? { ...product, quantity: item.quantity } : null;
  }).filter(Boolean);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.priceEgp * item.quantity, 0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/products", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل المنتجات.");
        return response.json();
      })
      .then((data) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch((error) => {
        if (error.name !== "AbortError") setProductsError("تعذر تحميل المنتجات حاليًا.");
      })
      .finally(() => setProductsLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/categories", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل الأقسام.");
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data.categories)) {
          setVisibleCategories(data.categories);
          setActiveProductCategory((current) => current === "all" || data.categories.some((category) => category.id === current) ? current : "all");
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("tayya-cart-v1", JSON.stringify(cart));
    } catch {
      // The cart still works for this visit when browser storage is unavailable.
    }
  }, [cart]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/storefront-content", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل نص القسم.");
        return response.json();
      })
      .then((data) => {
        if (data.content) setStorefrontContent({ ...defaultStorefrontContent, ...data.content });
      })
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const target = customizerSectionRef.current;
    if (!target) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadPreview(true);
          observer.disconnect();
        }
      },
      { rootMargin: "220px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
useEffect(() => {
    if (!currentEstimateKey) return undefined;
    const controller = new AbortController();
    fetch("/api/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volumeCm3: modelStats.volumeCm3,
        modelHeightMm: modelStats.dimensionsMm.z,
        material,
        color: color.value,
        infill,
        layerHeight,
      }),
      signal: controller.signal,
    })
      .then((response) => response.json().then((body) => ({ response, body })))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.error || "تعذر حساب السعر.");
        setEstimate({ ...body.estimate, key: currentEstimateKey });
        setModelError("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setEstimate(null);
          setModelError(error.message || "تعذر حساب السعر التقديري.");
        }
      });
    return () => controller.abort();
  }, [currentEstimateKey, modelStats?.volumeCm3, modelStats?.dimensionsMm?.z, material, color.value, infill, layerHeight]);

  const handleModelMetrics = useCallback((stats) => {
    setModelStats(stats);
    setModelError("");
  }, []);
  const handleModelError = useCallback((message) => setModelError(message || ""), []);

  function acceptModelFile(file) {
    if (!file) return;
    if (!/\.(stl|obj|3mf)$/i.test(file.name)) {

      setModelError("صيغة الملف غير مدعومة. ارفع ملف STL أو OBJ أو 3MF.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setModelError("حجم الملف لازم يكون أقل من 50 ميجابايت.");
      return;
    }
    setModelFile(file);
    setModelStats(null);
    setEstimate(null);
    setModelError("");
    setQuoteState({ status: "idle", message: "" });
  }
  function handleFileChange(event) {
    acceptModelFile(event.target.files?.[0]);
    event.target.value = "";
  }
  function handleFileDrop(event) {
    event.preventDefault();
    acceptModelFile(event.dataTransfer.files?.[0]);
  }

  async function handleQuoteSubmit(event) {
    event.preventDefault();
    if (!modelFile || !modelStats) {
      setQuoteState({ status: "error", message: "ارفع ملفًا صالحًا وانتظر ظهور معاينته قبل إرسال الطلب." });
      return;
    }
    if (!estimate || estimateLoading) {
      setQuoteState({ status: "error", message: "انتظر اكتمال التقدير المبدئي للسعر." });
      return;
    }
    const formData = new FormData();
    formData.append("model", modelFile);
    formData.append("name", formValues.name);
    formData.append("phone", formValues.phone);
    formData.append("material", material);
    formData.append("color", color.value);
    formData.append("infill", String(infill));
    formData.append("layerHeight", layerHeight);
    formData.append("volumeCm3", String(modelStats.volumeCm3));
    formData.append("modelHeightMm", String(modelStats.dimensionsMm.z));
    formData.append("dimensionsMm", JSON.stringify(modelStats.dimensionsMm));
    formData.append("notes", formValues.notes);
    setQuoteState({ status: "sending", message: "" });
    try {
      const response = await fetch("/api/quotes", { method: "POST", body: formData });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "تعذر إرسال الطلب.");
      setQuoteState({ status: "success", message: body.message + " رقم الطلب: " + body.id.slice(0, 8).toUpperCase() });
    } catch (error) {
      setQuoteState({ status: "error", message: error.message || "تعذر الاتصال بالخادم. حاول مرة أخرى." });
    }
  }
  function updateFormValue(event) {
    const { name, value } = event.target;
    setFormValues((current) => ({ ...current, [name]: value }));
  }
  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }
  function changeCartQuantity(product, change) {
    setSubmittedOrder(null);
    setOrderError("");
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (!existing) return change > 0 ? [...current, { productId: product.id, quantity: change }] : current;
      const nextQuantity = existing.quantity + change;
      if (nextQuantity <= 0) return current.filter((item) => item.productId !== product.id);
      return current.map((item) => item.productId === product.id ? { ...item, quantity: nextQuantity } : item);
    });
  }
  function removeCartItem(productId) {
    setSubmittedOrder(null);
    setOrderError("");
    setCart((current) => current.filter((item) => item.productId !== productId));
  }
  function updateCheckoutValue(event) {
    const { name, value } = event.target;
    setCheckoutValues((current) => ({ ...current, [name]: value }));
  }
  async function submitCartOrder(event) {
    event.preventDefault();
    if (!cartItems.length || orderSaving) return;
    setOrderSaving(true);
    setOrderError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: checkoutValues,
          items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تسجيل الطلب.");
      setSubmittedOrder(data.order);
      setCart([]);
    } catch (error) {
      setOrderError(error.message || "تعذر الاتصال بالخادم.");
    } finally {
      setOrderSaving(false);
    }
  }
  const submittedOrderMessage = submittedOrder ? [
    `مرحبًا، سجلت طلب رقم ${submittedOrder.id.slice(0, 8).toUpperCase()} على موقع طيّة:`,
    ...submittedOrder.items.map((item) => `${item.name} × ${item.quantity} — ${formatEgp(item.unitPriceEgp * item.quantity)}`),
    `الإجمالي قبل الشحن: ${formatEgp(submittedOrder.totalEgp)}`,
  ].join("\n") : "";

  return (
    <>
      <div className="announcement"><div className="container announcement__inner"><span className="announcement__dot" /><p>من الخيال إلى الواقع.. طيّة تلو الأخرى</p><span className="announcement__side">مجسمات مطبوعة بتفاصيل مميزة</span></div></div>
      <header className="site-header">
        <div className="container header__inner">

          <a className="brand" href="#home" aria-label="طية، الصفحة الرئيسية" onClick={closeMobileMenu}><BrandMark className="brand__mark" /><span className="brand__wordmark"><strong>طَيّة</strong><small>Tayya</small></span></a>
          <button className="header__menu-button" type="button" aria-label={mobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)}><MenuIcon open={mobileMenuOpen} /></button>
          <nav className={"header__nav" + (mobileMenuOpen ? " header__nav--open" : "")} aria-label="التنقل الرئيسي"><a href="#home" onClick={closeMobileMenu}>الرئيسية</a><a href="#categories" onClick={closeMobileMenu}>الأقسام</a><a href="#products" onClick={closeMobileMenu}>المنتجات</a><a href="#custom-print" onClick={closeMobileMenu}>اطلب مجسم</a><a href="#about" onClick={closeMobileMenu}>من نحن</a><a href="#policies" onClick={closeMobileMenu}>السياسات</a><a href="#contact" onClick={closeMobileMenu}>تواصل</a></nav>
          <a className="header__cart button button--small button--outline" href="#cart" onClick={closeMobileMenu} aria-label={`السلة، ${cartItemCount} قطعة، الإجمالي ${formatEgp(cartTotal)}`}><CartIcon /><span>السلة</span><b>{cartItemCount}</b></a>
          <a className="button button--small button--copper header__cta" href="#custom-print">ابدأ الطباعة <ArrowIcon /></a>
        </div>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="container hero-section__grid">
            <div className="hero-copy"><div className="eyebrow"><span /> عالمك يبدأ بطبقة</div><h1>من الخيال إلى الواقع..<br /><span>طيّة تلو الأخرى.</span></h1><p className="hero-copy__lead">متجرك المصري للمجسمات ثلاثية الأبعاد؛ اكتشف أشكالًا وقطع ديكور مطبوعة بعناية، أو اطلب تنفيذ تصميمك الخاص ليصبح مجسمًا ملموسًا.</p><div className="hero-copy__actions"><a className="button button--copper" href="#custom-print">اطلب مجسمك الخاص <ArrowIcon /></a><a className="button button--outline" href="#categories">تصفح المجسمات</a></div><div className="hero-copy__proof"><div className="proof-icon"><span>3D</span></div><p><strong>فكرتك تستاهل تتنفذ</strong><small>تصميمك الرقمي.. مجسم ملموس</small></p><span className="proof-separator" /><p><strong>دقة في كل طبقة</strong><small>خيارات تناسب كل مشروع</small></p></div></div>
            <HeroArtwork />
          </div>
          <div className="hero-section__edge" />
        </section>

        <section className="intro-strip" aria-label="مميزات طية"><div className="container intro-strip__grid"><div><span className="intro-strip__number">01</span><p>اختار مجسم جاهز أو شاركنا فكرتك</p></div><div><span className="intro-strip__number">02</span><p>شاهد معاينة ثلاثية الأبعاد لتصميمك</p></div><div><span className="intro-strip__number">03</span><p>نراجع التفاصيل قبل التنفيذ</p></div></div></section>

        <section className="section category-section" id="categories">
          <div className="container">

            <div className="section-heading"><div><span className="eyebrow"><span /> اختر مجسمك</span><h2>أشكال ومجسمات<br /><em>تضيف لمستك</em></h2></div><p>تصفح مجسمات الديكور والهدايا، أو اطلب تنفيذ شكل خاص يناسب فكرتك.</p></div>
            <div className="category-grid">{visibleCategories.map((category, index) => <article className={"category-card category-card--" + (index + 1)} key={category.id}><div className="category-card__top"><span className="category-card__index">0{index + 1}</span><span className="category-card__icon"><CategoryIcon type={category.icon} /></span></div><h3>{category.title}</h3><p>{category.description}</p>{category.id === "custom-printing" ? <a href="#custom-print" className="text-link">اطلب طباعة مخصصة <ArrowIcon /></a> : <a href="#products" onClick={() => setActiveProductCategory(category.id)} className="text-link">{category.id === "one-piece" ? "تصفح مجسمات ون بيس" : "تصفح القسم"} <ArrowIcon /></a>}</article>)}</div>
            <p className="catalog-note">شاهد المجسمات المتاحة في قسم المنتجات بالأسفل.</p>
          </div>
        </section>

        <section className="section product-section" id="products">
          <div className="container">
            <div className="section-heading">
              <div><span className="eyebrow"><span /> من طيّة ليك</span><h2>{storefrontContent.titlePrimary}<br /><em>{storefrontContent.titleAccent}</em></h2></div>
              <p>{storefrontContent.description}</p>
            </div>
            <nav className="product-filters" aria-label="تصفية المجسمات حسب القسم">
              <button className={"product-filter-button" + (activeProductCategory === "all" ? " is-active" : "")} type="button" aria-pressed={activeProductCategory === "all"} onClick={() => setActiveProductCategory("all")}>
                كل المجسمات <span>{products.length}</span>
              </button>
              {visibleCategories.map((category) => {
                const count = products.filter((product) => matchesProductCategory(product, category, visibleCategories)).length;
                return <button className={"product-filter-button" + (activeProductCategory === category.id ? " is-active" : "")} type="button" aria-pressed={activeProductCategory === category.id} key={category.id} onClick={() => setActiveProductCategory(category.id)}>
                  {category.title} <span>{count}</span>
                </button>;
              })}
            </nav>
            {productsLoading ? <div className="products-empty"><span className="products-empty__icon"><CategoryIcon type="model" /></span><div><span className="eyebrow"><span /> جاري التحميل</span><h3>لحظة واحدة</h3><p>بنجهز لك قائمة المجسمات.</p></div></div> : productsError ? <div className="products-empty"><span className="products-empty__icon"><CategoryIcon type="model" /></span><div><span className="eyebrow"><span /> المنتجات</span><h3>مش قادرين نحمل المنتجات الآن</h3><p>{productsError}</p></div></div> : products.length && filteredProducts.length ? (
              <div className="products-grid">
                {filteredProducts.map((product, index) => {
                  const isOnePiece = matchesProductCategory(product, visibleCategories.find((category) => category.id === "one-piece"), visibleCategories);
                  return <article className="product-card product-card--enter" key={`${activeProductCategory}-${product.id}`} style={{ animationDelay: `${Math.min(index, 8) * 65}ms` }}>
                    <div className={"product-card__image" + (isOnePiece ? " product-card__image--one-piece" : "")}>
                      {isOnePiece && <span className="product-card__image-backdrop" aria-hidden="true">{onePieceBackdropNames[product.name] || product.name}</span>}
                      {product.imageUrl ? <img className={isOnePiece ? "product-card__image-cutout" : ""} src={product.imageUrl} alt={product.name} loading="lazy" /> : <span><CategoryIcon type="model" /></span>}
                      <small className="product-card__image-label">{product.category || "مجسمات طيّة"}</small>
                    </div>
                    <div className="product-card__body"><small className="product-card__category">{product.category || "مجسمات طيّة"}</small><h3>{product.name}</h3><p>{product.description}</p><div className="product-card__footer"><strong>{Number.isFinite(product.priceEgp) ? formatEgp(product.priceEgp) : "السعر عند التواصل"}</strong>{Number.isFinite(product.priceEgp) && <button className="button button--small button--copper product-add-button" type="button" onClick={() => changeCartQuantity(product, 1)}>أضف للسلة</button>}</div><a className="text-link product-card__contact" href={`https://wa.me/201095919325?text=${encodeURIComponent("مرحبًا، أريد الاستفسار عن " + product.name)}`} target="_blank" rel="noreferrer">استفسار عبر واتساب <ArrowIcon /></a></div>
                  </article>;
                })}
              </div>
            ) : products.length ? (
              <div className="products-empty products-empty--filtered"><span className="products-empty__icon"><CategoryIcon type="model" /></span><div><span className="eyebrow"><span /> {visibleCategories.find((category) => category.id === activeProductCategory)?.title}</span><h3>القسم ده لسه فاضي</h3><p>أضف منتجات للقسم من لوحة الإدارة وهتظهر هنا.</p></div><a className="button button--outline" href="/admin">افتح لوحة الإدارة <ArrowIcon /></a></div>
            ) : (
              <div className="products-empty"><span className="products-empty__icon"><CategoryIcon type="model" /></span><div><span className="eyebrow"><span /> قريبًا</span><h3>تشكيلة المجسمات هتظهر هنا</h3><p>بنجهّز تشكيلة من المجسمات المطبوعة بتفاصيل مميزة. تابعنا لاكتشاف الجديد.</p></div><a className="button button--outline" href="#custom-print">اطلب مجسم حسب الطلب <ArrowIcon /></a></div>
            )}
          </div>
        </section>

        <section className="section cart-section" id="cart">
          <div className="container">
            <div className="section-heading"><div><span className="eyebrow"><span /> مشترياتك</span><h2>سلة <em>المجسمات</em></h2></div><p>راجع اختياراتك وعدّل الكمية، والإجمالي بيتحسب تلقائيًا.</p></div>
            {!cartItems.length && submittedOrder ? (
              <div className="cart-order-confirmation"><span className="cart-order-confirmation__check">✓</span><div><small>تم تسجيل الطلب</small><h3>رقم الطلب {submittedOrder.id.slice(0, 8).toUpperCase()}</h3><p>الإجمالي قبل الشحن: {formatEgp(submittedOrder.totalEgp)}. هنتواصل معاك على رقمك لتأكيد التوصيل.</p></div><a className="button button--copper" href={`https://wa.me/201095919325?text=${encodeURIComponent(submittedOrderMessage)}`} target="_blank" rel="noreferrer">استفسر عن الطلب عبر واتساب <ArrowIcon /></a></div>
            ) : !cartItems.length ? (
              <div className="cart-empty"><span>＋</span><div><h3>السلة لسه فاضية</h3><p>أضف المجسمات اللي عجبتك وهتلاقيها هنا.</p></div><a className="button button--outline" href="#products">تصفح المنتجات <ArrowIcon /></a></div>
            ) : (
              <div className="cart-layout">
                <div className="cart-main-column">
                  <div className="cart-items" aria-label="المنتجات في السلة">
                    {cartItems.map((item) => <article className="cart-item" key={item.id}>
                      <div className="cart-item__image">{item.imageUrl && <img src={item.imageUrl} alt="" />}</div>
                      <div className="cart-item__details"><small>{item.category}</small><h3>{item.name}</h3><p>{formatEgp(item.priceEgp)} للقطعة</p></div>
                      <div className="cart-item__controls" aria-label={"كمية " + item.name}><button type="button" onClick={() => changeCartQuantity(item, -1)} aria-label={"تقليل كمية " + item.name}>−</button><span>{item.quantity}</span><button type="button" onClick={() => changeCartQuantity(item, 1)} aria-label={"زيادة كمية " + item.name}>＋</button></div>
                      <strong className="cart-item__line-total">{formatEgp(item.priceEgp * item.quantity)}</strong>
                      <button className="cart-item__remove" type="button" onClick={() => removeCartItem(item.id)}>حذف</button>
                    </article>)}
                  </div>
                  <form className="checkout-card" id="checkout-form" onSubmit={submitCartOrder}>
                    <div className="checkout-card__heading"><span className="eyebrow"><span /> بيانات الاستلام</span><h3>بيانات التوصيل والدفع</h3><p>اكتب بياناتك عشان نقدر نأكد الطلب ونوصّله لك.</p></div>
                    <div className="checkout-fields">
                      <label className="checkout-field"><span>الاسم بالكامل</span><input type="text" name="name" autoComplete="name" required maxLength="80" value={checkoutValues.name} onChange={updateCheckoutValue} placeholder="اسم المستلم" /></label>
                      <label className="checkout-field"><span>رقم الموبايل</span><input type="tel" name="phone" autoComplete="tel" required maxLength="20" value={checkoutValues.phone} onChange={updateCheckoutValue} placeholder="01X XXX XXXX" dir="ltr" /></label>
                      <label className="checkout-field"><span>المحافظة</span><input type="text" name="governorate" autoComplete="address-level1" required maxLength="60" value={checkoutValues.governorate} onChange={updateCheckoutValue} placeholder="مثال: القاهرة" /></label>
                      <label className="checkout-field"><span>المدينة أو المنطقة</span><input type="text" name="city" autoComplete="address-level2" required maxLength="80" value={checkoutValues.city} onChange={updateCheckoutValue} placeholder="المدينة أو الحي" /></label>
                      <label className="checkout-field checkout-field--wide"><span>العنوان بالتفصيل</span><textarea name="address" autoComplete="street-address" required maxLength="300" rows="3" value={checkoutValues.address} onChange={updateCheckoutValue} placeholder="اسم الشارع، رقم العمارة، الدور والشقة" /></label>
                    </div>
                    <fieldset className="checkout-payment">
                      <legend>طريقة الدفع</legend>
                      <div className="checkout-payment__options">
                        <label className={"checkout-payment__option" + (checkoutValues.paymentMethod === "cash" ? " is-selected" : "")}><input type="radio" name="paymentMethod" value="cash" checked={checkoutValues.paymentMethod === "cash"} onChange={updateCheckoutValue} /><span>كاش عند الاستلام</span></label>
                        <label className={"checkout-payment__option" + (checkoutValues.paymentMethod === "instapay" ? " is-selected" : "")}><input type="radio" name="paymentMethod" value="instapay" checked={checkoutValues.paymentMethod === "instapay"} onChange={updateCheckoutValue} /><span>تحويل InstaPay</span></label>
                      </div>
                      {checkoutValues.paymentMethod === "instapay" && <p className="checkout-payment__hint">حوّل على الرقم <bdi dir="ltr">+201095919325</bdi>، وسيتم تأكيد التحويل بعد مراجعة الطلب.</p>}
                    </fieldset>
                    <label className="checkout-field checkout-field--wide"><span>ملاحظات للتوصيل <small>اختياري</small></span><textarea name="notes" maxLength="400" rows="2" value={checkoutValues.notes} onChange={updateCheckoutValue} placeholder="علامة مميزة أو وقت مناسب للاستلام" /></label>
                  </form>
                </div>
                <aside className="cart-summary"><span>عدد القطع: {cartItemCount}</span><div><span>الإجمالي قبل الشحن</span><strong>{formatEgp(cartTotal)}</strong></div>{orderError && <p className="cart-summary__error" role="alert">{orderError}</p>}<button className="button button--copper" type="submit" form="checkout-form" disabled={orderSaving}>{orderSaving ? "جارٍ إرسال الطلب..." : "تأكيد الطلب"} <ArrowIcon /></button><small>تكلفة الشحن نأكدها معاك بعد استلام الطلب.</small></aside>
              </div>
            )}
          </div>
        </section>

        <section className="section custom-section" id="custom-print" ref={customizerSectionRef}>
          <div className="container">
            <div className="section-heading section-heading--custom"><div><span className="eyebrow"><span /> استوديو طيّة</span><h2>ملفك، خامتك،<br /><em>ومجسمك على مزاجك</em></h2></div><p>ارفع تصميمك واختر تفاصيل الطباعة. شاهد معاينة ثلاثية الأبعاد وتقديرًا مبدئيًا للسعر قبل إرسال الطلب.</p></div>
            <form className="customizer" onSubmit={handleQuoteSubmit}>
              <div className="customizer__controls">
                <div className="control-panel">
                  <div className="control-panel__heading"><div><span className="control-panel__kicker">01 / التخصيص</span><h3>خيارات الطباعة</h3></div><span className="control-panel__cube"><CategoryIcon type="model" /></span></div>
                  <fieldset className="option-group"><legend>اختر الخامة</legend><div className="segmented-control">{materials.map((item) => <button className={material === item ? "is-active" : ""} type="button" key={item} aria-pressed={material === item} onClick={() => { setMaterial(item); setModelError(""); }}>{item}</button>)}</div></fieldset>
                  <fieldset className="option-group"><legend>اختر اللون</legend><div className="color-options">{colors.map((item) => <button className={"color-option" + (color.value === item.value ? " is-active" : "")} type="button" key={item.value} aria-label={item.name} aria-pressed={color.value === item.value} onClick={() => { setColor(item); setModelError(""); }}><span style={{ backgroundColor: item.value }} /><small>{item.name}</small></button>)}</div></fieldset>

                  <fieldset className="option-group"><legend className="legend-split"><span>نسبة الحشو</span><strong>{infill}%</strong></legend><input className="range-control" type="range" min="20" max="100" step="5" value={infill} onChange={(event) => { setInfill(Number(event.target.value)); setModelError(""); }} aria-label="نسبة الحشو" /><div className="range-labels"><span>20% أخف</span><span>100% أقوى</span></div></fieldset>
                  <fieldset className="option-group option-group--last"><legend>دقة الطبقة (مم)</legend><div className="layer-options">{layerHeights.map((layer) => <button type="button" className={layerHeight === layer ? "is-active" : ""} key={layer} aria-pressed={layerHeight === layer} onClick={() => { setLayerHeight(layer); setModelError(""); }}>{layer} مم</button>)}</div><p className="control-hint">الطبقة الأقل تعطي تفاصيل أدق ووقت طباعة أطول.</p></fieldset>
                </div>
                <div className="quote-card"><div className="quote-card__label"><span className="live-dot" /> تقدير مبدئي</div><div className="quote-card__weight"><span>الوزن التقريبي</span><strong>{estimateLoading ? "..." : estimate ? formatGrams(estimate.estimatedWeightGrams) : "بعد رفع الملف"}</strong></div><div className="quote-card__price"><strong>{estimateLoading ? "..." : estimate ? formatEgp(estimate.totalEgp) : "—"}</strong><span>السعر التقديري</span></div><p className="quote-card__note">السعر النهائي يتأكد بعد مراجعة الملف وقابليته للطباعة.</p><button className="button button--copper quote-card__submit" type="submit" disabled={quoteState.status === "sending"}>{quoteState.status === "sending" ? "جارٍ إرسال الطلب..." : "أرسل طلب التسعير"} <ArrowIcon /></button>{quoteState.message && <p className={"form-message form-message--" + quoteState.status} role="status">{quoteState.message}</p>}</div>
              </div>

              <div className="customizer__preview-column">
                <div className="preview-panel">
                  <div className="preview-panel__top"><div><span className="control-panel__kicker">02 / المعاينة</span><h3>شاهد مجسمك من كل زاوية</h3></div><span className="preview-panel__badge"><span className="live-dot" /> معاينة تفاعلية</span></div>

                  <div className="preview-stage" onDragOver={(event) => event.preventDefault()} onDrop={handleFileDrop}>{shouldLoadPreview ? <Suspense fallback={<div className="preview-load-state">جارٍ تجهيز المعاينة...</div>}><ModelPreview file={modelFile} color={color.value} onMetrics={handleModelMetrics} onError={handleModelError} /></Suspense> : <div className="preview-load-state preview-load-state--idle">ارفع ملفك لبدء المعاينة</div>}<div className="preview-stage__help"><span>اسحب للتدوير</span><span>عجلة الفأرة للتكبير</span></div><span className="preview-stage__axis preview-stage__axis--x">X</span><span className="preview-stage__axis preview-stage__axis--y">Y</span><span className="preview-stage__axis preview-stage__axis--z">Z</span></div>
                  {modelStats && <div className="model-stats"><div><small>الأبعاد التقريبية</small><strong>{modelStats.dimensionsMm.x} × {modelStats.dimensionsMm.y} × {modelStats.dimensionsMm.z} مم</strong></div><div><small>حجم المجسم</small><strong>{modelStats.volumeCm3} سم³</strong></div></div>}
                  {modelError && <p className="model-error" role="alert">{modelError}</p>}
                </div>
                <div className="upload-panel">
                  <label className={"upload-dropzone" + (modelFile ? " upload-dropzone--loaded" : "")}><input type="file" accept=".stl,.obj,.3mf" onChange={handleFileChange} /><span className="upload-icon"><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 21V5m0 0L9.5 11.5M16 5l6.5 6.5M7 20v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span className="upload-dropzone__title">{modelFile ? modelFile.name : "اسحب ملفك هنا أو اضغط للتحميل"}</span><span className="upload-dropzone__hint">{modelFile ? formatFileSize(modelFile.size) + " · اضغط لتغيير الملف" : "STL · OBJ · 3MF — بحد أقصى 50 م.ب"}</span></label>
                  <div className="quote-contact"><div className="quote-contact__heading"><div><span className="control-panel__kicker">03 / إرسال الطلب</span><h3>بيانات التواصل</h3></div><span className="quote-contact__secure">ملفك لا يُشارك</span></div><div className="quote-contact__grid"><label className="field"><span>الاسم</span><input type="text" name="name" autoComplete="name" required maxLength="80" value={formValues.name} onChange={updateFormValue} placeholder="اسمك" /></label><label className="field"><span>رقم التواصل</span><input type="tel" name="phone" autoComplete="tel" required maxLength="20" value={formValues.phone} onChange={updateFormValue} placeholder="01X XXX XXXX" dir="ltr" /></label></div><label className="field"><span>ملاحظات على التصميم <small>اختياري</small></span><textarea name="notes" rows="3" maxLength="600" value={formValues.notes} onChange={updateFormValue} placeholder="اكتب أي تفاصيل تساعدنا في تنفيذ فكرتك..." /></label><p className="quote-contact__footnote">نستخدم ملفك لمراجعة طلب الطباعة فقط، ولا نشاركه أو نعيد بيعه.</p></div>

                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="section process-section" id="how-it-works">
          <div className="container"><div className="section-heading section-heading--center"><span className="eyebrow"><span /> من رفع الملف حتى الاستلام</span><h2>حوّل فكرتك إلى مجسم<br /><em>في 3 خطوات بسيطة</em></h2><p>رحلة واضحة من التصميم الرقمي إلى قطعة جاهزة بين يديك.</p></div>
            <div className="process-grid"><article className="process-card"><span className="process-card__number">01</span><div className="process-card__icon"><CategoryIcon type="model" /></div><h3>ارفع ملفك</h3><p>ارفع تصميمك بصيغة STL أو OBJ أو 3MF وشاهد معاينته من كل زاوية.</p><span className="process-card__connector" /></article><article className="process-card"><span className="process-card__number">02</span><div className="process-card__icon"><CategoryIcon type="filament" /></div><h3>خصص التفاصيل</h3><p>اختر المادة واللون ونسبة الحشو ودقة الطبقة، واحصل على تقدير مبدئي للسعر.</p><span className="process-card__connector" /></article><article className="process-card"><span className="process-card__number">03</span><div className="process-card__icon"><CategoryIcon type="printer" /></div><h3>استلم مجسمك</h3><p>نراجع قابلية الملف للطباعة، ثم نبدأ التنفيذ ونشحن طلبك إلى عنوانك.</p></article></div>
          </div>
        </section>

        <section className="section about-section" id="about">
          <div className="container about-section__grid">
            <div className="about-visual"><div className="about-visual__frame"><div className="about-visual__topline"><span>طَيّة / 01</span><span>الفكرة هي البداية</span></div><div className="about-visual__object"><div className="about-object about-object--one" /><div className="about-object about-object--two" /><div className="about-object about-object--three" /><div className="about-object__center">T</div></div><div className="about-visual__base"><span>طبقة</span><span>وراء</span><span>طبقة</span></div></div><span className="about-visual__caption">FROM IDEA TO FORM</span></div>
            <div className="about-copy"><span className="eyebrow"><span /> من نحن</span><h2>من فكرة في الخيال..<br /><em>إلى واقع ملموس</em></h2><p className="about-copy__lead">في طيّة، نؤمن بأن كل ابتكار عظيم يبدأ بفكرة بسيطة. مهمتنا أن نمنح هذه الأفكار شكلاً وأبعاداً حقيقية، طبقة تلو الأخرى.</p><p>انطلقنا من شغفنا بعالم التصنيع الرقمي والطباعة ثلاثية الأبعاد، لنكون وجهة متكاملة للصنّاع والمهندسين والمصممين ولكل من يطمح لتحويل تصوراته إلى مجسمات دقيقة وعالية الجودة.</p><p>استلهمنا اسمنا من طريقة بناء المجسمات؛ طبقات متتالية تتجمع بصبر ودقة حتى يكتمل الشكل النهائي.</p><a className="text-link text-link--light" href="#custom-print">ابدأ رحلتك مع طيّة <ArrowIcon /></a></div>

          </div>
        </section>

        <section className="section why-section"><div className="container"><div className="section-heading section-heading--center"><span className="eyebrow"><span /> لماذا تختار طيّة؟</span><h2>دقة هندسية..<br /><em>وتجربة موثوقة</em></h2><p>أدوات مختارة وخدمة تساعدك من اختيار الخامة حتى مراجعة ملفك.</p></div>
          <div className="benefit-grid"><article className="benefit-card"><span className="benefit-card__icon"><FeatureIcon type="precision" /></span><span className="benefit-card__index">01</span><h3>جودة طباعة فائقة</h3><p>طابعات معايرة وخامات ممتازة لضمان أفضل تشطيب نهائي.</p></article><article className="benefit-card"><span className="benefit-card__icon"><FeatureIcon type="support" /></span><span className="benefit-card__index">02</span><h3>دعم فني متخصص</h3><p>فريقنا يساعدك في اختيار الطابعة المناسبة ومراجعة ملفاتك.</p></article><article className="benefit-card"><span className="benefit-card__icon"><CategoryIcon type="filament" /></span><span className="benefit-card__index">03</span><h3>خامات متنوعة</h3><p>PLA+ وPETG وABS وResin لتختار المادة المناسبة لاستخدام مجسمك.</p></article><article className="benefit-card"><span className="benefit-card__icon"><FeatureIcon type="delivery" /></span><span className="benefit-card__index">04</span><h3>توصيل لكل المحافظات</h3><p>تغليف محكم يحمي مجسماتك وتوصيل آمن داخل مصر.</p></article></div>
        </div></section>

        <section className="section values-section"><div className="container values-section__grid"><div className="values-section__intro"><span className="eyebrow"><span /> رؤيتنا وقيمنا</span><h2>نبني مساحة<br /><em>لأفكار أكبر</em></h2><p>نواكب تطورات التصنيع الرقمي ونقرّب أدواته لكل شخص لديه فكرة تستحق التنفيذ.</p></div><div className="values-list"><article><span>01</span><div><h3>الدقة المتناهية</h3><p>نهتم بأدق التفاصيل في كل منتج نبيعه وكل مجسم نطبعه.</p></div></article><article><span>02</span><div><h3>الابتكار المستمر</h3><p>نواكب أحدث تطورات تكنولوجيا الطباعة ثلاثية الأبعاد.</p></div></article><article><span>03</span><div><h3>تمكين الصنّاع</h3><p>نسعى لنشر ثقافة التصنيع الرقمي في مصر والعالم العربي.</p></div></article></div></div></section>

        <section className="policy-section" id="policies"><div className="container"><div className="section-heading policy-heading"><div><span className="eyebrow"><span /> واضحون من البداية</span><h2>سياسات الطباعة<br /><em>والاستبدال</em></h2></div><p>نراجع كل طلب بعناية حتى تكون التوقعات واضحة قبل بدء التنفيذ.</p></div>

          <div className="policy-list"><details><summary><span>01</span><strong>الملكية الفكرية للتصاميم</strong><span className="summary-plus">+</span></summary><p>يقر العميل بأنه يمتلك حقوق استخدام أو طباعة الملفات التي يرفعها (STL وOBJ و3MF). لا تتحمل منصة طيّة مسؤولية انتهاك حقوق الملكية الفكرية لطرف ثالث. ونلتزم بسرية الملفات وعدم مشاركتها أو إعادة بيعها.</p></details><details><summary><span>02</span><strong>طبيعة الطباعة ثلاثية الأبعاد</strong><span className="summary-plus">+</span></summary><p>قد تظهر خطوط الطبقات أو آثار بسيطة لمواضع الدعامات نتيجة طبيعة الطباعة بتقنيات FDM أو Resin. هذه آثار متوقعة ولا تعد عيباً صناعياً بحد ذاتها.</p></details><details><summary><span>03</span><strong>سياسة الاسترجاع والاستبدال</strong><span className="summary-plus">+</span></summary><p>المنتجات الجاهزة كالطابعات والخيوط تخضع للاستبدال والاسترجاع خلال 7 أيام من الاستلام، بشرط بقاء التغليف الأصلي مغلقاً. المجسمات المطبوعة حسب الطلب لا يمكن إلغاؤها أو استرجاعها بعد بدء الطباعة، ويستثنى من ذلك خطأ المقاسات أو التلف أثناء الشحن.</p></details><details><summary><span>04</span><strong>مراجعة الملفات</strong><span className="summary-plus">+</span></summary><p>يحتفظ فريق طيّة بحق التواصل مع العميل لتعديل الطلب أو إلغائه إذا كان الملف المرفوع غير قابل للطباعة هندسياً.</p></details></div>
        </div></section>

        <section className="final-cta"><div className="container final-cta__inner"><div className="final-cta__symbol"><BrandMark /></div><div className="final-cta__copy"><span className="eyebrow"><span /> جاهز تبدأ؟</span><h2>هل لديك تصميم جاهز للطباعة؟</h2><p>ارفع ملفك واحصل على تقدير مبدئي لتكلفة طباعة مجسمك.</p></div><a className="button button--light" href="#custom-print">ارفع ملفك الآن <ArrowIcon /></a></div></section>
      <section className="section contact-section" id="contact">
        <div className="container">
          <div className="section-heading section-heading--center">
            <span className="eyebrow"><span /> نحن هنا لمساعدتك</span>
            <h2>تواصل مع <em>طيّة</em></h2>
            <p>عندك استفسار عن الطباعة أو المنتجات؟ ابعتلنا وهنساعدك.</p>
          </div>
          <div className="contact-grid">
            <a className="contact-card" href="mailto:galilicon18@gmail.com" aria-label="راسل طية عبر البريد الإلكتروني">
              <span className="contact-card__icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="m4.5 7 7.5 6 7.5-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <span className="contact-card__details"><small>البريد الإلكتروني</small><strong dir="ltr">galilicon18@gmail.com</strong></span>
              <span className="contact-card__action">راسلنا <ArrowIcon /></span>
            </a>
            <a className="contact-card" href="tel:+201095919325" aria-label="اتصل بطيّة">
              <span className="contact-card__icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7.2 3.5h2.3l1.1 4.1-1.7 1.3a15.1 15.1 0 0 0 6.2 6.2l1.3-1.7 4.1 1.1v2.3a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 5.2 5.7a2 2 0 0 1 2-2.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
              <span className="contact-card__details"><small>رقم الهاتف</small><strong dir="ltr">+201095919325</strong></span>
              <span className="contact-card__action">اتصل بنا <ArrowIcon /></span>
            </a>
            <a className="contact-card" href="https://wa.me/201095919325" target="_blank" rel="noreferrer" aria-label="راسل طية عبر واتساب">
              <span className="contact-card__icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2l-4.3 1.2L5 15.9a8.2 8.2 0 1 1 15.2-4.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /><path d="M8.7 8.1c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.5l.7 1.7c.1.2.1.4 0 .5l-.4.6c-.2.2-.3.3-.1.6.2.3.8 1.3 1.8 2 .9.6 1.3.7 1.6.6.2-.1.7-.8.9-1.1.2-.2.4-.2.7-.1l1.5.7c.3.1.5.2.5.4 0 .3-.2 1.1-.8 1.5-.6.4-1.2.5-1.9.3-.7-.1-1.6-.5-2.7-1.2-1.1-.7-1.9-1.7-2.3-2.4-.4-.7-.5-1.4-.5-1.9.1-.6.5-1 .7-1.3Z" fill="currentColor" /></svg></span>
              <span className="contact-card__details"><small>واتساب</small><strong dir="ltr">+201095919325</strong></span>
              <span className="contact-card__action">ابدأ محادثة <ArrowIcon /></span>
            </a>
          </div>
          <div className="payment-methods" aria-label="طرق الدفع">
            <span className="payment-methods__label">الدفع متاح بـ</span>
            <span className="payment-method"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="2.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M3 8h14" stroke="currentColor" strokeWidth="1.4" /><circle cx="10" cy="11.5" r="1.5" stroke="currentColor" strokeWidth="1.3" /></svg><strong>كاش</strong></span>
            <span className="payment-method payment-method--instapay"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 7h10l-2.5-2.5M13 7l-2.5 2.5M17 13H7l2.5 2.5M7 13l2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg><strong>InstaPay</strong><bdi dir="ltr">+201095919325</bdi></span>
          </div>
        </div>
      </section>
      </main>

      <footer className="site-footer"><div className="container footer-main"><a className="brand brand--footer" href="#home"><BrandMark className="brand__mark" /><span className="brand__wordmark"><strong>طَيّة</strong><small>Tayya</small></span></a><p>من الخيال إلى الواقع.. طيّة تلو الأخرى.</p><nav aria-label="روابط الفوتر"><a href="#categories">الأقسام</a><a href="#products">المنتجات</a><a href="#custom-print">اطلب مجسم</a><a href="#about">من نحن</a><a href="#policies">السياسات</a><a href="#contact">تواصل</a></nav></div><div className="container footer-bottom"><span>© {currentYear} طيّة (Tayya)</span><span>طبقة.. وراء طبقة.. فكرة بتاخد شكلها.</span></div></footer>
    </>
  );
}

export default App;








