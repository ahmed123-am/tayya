import { useEffect, useState } from "react";
import BrandMark from "./components/BrandMark";
import "./AdminPage.css";

const initialForm = { name: "", category: "مجسمات ديكور", description: "", priceEgp: "" };
const fallbackAdminCategories = [
  { id: "decor", title: "مجسمات ديكور", description: "أشكال مطبوعة تضيف لمسة مختلفة لبيتك أو مكتبك.", icon: "decor" },
  { id: "collectibles", title: "أشكال وهدايا", description: "قطع مميزة للعرض أو الإهداء بتفاصيل مطبوعة بعناية.", icon: "gift" },
  { id: "custom-printing", title: "مجسمات حسب الطلب", description: "شاركنا فكرتك أو تصميمك ونحوّله إلى مجسم ملموس.", icon: "model" },
  { id: "one-piece", title: "ون بيس", description: "مجسمات شخصيات ون بيس لعشّاق عالم القراصنة.", icon: "model" },
];
const orderStatusOptions = [
  { value: "new", label: "جديد" },
  { value: "confirmed", label: "تم التأكيد" },
  { value: "preparing", label: "قيد التجهيز" },
  { value: "shipped", label: "تم الشحن" },
  { value: "completed", label: "مكتمل" },
  { value: "canceled", label: "ملغي" },
];
const initialStorefrontContent = {
  titlePrimary: "مجسمات مختارة",
  titleAccent: "بتفاصيل مميزة",
  description: "اكتشف الأشكال والقطع المطبوعة من طيّة، واختار المجسم اللي يضيف لمستك.",
};

function formatEgp(value) {
  return new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value) + " ج.م";
}

