# 植心溫室前端介面示範模板

這份模板供前端同學試用與討論，包含起始畫面、拉繩開燈、設定、劇情閱讀、選項與頭像區。範例劇情及圖片不是已確認的正式遊戲內容。

## 啟動

在專案根目錄執行：

```powershell
npm install
npm run dev --workspace frontend
```

開啟終端顯示的 Local 網址並加上 `?prototype=greenhouse-ui`，預設為：

[開啟模板](http://127.0.0.1:5173/?prototype=greenhouse-ui)

模板的本機互動不需要後端。網址沒有此參數時維持原首頁及原有模式。

## 修改位置

| 檔案 | 用途 |
| --- | --- |
| `PrototypeApp.jsx` | 畫面切換、獨立本機存檔與設定 |
| `TitleScreen.jsx` | 拉繩、光源、主選單與設定 |
| `StoryGame.jsx` | 頭像、逐字對話、選項、紀錄及暫停 |
| `GreenhouseScene.jsx` | 既有背景場景 |
| `styles/` | 模板樣式 |
| `demo-story.js` | 假資料及圖片路徑 |
| `../../../public/assets/prototypes/greenhouse-ui/` | 圖片與生成記錄 |

詳細交接與圖片欄位見 [前端交接說明](../../../../docs/FRONTEND_UI_HANDOFF.md)。

## 驗證

```powershell
npm run build
npm test --workspace frontend
```

這份模板尚未接入正式後端，不包含正式病患狀態、AP、MBTI 或結局。討論請使用 [Issue #7](https://github.com/wuguanyou/Story_game/issues/7)，採用前先透過 Draft PR 審查。
