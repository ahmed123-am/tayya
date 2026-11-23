const fs = require("node:fs");
const path = require("node:path");

const envPath = path.join(__dirname, ".env");

function readBotToken() {
  if (process.env.TELEGRAM_BOT_TOKEN?.trim()) return process.env.TELEGRAM_BOT_TOKEN.trim();
  if (!fs.existsSync(envPath)) return "";

  const line = fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .find((entry) => /^\s*TELEGRAM_BOT_TOKEN\s*=/.test(entry));
  if (!line) return "";

  const value = line.slice(line.indexOf("=") + 1).trim();
  return value.replace(/^(["'])(.*)\1$/, "$2");
}

function saveChatId(chatId) {
  let contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const setting = `TELEGRAM_CHAT_ID=${chatId}`;
  if (/^[ \t]*TELEGRAM_CHAT_ID[ \t]*=.*$/m.test(contents)) {
    contents = contents.replace(/^[ \t]*TELEGRAM_CHAT_ID[ \t]*=.*$/m, setting);
  } else {
    contents = `${contents}${contents && !contents.endsWith("\n") ? "\n" : ""}${setting}\n`;
  }
  fs.writeFileSync(envPath, contents, "utf8");
}

async function main() {
  const token = readBotToken();
  if (!token) {
    console.error("أضف TELEGRAM_BOT_TOKEN إلى server/.env ثم شغّل الأمر مرة أخرى.");
    process.exitCode = 1;
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let response;
  let body;
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      signal: controller.signal,
    });
    body = await response.json();
  } catch {
    console.error("تعذر الاتصال بتيليجرام. راجع اتصال الإنترنت وحاول مرة أخرى.");
    process.exitCode = 1;
    return;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok || !body?.ok) {
    const description = String(body?.description || "").toLowerCase();
    console.error(
      description.includes("webhook")
        ? "البوت يستخدم Webhook حاليًا؛ أوقفه أو استخرج Chat ID عبر الطريقة المرتبطة به."
        : "تيليجرام رفض الطلب. تأكد من صحة TELEGRAM_BOT_TOKEN وأعد المحاولة.",
    );
    process.exitCode = 1;
    return;
  }

  const chats = new Map();
  for (const update of body.result || []) {
    const message = update.message || update.edited_message || update.channel_post || update.edited_channel_post;
    const chat = message?.chat;
    if (chat?.type === "private" && chat.id !== undefined) {
      chats.set(String(chat.id), chat);
    }
  }

  if (chats.size === 0) {
    console.log("لم أجد محادثة خاصة مع البوت بعد. افتح البوت في تيليجرام واضغط Start أو أرسل /start، ثم أعد تشغيل الأمر.");
    return;
  }

  if (chats.size > 1) {
    console.log("وجدت أكثر من محادثة خاصة. اختار Chat ID الخاص بحسابك وأضفه يدويًا إلى server/.env:");
    for (const [chatId, chat] of chats) {
      console.log(`Chat ID: ${chatId}${chat.username ? ` (@${chat.username})` : ""}`);
    }
    return;
  }

  const [chatId] = chats.keys();
  saveChatId(chatId);
  console.log(`تم حفظ TELEGRAM_CHAT_ID=${chatId} في server/.env`);
  console.log("انسخ قيمة Chat ID إلى متغير TELEGRAM_CHAT_ID في مشروع server على Vercel.");
}

main().catch(() => {
  console.error("تعذر استخراج Chat ID. أعد المحاولة أو راجع إعدادات البوت.");
  process.exitCode = 1;
});

