const telegramApi = "https://api.telegram.org";

async function sendTelegramNotification(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${telegramApi}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: String(text).slice(0, 4000) }),
      signal: controller.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error("Telegram notification was rejected.");
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

async function notifyTelegramSafely(text) {
  try {
    const message = typeof text === "function" ? text() : text;
    return await sendTelegramNotification(message);
  } catch {
    // Do not include the request URL or error object: either could expose the bot token.
    console.error("Telegram notification failed; the saved request remains available in the admin page.");
    return false;
  }
}

function formatEgyptDate(isoDate) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(isoDate));
}

function orderNotification(order) {
  const customer = order.customer || {};
  const lines = [
    "🛍️ طلب جديد من طيّة",
    `رقم الطلب: ${order.id.slice(0, 8).toUpperCase()}`,
    `التاريخ: ${formatEgyptDate(order.createdAt)}`,
    "",
    ...order.items.map((item) => `• ${item.name} × ${item.quantity} — ${item.unitPriceEgp * item.quantity} ج.م`),
    "",
    `الإجمالي قبل الشحن: ${order.totalEgp} ج.م`,
    "الاسم: " + (customer.name || "—"),
    "الموبايل: " + (customer.phone || "—"),
    "العنوان: " + [customer.governorate, customer.city, customer.address].filter(Boolean).join("، "),
    "طريقة الدفع المختارة: " + (customer.paymentMethod === "instapay" ? "InstaPay" : "كاش عند الاستلام"),
    customer.notes ? "ملاحظات التوصيل: " + customer.notes : "",
  ];
  return lines.filter(Boolean).join("\n");
}

function quoteNotification(record) {
  return [
    "🧩 طلب طباعة مخصصة جديد",
    `رقم الطلب: ${record.id.slice(0, 8).toUpperCase()}`,
    `التاريخ: ${formatEgyptDate(record.createdAt)}`,
    `الاسم: ${record.name}`,
    `رقم التواصل: ${record.phone}`,
    `الملف: ${record.originalFileName}`,
    `الخامة واللون: ${record.material} — ${record.color}`,
    `الحشو ودقة الطبقة: ${record.infill}% — ${record.layerHeight} مم`,
    `الوزن التقريبي: ${record.estimate.estimatedWeightGrams} جرام`,
    `السعر التقديري: ${record.estimate.totalEgp} ج.م`,
    `الأبعاد: ${record.dimensionsMm || "غير محددة"}`,
    record.notes ? `ملاحظات: ${record.notes}` : "",
    "الملف محفوظ في الطلبات للمراجعة؛ لم يتم إرفاقه برسالة تيليجرام.",
  ].filter(Boolean).join("\n");
}

module.exports = {
  notifyTelegramSafely,
  orderNotification,
  quoteNotification,
};

