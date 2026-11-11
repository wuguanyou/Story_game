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

目前可驗證節點與選項、扣除互動 AP、套用病患與 MBTI 效果、依時段篩選，以及記錄跨過 50 的隔日劇情日期。`pendingDepth` 是待安排日期，正式劇情節點與觸發流程尚未接上。

進入第 15 天會鎖定 MBTI。劇情可用 `lockedPreference` 條件檢查指定傾向是否嚴格高於相反傾向。同分時此條件不成立，正式人格同分規則仍待決定。劇情作者可指定 `finishCrisis` 選項標記強制事件完成，玩家完成後才能換日。引導腳本、正式危機劇情與成功門檻、結局評分和持久化存檔待確認。

執行 `npm run typecheck --workspace backend` 與 `npm test --workspace backend` 驗證。
