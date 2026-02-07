// ===== 共用工具 =====
function findByText(tagList, text) {
    const nodes = [];
    tagList.forEach(t => nodes.push(...document.querySelectorAll(t)));
    return nodes.find(el => el.textContent?.trim() === text) || null;
}

function findFirstMatch(regex) {
    const nodes = document.querySelectorAll("div, span, p");
    for (const el of nodes) {
        const t = (el.textContent || "").trim();
        if (regex.test(t)) return { el, text: t };
    }
    return null;
}

// ===== 訂單編號 =====
function getOrderId() {
    const label = findByText(["div", "span"], "訂單編號");
    if (!label) return "";

    const container = label.parentElement || label;
    const text = (container.innerText || "").trim();

    // 嘗試從文字中提取 (排除 "訂單編號" 字樣)
    const lines = text.split('\n').map(l => l.trim()).filter(l => l && l !== "訂單編號");

    for (const t of lines) {
        if (/^[A-Z0-9]{8,}$/.test(t)) return t;
    }

    // Fallback: search globally if not found in container
    const any = findFirstMatch(/\b[A-Z0-9]{8,}\b/);
    return any?.text?.match(/\b[A-Z0-9]{8,}\b/)?.[0] || "";
}

// ===== 收件人地址 =====
function getReceiverInfo() {
    const label = findByText(["div", "span"], "買家收件地址");
    if (!label) return { name: "", address: "" };

    const container = label.parentElement || label;

    // 使用 innerText 避免隱藏元素和重複子元素內容
    const text = (container.innerText || "").trim();
    const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.includes("買家收件地址") && !l.includes("複製") && !l.includes("變更")); // 過濾掉標籤和按鈕文字

    // 假設格式：第一行是姓名，後續是地址
    // 如果 lines 包含大量無關資訊（如 Modal 內容），則需要更嚴格過濾
    // 透過過濾掉長度過長的無效行（例如包含 "方法" 或 "QRCode" 的說明文字）
    const validLines = lines.filter(l => !l.includes("方法") && !l.includes("QRCode") && !l.includes("蝦皮專線"));

    return {
        name: validLines[0] || "",
        address: validLines.slice(1).join(" ") || ""
    };
}

// ===== 商品資訊 =====
function getProductInfo() {
    // 尋找「進帳資訊」或「商品」區域
    const bodyText = document.body.innerText;
    const products = [];

    // 策略：尋找所有包含「規格:」的行，往前找商品名稱
    const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 找到規格行
        if (line.startsWith("規格:") || line.startsWith("無版本:")) {
            const spec = line.replace("規格:", "").replace("無版本:", "").trim();

            // 往前找商品名稱（通常在規格的前1-3行）
            let productName = "";
            for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                const prevLine = lines[j];

                // 跳過數字、價格、標題等
                if (prevLine.match(/^\d+$/) ||
                    prevLine.includes("NT$") ||
                    prevLine === "商品" ||
                    prevLine === "單價" ||
                    prevLine === "數量" ||
                    prevLine === "小計" ||
                    prevLine.includes("編號")) {
                    continue;
                }

                // 找到可能的商品名稱（長度大於3且不是純數字）
                if (prevLine.length > 3 && !prevLine.match(/^\d+$/)) {
                    productName = prevLine;
                    break;
                }
            }

            if (productName && spec) {
                products.push(`${productName} (${spec})`);
            } else if (productName) {
                products.push(productName);
            }
        }
    }

    // 如果沒找到任何商品，嘗試另一種方式
    if (products.length === 0) {
        // 尋找「賣家備貨」標籤後的商品
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("賣家備貨") && i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                if (nextLine.length > 5 && !nextLine.includes("NT$")) {
                    products.push(nextLine);
                }
            }
        }
    }

    return products.join("; ") || "";
}

