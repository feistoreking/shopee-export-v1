// === 固定設定 ===
const GAS_URL = "https://script.google.com/a/macros/feistore.com.tw/s/AKfycbw8J0xtK3qZYCvQRmITymej7ld-OEW059vGELaaVqYxhIiB1mhM4dW5aMDs6DMO0hc/exec";
// 請改成你自己的 Token（不要把真實 Token 提交到 Git）
const DEFAULT_TOKEN = "FEISTORE_V1_20260207_GW9mQ3xL7kN2pR5t";

async function getToken() {
  const { gasToken } = await chrome.storage.local.get("gasToken");
  const token = (gasToken || DEFAULT_TOKEN || "").trim();
  if (!token || token === "REPLACE_WITH_YOUR_STRONG_TOKEN") {
    throw new Error("請先設定 GAS Token（background.js 的 DEFAULT_TOKEN 或 chrome.storage.local.gasToken）");
  }
  return token;
}

async function postToGAS(payload) {
  const token = await getToken();
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...payload })
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`GAS 回應錯誤：${res.status} ${text}`);

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "EXPORT_V1") {
        const result = await postToGAS({ row: msg.row });
        sendResponse({ ok: true, result });
        return;
      }
      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  return true;
});
