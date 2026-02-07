// === 固定設定 ===
const SPREADSHEET_ID = "1dey0fNMLc2MvYeWViPeyMwqQ8xtaPaeQFJi29StYYEA";
const SHEET_NAME = "工作表1"; // 如果你的表不是這個名字，改這行
const TOKEN = "FEISTORE_SHOPEE_EXPORT_V1_9fA3kQ7LxP2M6dR8WbZC";

// === 接收 Extension 資料 ===
function doPost(e) {
    try {
        const body = JSON.parse(e.postData?.contents || "{}");

        if (body.token !== TOKEN) {
            return json_({ ok: false, error: "Unauthorized" });
        }

        const row = body.row || {};
        const sheet = SpreadsheetApp
            .openById(SPREADSHEET_ID)
            .getSheetByName(SHEET_NAME);

        if (!sheet) {
            return json_({ ok: false, error: "找不到工作表：" + SHEET_NAME });
        }

        // === 檢查重複訂單編號 ===
        // 訂單編號現在位於 Z 欄 (第 26 欄)
        const orderId = String(row.orderId || "").trim();

        if (orderId) {
            const lastRow = sheet.getLastRow();

            // 如果有資料（不只標題列）
            if (lastRow > 1) {
                // 檢查 Z 欄 (Column 26) 是否有重複
                const orderIds = sheet.getRange(2, 26, lastRow - 1, 1).getValues();

                // 檢查是否已存在
                for (let i = 0; i < orderIds.length; i++) {
                    const existingId = String(orderIds[i][0] || "").trim();

                    if (existingId && existingId === orderId) {
                        return json_({
                            ok: false,
                            error: `訂單編號 ${orderId} 已存在，不重複寫入`
                        });
                    }
                }
            }
        }

        // === 寫入資料 ===
        // 加上單引號 ' 強制轉為文字，避免 Google Sheet 自動改成科學記號
        const safeCode = row.packageCode ? `'${row.packageCode}` : "";

        // 處理進帳金額，轉為純數字 (移除 NT$, 逗號等)
        let incomeValue = row.estimatedIncome || "";
        if (typeof incomeValue === "string") {
            incomeValue = incomeValue.replace(/[^\d.-]/g, ""); // 只保留數字、點、負號
            incomeValue = parseFloat(incomeValue) || 0;
        }

        // 建立一個長度為 28 的陣列 (A 到 AB)
        let dataRow = new Array(28).fill("");

        dataRow[0] = new Date();                  // A 擷取時間
        dataRow[3] = row.buyerName || "";         // D 收件人
        dataRow[4] = row.address || "";           // E 地址
        dataRow[5] = safeCode;                    // F 包裹查詢碼
        dataRow[8] = row.productInfo || "";       // I 商品資訊
        dataRow[10] = "蝦皮付";                     // K 固定值
        dataRow[12] = incomeValue;                 // M 預估訂單進帳 (純數字)
        dataRow[17] = "蝦皮拍賣";                   // R 固定值
        dataRow[25] = orderId;                     // Z 訂單編號
        dataRow[27] = row.zipCode || "";           // AB 郵遞區號

        sheet.appendRow(dataRow);

        return json_({ ok: true, message: "寫入成功" });
    } catch (err) {
        return json_({ ok: false, error: String(err) });
    }
}

function json_(obj) {
    return ContentService
        .createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}
