# 前端互動介面模板交接

入口：開啟 `http://127.0.0.1:5173/?prototype=greenhouse-ui`，再從主選單「開始遊戲」→「進入流程預覽」。本機已有存檔時，也可使用「繼續遊戲」。

## 畫面與互動

- 滿版場景、說話者名稱、下方對話框與等寬選項。
- 對話逐字顯示，點擊對話即可顯示全文；開啟減少動態效果時直接顯示全文。
- 對話完成後顯示選項，選擇後跳到下一節點。
- 「紀錄」顯示走過的對話、所選回應及目前對話。
- 支援手動本機存檔、讀取存檔、隱藏介面、暫停與返回主選單。
- Esc 可關閉視窗或恢復隱藏的介面；視窗關閉後會恢復原操作焦點。
- 文字大小與減少動態效果沿用主選單設定。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `frontend/src/prototypes/greenhouse-ui/StoryGame.jsx` | 劇情模板、逐字對話、紀錄與暫停視窗 |
| `frontend/src/prototypes/greenhouse-ui/styles/story-game.css` | 滿版場景、對話、選項與響應式版面 |
| `frontend/src/prototypes/greenhouse-ui/PrototypeApp.jsx` | 模板入口、存檔與畫面切換 |
| `frontend/src/prototypes/greenhouse-ui/demo-story.js` | 介面預覽文字，非正式劇情 |

## 場景與立繪

本機預覽節點沿用 `scene`、`speaker`、`text`、`options`；可選擇加入 `background`（背景）、`portrait`（場景立繪）與 `avatar`（左下角頭像）作為圖片路徑。圖片放在 `frontend/public/assets/prototypes/greenhouse-ui/`，路徑以 `/assets/prototypes/greenhouse-ui/` 開頭。沒有指定背景時使用現有場景，沒有立繪時不顯示角色；沒有頭像時，左下角保留簡單圓形頭像區與淡色剪影。

這些可選圖片欄位目前只供本機介面模板使用。正式後端劇情 JSON、驗證器與 API 的支援範圍仍以 `STORY_GUIDE.md` 為準，尚未因本次模板製作而擴充。

本模板不計算或展示假設的 AP、病患數值與 MBTI，也尚未取代後端測試畫面。後續接上正式後端時，需將畫面資料改為 API 回傳的節點與狀態。



## 接手與討論

- 本次交付是示範模板，不代表正式美術、角色、劇情或規則已定案。
- 保留原本首頁、本機示範與後端測試模式；網址沒有 prototype 參數時仍顯示原首頁。
- 模板使用獨立的 localStorage 存檔與設定名稱，不讀寫原示範存檔。
- 已有的病患／AP API 尚未接入模板；請先在 Issue #7 討論顯示哪些資料，再安排串接。
- 先評估起始互動、對話閱讀、選項對齊、角色頭像位置及行動裝置排版，確認採用後才移入正式元件。
- 視覺檢查仍待組員在瀏覽器確認；自動測試結果見 Draft PR。