// ===== 預估訂單進帳 =====
function getEstimatedIncome() {
    const bodyText = document.body.innerText;

    // 策略 1: 尋找「預估訂單進帳」後面的金額
    const lines = bodyText.split('\n').map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 找到「預估訂單進帳」這一行
        if (line.includes("預估訂單進帳")) {
            // 檢查同一行是否包含金額
            const sameLineMatch = line.match(/NT\$[\d,]+/);
            if (sameLineMatch) {
                return sameLineMatch[0];
            }

            // 檢查下一行
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                const nextLineMatch = nextLine.match(/NT\$[\d,]+/);
                if (nextLineMatch) {
                    return nextLineMatch[0];
                }
            }
        }
    }

    // 策略 2: 直接搜尋整個頁面中最後出現的紅色大金額（通常是預估進帳）
    // 尋找所有 NT$ 開頭的金額，取最後一個
    const allMatches = bodyText.match(/NT\$[\d,]+/g);
    if (allMatches && allMatches.length > 0) {
        // 通常預估訂單進帳是最後一個大金額
        return allMatches[allMatches.length - 1];
    }

    return "";
}

// ===== 聯絡買家 -> 包裹查詢碼 / 電話 =====
function openContactBuyer() {
    // 優先使用 data-testid (這是最穩定的方式)
    const btnTestId = document.querySelector('[data-testid="bt-buyer-contact"]');
    if (btnTestId) {
        btnTestId.click();
        return true;
    }

    // 次要：使用文字 (注意繁體中文差異：聯絡 vs 聯繫)
    const btn = findByText(["button", "div"], "聯絡買家") || findByText(["button", "div"], "聯繫買家");
    if (btn) {
        btn.click();
        return true;
    }
    return false;
}

/**
 * 等待包裹查詢碼與完整電話 (含分機)
 * 改用輪詢 (setInterval) 機制，避免 MutationObserver + innerText 造成長時間的 Layout Thrashing
 * 超時：10秒 (增加時間)
 * @returns {Promise<{code: string, phone: string}>}
 */
