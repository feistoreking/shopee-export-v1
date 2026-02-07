# Shopee 訂單資料擷取擴充功能

這是一個 Chrome 擴充功能，用於自動擷取蝦皮訂單資料並寫入 Google Sheet。

## 功能特色

- ✅ 自動擷取訂單編號
- ✅ 擷取收件人姓名和地址
- ✅ 擷取完整物流字串（包含電話和分機）
- ✅ 擷取商品資訊（包含規格）
- ✅ 擷取預估訂單進帳金額
- ✅ 自動檢查重複訂單，避免重複寫入
- ✅ 一鍵寫入 Google Sheet

## 安裝方式

1. 下載或 clone 此專案
2. 開啟 Chrome 瀏覽器，前往 `chrome://extensions/`
3. 開啟右上角的「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇此專案的資料夾

## 設定 Google Apps Script

1. 開啟您的 Google Sheet
2. 點擊 **擴充功能** > **Apps Script**
3. 將 `gas_script.js` 的內容貼上
4. 修改以下設定：
   - `SPREADSHEET_ID`: 您的 Google Sheet ID
   - `SHEET_NAME`: 工作表名稱（預設為「工作表1」）
   - `TOKEN`: 自訂的安全 Token（請勿使用預設 `REPLACE_WITH_YOUR_STRONG_TOKEN`）
5. 點擊 **部署** > **新增部署** > **網頁應用程式**
6. 複製 Web App 網址
7. 將網址更新到 `background.js` 的 `GAS_URL` 變數中
8. 在 `background.js` 的 `DEFAULT_TOKEN` 設定相同 Token（或用 `chrome.storage.local.gasToken`）

## 使用方式

1. 前往蝦皮訂單明細頁面
2. 點擊右下角的「一鍵寫入（包裹查詢碼）」按鈕
3. 等待資料擷取完成
4. 成功後會顯示「✅ 已寫入」
5. 前往 Google Sheet 確認資料

## 寫入的欄位

- A: 擷取時間
- D: 收件人
- E: 地址
- F: 包裹查詢碼（完整物流字串）
- I: 商品資訊
- K: 固定值「蝦皮付」
- M: 預估訂單進帳（純數字）
- R: 固定值「蝦皮拍賣」
- Z: 訂單編號
- AB: 郵遞區號

## 檔案說明

- `manifest.json`: Chrome 擴充功能設定檔
- `background.js`: 背景服務，負責與 Google Apps Script 通訊
- `content.js`: 內容腳本，負責擷取網頁資料
- `gas_script.js`: Google Apps Script 程式碼範例

## 注意事項

- 請確保已登入蝦皮帳號
- 請確保網路連線正常
- 如果擷取失敗，請檢查 Console 的錯誤訊息（F12）
- 重複的訂單編號不會被寫入

## 授權

MIT License
