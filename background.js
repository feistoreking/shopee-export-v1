// === 固定設定 ===
const GAS_URL = "https://script.google.com/a/macros/feistore.com.tw/s/AKfycbyPo3cfKEuYOfjNHmjylWZzKFcqzru5qv6FGwt26Q-UGURhx1ulZP06-0UbzAyJc0LW/exec";
const TOKEN = "FEISTORE_SHOPEE_EXPORT_V1_9fA3kQ7LxP2M6dR8WbZC";

async function postToGAS(payload) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: TOKEN, ...payload })
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
