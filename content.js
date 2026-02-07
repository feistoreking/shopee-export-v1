// ===== 共用工具 =====
function findByText(tagList, text) {
    const nodes = [];
    tagList.forEach(t => nodes.push(...document.querySelectorAll(t)));
    return nodes.find(el => el.textContent?.trim() === text) || null;
}

function pickOrderIdFromText(text) {
    if (!text) return "";
    const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.includes("訂單編號") && !l.includes("複製"));

    for (const line of lines) {
        const matches = line.match(/[A-Z0-9-]{8,30}/g) || [];
        for (const candidate of matches) {
            const normalized = candidate.replace(/-/g, "");
            const hasDigit = /\d/.test(normalized);
            const hasLetter = /[A-Z]/.test(normalized);
            if (normalized.length >= 8 && hasDigit && (hasLetter || normalized.length >= 12)) {
                return normalized;
            }
        }
    }
    return "";
}

// ===== 訂單編號 =====
function getOrderId() {
    const label = findByText(["div", "span"], "訂單編號");
    if (!label) return "";

    // 僅在「訂單編號」附近區塊尋找，避免誤抓頁面其他代碼
    const candidates = [];
    const parent = label.parentElement;
    if (parent) {
        candidates.push(parent.innerText || "");
        if (parent.nextElementSibling) {
            candidates.push(parent.nextElementSibling.innerText || "");
        }
        if (parent.parentElement && parent.parentElement.nextElementSibling) {
            candidates.push(parent.parentElement.nextElementSibling.innerText || "");
        }
    }

    for (const text of candidates) {
        const id = pickOrderIdFromText(text);
        if (id) return id;
    }

    return "";
}

// ===== 收件人地址 =====
function getReceiverInfo() {
    const label = findByText(["div", "span"], "買家收件地址");
    if (!label) return { name: "", address: "", zipCode: "" };

    const container = label.parentElement || label;

    // 使用 innerText 避免隱藏元素和重複子元素內容
    const text = (container.innerText || "").trim();
    const lines = text.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.includes("買家收件地址") && !l.includes("複製") && !l.includes("變更"));

    const validLines = lines.filter(l => !l.includes("方法") && !l.includes("QRCode") && !l.includes("蝦皮專線"));

    let name = validLines[0] || "";
    let fullAddress = validLines.slice(1).join(" ") || "";

    // 1. 清理姓名 (移除結尾的逗號)
    name = name.replace(/[,，]$/, "").trim();

    // 2. 清理地址 (過濾「聯繫買家」與「聯絡買家」)
    fullAddress = fullAddress.replace(/聯[絡繫]買家/g, "").trim();

    // 3. 擷取郵遞區號 (地址開頭的數字)
    let zipCode = "";
    const zipMatch = fullAddress.match(/^\d+/);
    if (zipMatch) {
        zipCode = zipMatch[0];
        // 從地址中移除郵遞區號部分
        fullAddress = fullAddress.replace(/^\d+/, "").trim();
    }

    return {
        name,
        address: fullAddress,
        zipCode
    };
}

// ===== 商品資訊 =====
function getProductInfo() {
    const products = [];
    let productImageUrl = "";

    // 找出所有可能的商品行
    // 在蝦皮訂單頁面，商品通常位於特定的 div 結構中
    // 我們尋找包含數字 (編號) 的元素，然後往後尋找商品名稱與圖片
    const allDivs = Array.from(document.querySelectorAll('div, span')).filter(el => {
        const text = el.textContent?.trim();
        return /^\d+$/.test(text) && text.length <= 2; // 尋找 1, 2, 3...
    });

    let currentItemNumber = 1;

    for (const numberEl of allDivs) {
        if (numberEl.textContent?.trim() !== String(currentItemNumber)) continue;

        // 往父層找，直到找到包含該商品所有資訊的大容器
        let container = numberEl.parentElement;
        while (container && container.innerText.length < 50 && container.parentElement) {
            container = container.parentElement;
        }

        if (!container) continue;

        // 優化圖片選擇邏輯：找出所有圖片並篩選出看起來像「商品主圖」的
        const imgs = Array.from(container.querySelectorAll('img'));
        const productImg = imgs.find(img => {
            const src = img.src || "";
            // 篩選條件：包含 shopee 網址，且排除太小的圖示 (通常寬度 > 40)
            const isShopeeImg = src.includes('shopee') || src.includes('f.shopee');
            const isNotIcon = img.width > 40 || img.naturalWidth > 40 || !src.includes('icon');
            return isShopeeImg && isNotIcon;
        });

        const imgSrc = productImg ? productImg.src : (imgs[0] ? imgs[0].src : "");
        if (!productImageUrl && imgSrc) productImageUrl = imgSrc;

        // 擷取名稱與規格 (沿用文字分析邏輯，但在容器內找更精準)
        const containerLines = container.innerText.split('\n').map(l => l.trim()).filter(Boolean);
        let productName = "";
        let spec = "";
        let quantity = "1";

        for (let i = 0; i < containerLines.length; i++) {
            const line = containerLines[i];
            if (line === String(currentItemNumber) || line.includes("圖片") || line.includes("賣家備貨")) continue;

            if (line.startsWith("規格:") || line.startsWith("無版本:")) {
                spec = line.replace("規格:", "").replace("無版本:", "").trim();
                continue;
            }

            if (!productName && line.length > 5 && !line.includes("NT$")) {
                productName = line;
                continue;
            }

            const qtyByLabel = line.match(/數量\s*[:：]?\s*(\d+)/);
            if (qtyByLabel) {
                quantity = qtyByLabel[1];
                continue;
            }

            const qtyByX = line.match(/[xX×]\s*(\d+)\b/);
            if (qtyByX) {
                quantity = qtyByX[1];
                continue;
            }

            const qtyByUnit = line.match(/^(\d+)\s*件$/);
            if (qtyByUnit) {
                quantity = qtyByUnit[1];
            }
        }

        if (productName) {
            let fullInfo = productName;
            if (spec) fullInfo += ` (${spec})`;
            fullInfo += ` X${quantity}`;
            products.push(fullInfo);
            currentItemNumber++;
        }
    }

    console.log("[Extension] Found products summary:", products);
    console.log("[Extension] Main product image URL (Optimized):", productImageUrl);

    return {
        text: products.join("; \n") || "",
        imageUrl: productImageUrl
    };
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
    const { name, address, zipCode } = getReceiverInfo();
    const { text: productInfo, imageUrl: productImageUrl } = getProductInfo();
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
        zipCode,
        packageCode,
        phone,
        productInfo,
        productImageUrl,
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
