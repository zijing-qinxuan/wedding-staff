# 子靖＆勤萱婚禮工作指南

工作人員指南沿用 GitHub Pages 的靜態入口 `index.html`。管理入口是同一網站的 `/admin/`，需使用已授權的 Google 帳號。完成初次設定後，日常編輯與發布直接在管理頁操作。

## 本機預覽

在專案目錄執行：

```sh
python3 -m http.server 4173
```

接著開啟 `http://127.0.0.1:4173/`。端點尚未設定時會顯示 `data.js` 的公開備用資料。

## 初次設定

你需要一份新建的工作人員專用 Google 試算表、可編輯該試算表的管理 Google 帳號、兩個新建的獨立 Apps Script 專案，以及現有工作人員網站的 HTTPS 網址。專用試算表維持「限制存取」，只分享給管理者及公開版 Apps Script 的部署帳號。請保留 RSVP 原本的帳號、試算表及程式設定。工作人員系統只應填入這次新建的試算表 ID。

1. 建立專用試算表。從網址的 `/d/` 與下一個 `/` 之間取得試算表 ID。將「編輯者」權限授予指定管理人員。若公開版由另一個 Google 帳號部署，只需讓該帳號擁有試算表的瀏覽者權限。
2. 建立管理版 Apps Script 專案。將 `apps-script/admin/Code.gs`、`Schema.gs`、`Editor.html` 複製至專案中的同名檔案。到專案設定開啟 manifest 顯示，貼上同目錄的 `appsscript.json`。
3. 在管理版的「專案設定 › 指令碼屬性」新增三個值。
   - `STAFF_SHEET_ID` 填專用試算表 ID。
   - `STAFF_ADMIN_EMAILS` 填可管理的 Google 帳號完整電子郵件，多筆用逗號分隔。
   - `STAFF_SITE_URL` 填工作人員網站完整 HTTPS 網址，包含儲存庫路徑，例如 `https://zijing-qinxuan.github.io/wedding-staff/`。請以現有 GitHub Pages 設定為準。
4. 將管理版部署為網頁應用程式。「執行身分」選「存取網頁應用程式的使用者」，存取權選允許指定管理帳號登入的 Google 帳戶選項。取得 `https://script.google.com/macros/s/…/exec` 連結。每位管理者首次登入需授權，後端仍會核對白名單。先用指定帳號與另一個不在白名單內的帳號分別測試。
5. 建立公開版 Apps Script 專案，複製 `apps-script/public/` 的 `Code.gs` 與 `appsscript.json`。確認「服務」已有 Google Sheets API，並在指令碼屬性設定同一個 `STAFF_SHEET_ID`。若專案使用自訂 Google Cloud 專案，也要在該 Cloud 專案啟用 Google Sheets API。
6. 將公開版部署為網頁應用程式。「執行身分」選部署者本人，存取權選允許未登入使用者的「任何人」，取得另一個 `/exec` 連結。若組織政策禁止匿名部署，可用允許匿名部署且僅能瀏覽專用表的帳號部署公開版，或先請管理員調整政策。
7. 在本專案的 `site-config.js` 填入公開版的 `publishedUrl` 與管理版的 `adminUrl`，以現有 GitHub Pages 流程上線這次程式變更。兩個網址屬公開設定。帳號白名單與試算表 ID 留在指令碼屬性。
8. 使用下列指令產生初始化檔。檔案會放在儲存庫外。

```sh
node tools/export-seed.cjs > /tmp/wedding-staff-seed.json
```

9. 進入網站的 `/admin/`，登入後選取初始化檔並按「讀取並檢視」。核對預覽，再按「建立草稿」及「發布」。用另一台裝置或無痕視窗開啟工作人員頁，確認有更新時間，並比對 09:30–10:00 首筆流程、大合照清場及隔天取回安排。用公開版 `/exec` 確認只能讀到最新公開資料。

部署選項及 Google 帳號識別方式可參考 [Apps Script 網頁應用程式](https://developers.google.com/apps-script/guides/web)與 [Session 文件](https://developers.google.com/apps-script/reference/base/session)。

## 日常編輯

1. 登入管理頁，按時間、人員或工作內容旁的鉛筆。修改後按「套用修改」，畫面會即時更新。可從「新增／隱藏」找回隱藏項目或新增人員、流程與組別。
2. 按「預覽」查看工作人員所見的版面。確認後按「儲存草稿」。關閉頁面前，工具列會標示是否還有未儲存的修改。
3. 按「發布」核對草稿與伺服器上最新公開版本的中文前後對照，再按「確認發布」。一般頁面開啟時會查詢公開版本，也可用頁首的「重新讀取」更新。

時間欄位可以連結總流程。修改已連結的時間會同時更新相關指南。工作區的「顯示於網站」可以切換公開顯示，也能從補充設定分別控制總流程與分配索引。公開預覽與發布都會排除隱藏項目及私人欄位。私人資訊可放在「進階設定」的「內部備註」。

「進階設定」也可匯出、匯入備份，查閱歷史版本或還原至草稿。匯入資料會先驗證並載入預覽，經儲存及發布才會更新公開網站。版本衝突時可先匯出目前修改，再重新讀取伺服器草稿。完整備份可能含有內部備註，請保存在私人位置。

## 更新既有視覺化管理端

先用既有 GitHub Pages 流程更新公開網站的前端檔案 `index.html`、`public-data.js`、`script.js`、`style.css`。接著在現有管理端 Apps Script 項目替換 `Editor.html` 與 `Code.gs` 並儲存。開啟「部署 → 管理部署作業」，選取目前使用的部署，按鉛筆、選擇新版本並部署。原有管理網址可繼續使用。試算表、指令碼屬性、管理者名單與公開端 Apps Script 沿用現有設定。

## 資料架構與驗證

管理端以一列保存一次操作的完整快照，寫入時使用指令碼鎖及版本比對。每次發布把當時的草稿與剔除私密欄位、隱藏項目後的公開快照一起寫入。歷史版本保留在專用試算表中。公開端的 Sheets API 權限為唯讀，固定只讀版本資訊與最新發布列的公開欄位。不提供寫入、草稿或查詢歷史的公開操作。使用 Google 試算表介面時，請避免直接修改版本表。

`data.js` 是目前公開備用資料與初始化來源。它會隨 GitHub Pages 提供給所有訪客，且已公開過的版本可能在訪客瀏覽器中保留快取。私人資訊只應存在管理端。後續網站文字和名單以已發布版本為準。

```sh
node --test tools/test-admin.cjs
node --check script.js
node --check public-data.js
```

本機測試以模擬的 Google 服務檢查權限、移轉、過濾、版本衝突、草稿與發布隔離、備份及還原。實際 Google 帳號授權、匿名讀取與跨裝置發布須於初次部署後驗收。公開端使用 Google Sheets API 唯讀範圍及 Apps Script Content Service。[Sheets API 讀取文件](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get) [Content Service 文件](https://developers.google.com/apps-script/guides/content)