function waitForPackageInfo(timeout = 10000) {
    return new Promise((resolve, reject) => {
        let timerId = null;
        const intervalMs = 500; // 每 0.5 秒檢查一次
        const maxChecks = timeout / intervalMs;
        let checks = 0;

        const tryFind = () => {
            const bodyText = document.body.innerText;
            // 除錯：只印出前 100 個字確認有抓到新內容 (避免洗版)
            if (checks % 4 === 0) { // 每 2 秒印一次
                console.log(`[Extension] Scanning text... (Length: ${bodyText.length})`);
            }

            let code = "";
            let phone = "";

            // 策略 1: 直接找完整物流號碼 "09xxxxxxxx,xxxxxxxx#x" (最精準)
            // 修改正則：允許逗號前後有空白，允許#號前後有空白
            // 例如: "0928000888 , 12857597 # 1"
            const fullPhoneMatch = bodyText.match(/(09\d{8})\s*[,，]\s*(\d+)(\s*[#＃]\s*\d+)?/);
            if (fullPhoneMatch) {
                // fullPhoneMatch[0] 是整個匹配字串 (含空白)
                // 我們可以重組乾淨的字串，或者直接用原始字串
                // 這裡重組一下比較保險:
                const p = fullPhoneMatch[1]; // 09...
                const c = fullPhoneMatch[2]; // 12...
                const ext = fullPhoneMatch[3] ? fullPhoneMatch[3].replace(/\s/g, '') : ""; // #1

                code = `${p},${c}${ext}`; // 乾淨格式
                phone = code;

                console.log("[Extension] Found full logistics string:", code);
                return { code, phone };
            }

            // 策略 2: 找 "包裹查詢碼: xxxxxxxx"
            // 允許冒號前後空白
            const codeMatch = bodyText.match(/包裹查詢碼\s*[:：]\s*(\d+)/);
            if (codeMatch) {
                code = codeMatch[1];
            }

            // 策略 3: 找 "輸入包裹查詢碼: xxxxxxxx" (特定情境)
            const inputCodeMatch = bodyText.match(/輸入包裹查詢碼\s*[:：]\s*(\d+)/);
            if (inputCodeMatch) {
                code = inputCodeMatch[1];
            }

            // 策略 4: 找這頁面上任何看起來像電話的字串 (09xxxxxxxx)
            const simplePhoneMatch = bodyText.match(/09\d{8}/);
            if (simplePhoneMatch) {
                phone = simplePhoneMatch[0];
            }

            // 只要抓到代碼就算成功
            if (code) {
                console.log("[Extension] Found code:", code);
                return { code, phone };
            }
            return null;
        };

        // 啟動輪詢
        timerId = setInterval(() => {
            checks++;
            const result = tryFind();

            if (result) {
                clearInterval(timerId);
                resolve(result);
                return;
            }

            if (checks >= maxChecks) {
                clearInterval(timerId);
                // 失敗時，印出最後一次看到的 bodyText 片段以供除錯
                console.error("[Extension] Timeout! Last body text snippet:", document.body.innerText.substring(0, 500));
                reject(new Error("找不到包裹查詢碼 (等待逾時)"));
            }
        }, intervalMs);

        // 立即嘗試一次
        const immediate = tryFind();
        if (immediate) {
            clearInterval(timerId);
            resolve(immediate);
        }
    });
}

function closeContactModal() {
    // 嘗試多種關閉按鈕特徵
    const x = [...document.querySelectorAll("button, span, div, i, svg")]
        .find(el => {
            const t = (el.textContent || "").trim();
            const label = el.getAttribute("aria-label");
            // 檢查文字內容為 "×" 或 aria-label 為 "close"/"關閉"
            // 額外檢查父層是否包含這些特徵 (有些按鈕內部包了 svg)
            return t === "×" || label === "close" || label === "關閉" || label === "Close";
        });

    if (x) {
        x.click();
    } else {
        // 嘗試點擊右上角的 svg close icon wrapper (shopee 常見)
        // 尋找 class 為 "shopee-modal__close" 或是含 "close" 類名的元素
        const closeBtn = document.querySelector('.shopee-modal__close, [class*="modal__close"], [class*="close-btn"]');
        closeBtn?.click();
    }
}

async function getPackageInfo() {
    const opened = openContactBuyer();
    if (!opened) {
        console.warn("[Extension] 無法開啟「聯絡買家」視窗");
        return { code: "", phone: "" };
    }

    try {
        const info = await waitForPackageInfo();
        // 成功後延遲一點點再關閉，確保不是因為太快導致錯判
        await new Promise(r => setTimeout(r, 100));
        closeContactModal();
        return info;
    } catch (e) {
        console.error("[Extension] Get Package Info Error:", e);
        closeContactModal(); // 確保失敗後也要關閉
        return { code: "", phone: "" };
    }
}

// ===== 主流程 =====
async function extractV1() {
    // 確保 Modal 關閉，避免抓到舊資料
    closeContactModal();
    await new Promise(r => setTimeout(r, 100));

    const orderId = getOrderId();
    const { name, address } = getReceiverInfo();
    const productInfo = getProductInfo();
    const estimatedIncome = getEstimatedIncome();

    // 取得包裹資訊
    let packageCode = "";
    let phone = "";

    try {
        const info = await getPackageInfo();
        packageCode = info.code;
        phone = info.phone;
    } catch (e) {
        console.error("Get Package Info Error:", e);
    }

    // 將所有資料傳回給 GAS
    return {
        orderId,
        buyerName: name,
        address,
        packageCode,
        phone,
        productInfo,
        estimatedIncome,
        pageUrl: location.href
    };
}

// ===== 注入按鈕 =====
function injectButton() {
    if (document.getElementById("shopee-export-v1-btn")) return;

    const btn = document.createElement("button");
    btn.id = "shopee-export-v1-btn";
    btn.textContent = "一鍵寫入（包裹查詢碼）";
    btn.style.cssText = `
    position: fixed;
    right: 18px;
    bottom: 18px;
    z-index: 999999;
    padding: 12px 14px;
    border-radius: 12px;
    border: 0;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 6px 20px rgba(0,0,0,.18);
    background: #111;
    color: #fff;
  `;

    btn.onclick = async () => {
        btn.disabled = true;
        const old = btn.textContent;
        btn.textContent = "寫入中…";

        try {
            const row = await extractV1();
            // 將 row 傳給 background -> GAS
            const resp = await chrome.runtime.sendMessage({ type: "EXPORT_V1", row });
            if (!resp?.ok) throw new Error(resp?.error || "寫入失敗");
            btn.textContent = "✅ 已寫入";
            setTimeout(() => (btn.textContent = old), 1500);
        } catch (e) {
            alert(e.message || e);
            btn.textContent = old;
        } finally {
            btn.disabled = false;
        }
    };

    document.body.appendChild(btn);
}

injectButton();
setInterval(injectButton, 1500);
