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
        const orderId = String(row.orderId || "").trim(); // 轉為字串並去除空白

        if (orderId) {
            const lastRow = sheet.getLastRow();

            // 如果有資料（不只標題列）
            if (lastRow > 1) {
                const orderIds = sheet.getRange(2, 2, lastRow - 1, 1).getValues(); // B2:B{lastRow}

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

        sheet.appendRow([
            new Date(),                  // A 擷取時間
            orderId,                     // B 訂單編號（已經 trim 過）
            row.buyerName || "",         // C 收件人
            row.address || "",           // D 地址
            safeCode,                    // E 包裹查詢碼
            row.productInfo || "",       // F 商品資訊
            row.estimatedIncome || "",   // G 預估訂單進帳
            row.pageUrl || ""            // H 訂單連結
        ]);

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
