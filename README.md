# 子靖＆勤萱婚禮工作指南

婚禮工作人員使用的靜態電子執行手冊。入口為 `index.html`，不需登入、資料庫或建置步驟。

## 本機預覽

在專案目錄執行：

```sh
python3 -m http.server 4173
```

接著開啟 `http://127.0.0.1:4173/`。

## 更新婚禮資料

所有婚禮資料集中在 `data.js`：

- `people`：人員姓名；請維持穩定且唯一的 ID。
- `teams`：組別、人員 ID、各時段工作與注意事項。
- `schedule`、`keyTimes`：完整流程與首頁四個重要時間。
- `ceremony`、`cameraPositions`、`avCues`：節目與影音流程。
- `photoGroups`：大合照分組與順序；目前顯示待公布。
- `cleanup`、`reception`：撤場與婚宴安排。

同一人兼任多項工作時，只修改 `people` 中的一筆姓名；其他區塊以 ID 連結，會同步更新。

狀態僅使用：`confirmed`（已確認）、`tentative`（暫定）、`pending`（待公布）。`internalNote` 不會顯示在工作人員頁面。