function AdminPage() {
  const [adminUser, setAdminUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [storefrontContent, setStorefrontContent] = useState(initialStorefrontContent);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentNotice, setContentNotice] = useState({ type: "", message: "" });
  const [categories, setCategories] = useState(fallbackAdminCategories);
  const [categoryTitle, setCategoryTitle] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState("");
  const [categoryNotice, setCategoryNotice] = useState({ type: "", message: "" });
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const authError = new URLSearchParams(window.location.search).get("authError");
    const messages = {
      setup: "إعداد قاعدة البيانات أو تسجيل دخول Google لم يكتمل بعد.",
      signin: "تعذر تسجيل الدخول. حاول مرة أخرى.",
      "not-allowed": "حساب Google ده مش مضاف كحساب الإدارة.",
    };
    if (authError && messages[authError]) setAuthMessage(messages[authError]);
    fetch("/api/auth/me", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (response.status === 503) {
          setAuthMessage(data.error || "إعداد قاعدة البيانات وتسجيل الدخول مطلوب.");
          return;
        }
        if (!response.ok) throw new Error(data.error || "تعذر التحقق من حساب الإدارة.");
        setAuthReady(true);
        setAdminUser(data.user || null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setAuthMessage(error.message || "تعذر الاتصال بالخادم.");
      })
      .finally(() => setAuthLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!adminUser) return undefined;
    const controller = new AbortController();
    fetch("/api/products", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل المنتجات.");
        return response.json();
      })
      .then((data) => setProducts(Array.isArray(data.products) ? data.products : []))
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(error.message || "تعذر الاتصال بالخادم.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [adminUser]);

  useEffect(() => {
    if (!adminUser) return undefined;
    const controller = new AbortController();
    fetch("/api/categories", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل الأقسام.");
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data.categories)) {
          setCategories(data.categories);
          setForm((current) => data.categories.some((category) => category.title === current.category)
            ? current
            : { ...current, category: data.categories[0]?.title || "" });
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") setCategoryNotice({ type: "error", message: error.message || "تعذر الاتصال بالخادم." });
      });
    return () => controller.abort();
  }, [adminUser]);

  useEffect(() => {
    if (!adminUser) return undefined;
    const controller = new AbortController();
    fetch("/api/orders", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل الطلبات.");
        return response.json();
      })
      .then((data) => setOrders(Array.isArray(data.orders) ? data.orders : []))
      .catch((error) => {
        if (error.name !== "AbortError") setOrdersError(error.message || "تعذر الاتصال بالخادم.");
      })
      .finally(() => setOrdersLoading(false));
    return () => controller.abort();
  }, [adminUser]);

  useEffect(() => {
    if (!adminUser) return undefined;
    const controller = new AbortController();
    fetch("/api/storefront-content", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("تعذر تحميل نص قسم المنتجات.");
        return response.json();
      })
      .then((data) => {
        if (data.content) setStorefrontContent({ ...initialStorefrontContent, ...data.content });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setContentNotice({ type: "error", message: error.message || "تعذر الاتصال بالخادم." });
      });
    return () => controller.abort();
  }, [adminUser]);

  useEffect(() => () => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateStorefrontField(event) {
    const { name, value } = event.target;
    setStorefrontContent((current) => ({ ...current, [name]: value }));
  }

  async function saveStorefrontContent(event) {
    event.preventDefault();
    setContentSaving(true);
    setContentNotice({ type: "", message: "" });
    try {
      const response = await fetch("/api/storefront-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(storefrontContent),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ النص.");
      setStorefrontContent({ ...initialStorefrontContent, ...data.content });
      setContentNotice({ type: "success", message: "تم حفظ عنوان ووصف قسم المنتجات." });
    } catch (error) {
      setContentNotice({ type: "error", message: error.message || "تعذر الاتصال بالخادم." });
    } finally {
      setContentSaving(false);
    }
  }

  async function saveCategory(event) {
    event.preventDefault();
    setCategorySaving(true);
    setCategoryNotice({ type: "", message: "" });
    try {
      const endpoint = editingCategory ? "/api/categories/" + editingCategory.id : "/api/categories";
      const response = await fetch(endpoint, {
        method: editingCategory ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: categoryTitle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ القسم.");
      setCategories(data.categories);
      if (editingCategory && data.previousTitle) {
        setProducts((current) => current.map((product) => product.category === data.previousTitle ? { ...product, category: data.category.title } : product));
        setForm((current) => current.category === data.previousTitle ? { ...current, category: data.category.title } : current);
      }
      setCategoryTitle("");
      setEditingCategory(null);
      setCategoryNotice({ type: "success", message: editingCategory ? "تم تعديل القسم والمنتجات التابعة له." : "تمت إضافة القسم." });
    } catch (error) {
      setCategoryNotice({ type: "error", message: error.message || "تعذر الاتصال بالخادم." });
    } finally {
      setCategorySaving(false);
    }
  }

  function beginEditCategory(category) {
    setEditingCategory(category);
    setCategoryTitle(category.title);
    setCategoryNotice({ type: "", message: "" });
  }

  function cancelCategoryEdit() {
    setEditingCategory(null);
    setCategoryTitle("");
    setCategoryNotice({ type: "", message: "" });
  }

  async function deleteCategory(category) {
    if (products.some((product) => product.category === category.title)) return;
    if (!window.confirm("متأكد إنك عاوز تمسح قسم «" + category.title + "»؟")) return;
    setDeletingCategoryId(category.id);
    setCategoryNotice({ type: "", message: "" });
    try {
      const response = await fetch("/api/categories/" + category.id, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حذف القسم.");
      setCategories(data.categories);
      if (editingCategory?.id === category.id) cancelCategoryEdit();
      setForm((current) => current.category === category.title ? { ...current, category: data.categories[0]?.title || "" } : current);
      setCategoryNotice({ type: "success", message: "تم حذف القسم." });
    } catch (error) {
      setCategoryNotice({ type: "error", message: error.message || "تعذر الاتصال بالخادم." });
    } finally {
      setDeletingCategoryId("");
    }
  }

  async function updateOrderStatus(orderId, status) {
    setUpdatingOrderId(orderId);
    setOrdersError("");
    try {
      const response = await fetch("/api/orders/" + orderId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر تحديث حالة الطلب.");
      setOrders((current) => current.map((order) => order.id === orderId ? data.order : order));
    } catch (error) {
      setOrdersError(error.message || "تعذر الاتصال بالخادم.");
    } finally {
      setUpdatingOrderId("");
    }
  }

  const activeOrderValue = orders.reduce((sum, order) => order.status === "canceled" ? sum : sum + order.totalEgp, 0);
  const newOrdersCount = orders.filter((order) => order.status === "new").length;

  function selectImage(event) {
    const file = event.target.files?.[0] || null;
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : editingProduct?.imageUrl || "");
    event.target.value = "";
  }

  function resetForm() {
    setForm(initialForm);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview("");
    setNotice({ type: "", message: "" });
  }

  function beginEdit(product) {
    setEditingProduct(product);
    setForm({
      name: product.name || "",
      category: product.category || "مجسمات ديكور",
      description: product.description || "",
      priceEgp: String(product.priceEgp ?? ""),
    });
    setImageFile(null);
    setImagePreview(product.imageUrl || "");
    setNotice({ type: "", message: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitProduct(event) {
    event.preventDefault();
    setSaving(true);
    setNotice({ type: "", message: "" });
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    if (imageFile) payload.append("image", imageFile);

    try {
      const endpoint = editingProduct ? "/api/products/" + editingProduct.id : "/api/products";
      const response = await fetch(endpoint, { method: editingProduct ? "PUT" : "POST", body: payload });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حفظ المنتج.");
      if (editingProduct) {
        setProducts((current) => current.map((product) => product.id === data.product.id ? data.product : product));
      } else {
        setProducts((current) => [data.product, ...current]);
      }
      setNotice({ type: "success", message: editingProduct ? "تم تعديل المنتج." : "تمت إضافة المنتج." });
      setForm(initialForm);
      setEditingProduct(null);
      setImageFile(null);
      setImagePreview("");
    } catch (error) {
      setNotice({ type: "error", message: error.message || "تعذر الاتصال بالخادم." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm("متأكد إنك عاوز تمسح المنتج «" + product.name + "»؟")) return;
    setDeletingId(product.id);
    setNotice({ type: "", message: "" });
    try {
      const response = await fetch("/api/products/" + product.id, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر حذف المنتج.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      if (editingProduct?.id === product.id) {
        setForm(initialForm);
        setEditingProduct(null);
        setImageFile(null);
        setImagePreview("");
      }
      setNotice({ type: "success", message: "تم حذف المنتج." });
    } catch (error) {
      setNotice({ type: "error", message: error.message || "تعذر الاتصال بالخادم." });
    } finally {
      setDeletingId("");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/admin");
  }

  if (authLoading) {
    return <main className="admin-page admin-login-page" dir="rtl"><div className="admin-login"><BrandMark className="admin-login__mark" /><p>جارٍ التحقق من حساب الإدارة...</p></div></main>;
  }

  if (!adminUser) {
    return (
      <main className="admin-page admin-login-page" dir="rtl">
        <section className="admin-login">
          <BrandMark className="admin-login__mark" />
          <span className="eyebrow"><span /> إدارة طيّة</span>
          <h1>لوحة الإدارة</h1>
          <p>سجّل الدخول بحساب Google المخصص للإدارة لإضافة المنتجات ومتابعة الطلبات.</p>
          {authMessage && <p className="admin-notice admin-notice--error" role="status">{authMessage}</p>}
          {authReady
            ? <a className="admin-submit admin-login__button" href="/api/auth/google">تسجيل الدخول باستخدام Google</a>
            : <button className="admin-submit admin-login__button" type="button" disabled>إعداد تسجيل الدخول مطلوب</button>}
          <a className="admin-back-link" href="/">العودة إلى المتجر</a>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page" dir="rtl">
      <header className="admin-header">
        <div className="admin-container admin-header__inner">
          <a className="admin-brand" href="/"><BrandMark className="admin-brand__mark" /><span><strong>طَيّة</strong><small>إدارة المنتجات</small></span></a>
          <div className="admin-header__tools">
            <span className="admin-header__email" dir="ltr">{adminUser.email}</span>
            <button className="admin-logout" type="button" onClick={signOut}>تسجيل الخروج</button>
            <a className="admin-back-link" href="/">العودة إلى المتجر</a>
          </div>
        </div>
      </header>

      <div className="admin-container admin-content">
        <div className="admin-page-heading">
          <span className="eyebrow"><span /> لوحة طيّة</span>
          <h1>إدارة المنتجات</h1>
          <p>أضف مجسماتك وعدّل صورها وأسعارها وتفاصيلها من مكان واحد.</p>
        </div>

        <section className="admin-panel admin-orders-panel">
          <div className="admin-panel__heading"><div><small>متابعة المبيعات</small><h2>الطلبات والأوردرات <span>{orders.length}</span></h2></div><span className="admin-panel__step">04</span></div>
          <div className="admin-order-metrics">
            <article><small>عدد الأوردرات</small><strong>{orders.length}</strong></article>
            <article><small>قيمة الأوردرات غير الملغاة</small><strong>{formatEgp(activeOrderValue)}</strong></article>
            <article><small>طلبات جديدة</small><strong>{newOrdersCount}</strong></article>
          </div>
          <p className="admin-order-note">القيمة إجمالي الطلبات غير الملغاة، وليست تأكيدًا لتحصيل المبلغ. بيانات العميل وطريقة الدفع تظهر مع كل طلب جديد.</p>
          {ordersError && <p className="admin-notice admin-notice--error">{ordersError}</p>}
          {ordersLoading ? <p className="admin-list-empty">جارٍ تحميل الطلبات...</p> : orders.length ? <div className="admin-orders-list">{orders.map((order) => {
            const customer = order.customer || {};
            const isExpanded = expandedOrderId === order.id;
            const whatsappNumber = String(customer.phone || "").replace(/\D/g, "").replace(/^0/, "20");
            return <article className="admin-order-row" key={order.id}>
              <div className="admin-order-row__top"><div><small>طلب #{order.id.slice(0, 8).toUpperCase()}</small><time>{new Date(order.createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</time></div><strong>{formatEgp(order.totalEgp)}</strong></div>
              <div className="admin-order-preview">
                <div><small>العميل</small><strong>{customer.name || "بيانات العميل غير متاحة"}</strong></div>
                {customer.phone && <a href={"tel:" + customer.phone} dir="ltr">{customer.phone}</a>}
              </div>
              <button className="admin-order-details-toggle" type="button" aria-expanded={isExpanded} aria-controls={isExpanded ? `order-details-${order.id}` : undefined} onClick={() => setExpandedOrderId(isExpanded ? "" : order.id)}>
                <span>{isExpanded ? "إخفاء تفاصيل الطلب والعميل" : "تفاصيل الطلب والعميل"}</span><span className="admin-order-details-toggle__icon" aria-hidden="true">{isExpanded ? "−" : "+"}</span>
              </button>
              {isExpanded && <div className="admin-order-details" id={`order-details-${order.id}`}>
                <section className="admin-order-details__section" aria-label="تفاصيل المنتجات">
                  <h3>المنتجات في الطلب</h3>
                  <ul className="admin-order-items">{(order.items || []).map((item, index) => <li key={`${item.productId || item.name}-${index}`}>
                    <span><strong>{item.name}</strong><small>{item.quantity} × {formatEgp(item.unitPriceEgp)}</small></span>
                    <strong>{formatEgp(item.quantity * item.unitPriceEgp)}</strong>
                  </li>)}</ul>
                  <div className="admin-order-details__total"><span>إجمالي الطلب</span><strong>{formatEgp(order.totalEgp)}</strong></div>
                </section>
                <section className="admin-order-details__section" aria-label="بيانات العميل">
                  <h3>بيانات العميل والتوصيل</h3>
                  <dl className="admin-order-customer-grid">
                    <div><dt>اسم العميل</dt><dd>{customer.name || "غير متاح"}</dd></div>
                    <div><dt>رقم الموبايل</dt><dd dir="ltr">{customer.phone || "غير متاح"}</dd></div>
                    <div><dt>المحافظة</dt><dd>{customer.governorate || "غير متاحة"}</dd></div>
                    <div><dt>المدينة / المنطقة</dt><dd>{customer.city || "غير متاحة"}</dd></div>
                    <div className="admin-order-customer-grid__wide"><dt>العنوان بالتفصيل</dt><dd>{customer.address || "غير متاح"}</dd></div>
                    <div><dt>طريقة الدفع</dt><dd>{customer.paymentMethod === "instapay" ? "InstaPay" : "كاش عند الاستلام"}</dd></div>
                    {customer.notes && <div className="admin-order-customer-grid__wide"><dt>ملاحظات العميل</dt><dd>{customer.notes}</dd></div>}
                  </dl>
                  <div className="admin-order-contact-actions">
                    {customer.phone && <a href={"tel:" + customer.phone}>اتصال بالعميل</a>}
                    {whatsappNumber && <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer">مراسلة واتساب</a>}
                  </div>
                </section>
              </div>}
              <label className="admin-order-status"><span>حالة الطلب</span><select value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value)} disabled={updatingOrderId === order.id}>{orderStatusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>{updatingOrderId === order.id && <small>جارٍ الحفظ...</small>}</label>
            </article>;
          })}</div> : <div className="admin-list-empty"><span className="admin-list-empty__icon"><BrandMark /></span><h3>مفيش طلبات لسه</h3><p>الطلبات هتظهر هنا بعد تسجيلها من سلة المتجر.</p></div>}
        </section>

        <section className="admin-panel admin-category-panel">
          <div className="admin-panel__heading"><div><small>أقسام المتجر</small><h2>إضافة وتعديل الأقسام</h2></div><span className="admin-panel__step">05</span></div>
          <form className="admin-category-form" onSubmit={saveCategory}>
            <label className="admin-field"><span>{editingCategory ? "اسم القسم" : "اسم القسم الجديد"}</span><input value={categoryTitle} onChange={(event) => setCategoryTitle(event.target.value)} placeholder="مثال: مجسمات أنمي" maxLength="60" required /></label>
            <div className="admin-category-form__actions"><button className="admin-submit" type="submit" disabled={categorySaving}>{categorySaving ? "جارٍ الحفظ..." : editingCategory ? "حفظ اسم القسم" : "إضافة القسم"}</button>{editingCategory && <button className="admin-cancel" type="button" onClick={cancelCategoryEdit}>إلغاء</button>}</div>
          </form>
          {categoryNotice.message && <p className={"admin-notice admin-notice--" + categoryNotice.type} role="status">{categoryNotice.message}</p>}
          <div className="admin-category-list">{categories.map((category) => {
            const categoryProducts = products.filter((product) => product.category === category.title).length;
            return <article className="admin-category-row" key={category.id}>
              <div><h3>{category.title}</h3><small>{categoryProducts} منتج</small>{categoryProducts > 0 && <small className="admin-category-row__hint">انقل المنتجات قبل حذف القسم</small>}</div>
              <div className="admin-category-row__actions"><button className="admin-edit-button" type="button" onClick={() => beginEditCategory(category)} disabled={Boolean(deletingCategoryId)}>تعديل</button><button className="admin-delete-button" type="button" onClick={() => deleteCategory(category)} disabled={Boolean(deletingCategoryId) || categoryProducts > 0}>{deletingCategoryId === category.id ? "جارٍ الحذف..." : "حذف"}</button></div>
            </article>;
          })}</div>
        </section>

        <section className="admin-panel admin-storefront-panel">
          <div className="admin-panel__heading"><div><small>محتوى المتجر</small><h2>تعديل عنوان ووصف قسم المنتجات</h2></div><span className="admin-panel__step">03</span></div>
          <form className="admin-storefront-form" onSubmit={saveStorefrontContent}>
            <label className="admin-field"><span>السطر الأول من العنوان</span><input name="titlePrimary" value={storefrontContent.titlePrimary} onChange={updateStorefrontField} maxLength="80" required /></label>
            <label className="admin-field"><span>السطر المميز</span><input name="titleAccent" value={storefrontContent.titleAccent} onChange={updateStorefrontField} maxLength="80" required /></label>
            <label className="admin-field admin-storefront-description"><span>وصف القسم</span><textarea name="description" value={storefrontContent.description} onChange={updateStorefrontField} rows="3" maxLength="300" required /></label>
            {contentNotice.message && <p className={"admin-notice admin-notice--" + contentNotice.type} role="status">{contentNotice.message}</p>}
            <button className="admin-submit admin-storefront-save" type="submit" disabled={contentSaving}>{contentSaving ? "جارٍ الحفظ..." : "حفظ نص القسم"}</button>
          </form>
        </section>

        <div className="admin-layout">
          <section className="admin-panel admin-form-panel">
            <div className="admin-panel__heading"><div><small>{editingProduct ? "تعديل منتج" : "منتج جديد"}</small><h2>{editingProduct ? "عدّل تفاصيل المنتج" : "أضف منتجًا للمتجر"}</h2></div><span className="admin-panel__step">01</span></div>
            <form className="admin-form" onSubmit={submitProduct}>
              <label className="admin-field"><span>اسم المنتج</span><input name="name" value={form.name} onChange={updateField} placeholder="مثال: مجسم زهرة هندسي" required maxLength="100" /></label>
              <label className="admin-field"><span>القسم</span><select name="category" value={form.category} onChange={updateField} required><option value="" disabled>اختار القسم</option>{form.category && !categories.some((category) => category.title === form.category) && <option value={form.category}>{form.category}</option>}{categories.map((category) => <option key={category.id} value={category.title}>{category.title}</option>)}</select></label>
              <label className="admin-field"><span>وصف المنتج</span><textarea name="description" value={form.description} onChange={updateField} placeholder="اكتب وصفًا قصيرًا للمنتج" rows="4" maxLength="800" /></label>
              <label className="admin-field"><span>السعر بالجنيه المصري <small>اختياري، وإلا يظهر السعر عند التواصل</small></span><div className="admin-price-input"><input name="priceEgp" type="number" min="0" step="1" value={form.priceEgp} onChange={updateField} placeholder="اختياري" /><b>ج.م</b></div></label>
              <label className="admin-field"><span>صورة المنتج <small>JPG أو PNG أو WEBP، بحد أقصى 8 م.ب</small></span><input className="admin-file-input" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={selectImage} /><span className="admin-upload">{imageFile ? imageFile.name : imagePreview ? "تغيير الصورة" : "اختر صورة من جهازك"}</span></label>
              {imagePreview && <div className="admin-image-preview"><img src={imagePreview} alt="معاينة صورة المنتج" /></div>}
              {notice.message && <p className={"admin-notice admin-notice--" + notice.type} role="status">{notice.message}</p>}
              <div className="admin-form__actions"><button className="admin-submit" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : editingProduct ? "حفظ التعديلات" : "إضافة المنتج"}</button>{editingProduct && <button className="admin-cancel" type="button" onClick={resetForm}>إلغاء التعديل</button>}</div>
            </form>
          </section>

          <section className="admin-panel admin-products-panel">
            <div className="admin-panel__heading"><div><small>كتالوج طيّة</small><h2>المنتجات المضافة <span>{products.length}</span></h2></div><span className="admin-panel__step">02</span></div>
            {loadError && <p className="admin-notice admin-notice--error">{loadError}</p>}
            {loading ? <p className="admin-list-empty">جارٍ تحميل المنتجات...</p> : products.length ? <div className="admin-products-list">{products.map((product) => <article className="admin-product-row" key={product.id}>
              <div className="admin-product-row__image">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span><BrandMark /></span>}</div>
              <div className="admin-product-row__details"><small>{product.category}</small><h3>{product.name}</h3><strong>{Number.isFinite(product.priceEgp) ? formatEgp(product.priceEgp) : "السعر عند التواصل"}</strong></div>
              <div className="admin-product-row__actions"><button className="admin-edit-button" type="button" onClick={() => beginEdit(product)} disabled={Boolean(deletingId)}>تعديل</button><button className="admin-delete-button" type="button" onClick={() => deleteProduct(product)} disabled={Boolean(deletingId)} aria-label={"حذف " + product.name}>{deletingId === product.id ? "جارٍ الحذف" : "حذف"}</button></div>
            </article>)}</div> : <div className="admin-list-empty"><span className="admin-list-empty__icon"><BrandMark /></span><h3>لسه مفيش منتجات</h3><p>أول منتج تضيفه هيظهر هنا وفي قسم المنتجات بالمتجر.</p></div>}
          </section>
        </div>
      </div>
    </main>
  );
}

export default AdminPage;


