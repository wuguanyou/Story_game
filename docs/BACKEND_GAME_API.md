# 植心溫室後端串接

以《植心溫室》遊戲企劃提案為遊戲規格。API 的示範資料只有一個測試互動。

## 在本機啟動

於專案根目錄執行 `npm install`，在 PowerShell 設定 `$env:ENABLE_GAME_DEMO = '1'`，再執行 `npm run dev`。Vite 可使用既有的 `/api` 代理。未開啟示範時，遊戲端點回傳 `503 story_unconfigured`。

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| POST | `/api/games` | 建立進度，回傳 201 |
| GET | `/api/games/:id` | 讀取進度 |
| POST | `/api/games/:id/actions` | 送出 `{ "type": "choose", "choiceId": "...", "revision": 0 }` 或 `{ "type": "advanceDay", "revision": 0 }` |

成功時回傳 `id`、`revision`、`game`、`pendingDepth` 與目前的 `node`。選項只回傳可用的 ID 與顯示文字。前端用回傳的最新版本號送下一個動作。收到 `409 stale_revision` 時先重新讀取，避免重送已執行的動作。不可用的選項或日期推進分別回傳 `409 choice_unavailable`、`409 day_unavailable`。

原型以伺服器記憶體保存進度，最多 100 局，重啟即清除。示範暫以用完當天 AP 作為換日條件。前端現有示範畫面仍沿用自己的進度與存檔。

可在後端環境設定 `GAME_STORY_FILE` 指向劇情 JSON（建議使用絕對路徑）。載入時會檢查節點與選項 ID、跳轉目標、條件、效果和深度劇情入口，資料有誤時伺服器會在啟動階段報錯。JSON 包含 `start`、`nodes`，並可用 `depthStarts` 指定病患入口，例如 `{ "A": "patient_a_depth" }`。

從專案根目錄執行 `$env:GAME_STORY_FILE = (Resolve-Path backend/stories/depth.example.json).Path` 後，以 `npm start` 啟動後端即可載入測試範本。每天執行五次互動再換日，第 4 天選一次 `cross_threshold`，即可在第 5 天看到病患 A 的測試劇情。範本中的數值和文字用於驗證流程。

交付劇情前可從專案根目錄執行 `npm run story:validate --workspace backend -- ./stories/depth.example.json`。把範本路徑換成要檢查的檔案。相對路徑以 `backend` 為基準，也可使用絕對路徑。深度劇情可以有條件分支，每個節點都要保留一條不需解鎖即可走到結尾的路徑，避免玩家因條件不符而卡住。

第 4～14 天跨過 50 時會記入 `pendingDepth`。一般日期換日後，若只有一位病患當天到期且已配置入口，API 會進入該劇情並回傳 `activeDepth`（病患 ID）。深度劇情使用 `dialogue` 選項，不消耗 AP。到達沒有選項的節點時，`canFinishDepth` 為 true，可送出 `{ "type": "finishDepth", "revision": 目前版本號 }` 返回原節點，同一病患完成後不會重播。第 15 天與同日多位到期的排程保留在 `pendingDepth`，等待團隊決定順序。

進入第 15 天會鎖定 MBTI。劇情可用 `lockedPreference` 條件檢查指定傾向是否嚴格高於相反傾向。同分時此條件不成立，正式人格同分規則仍待決定。劇情作者可指定 `finishCrisis` 選項標記強制事件完成，玩家完成後才能換日。引導腳本、正式危機劇情與成功門檻、結局評分和持久化存檔待確認。

執行 `npm run typecheck --workspace backend` 與 `npm test --workspace backend` 驗證。
