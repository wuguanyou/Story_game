# 植心溫室

《植心溫室》是一款以 21 天為週期的互動劇情遊戲：玩家每天以有限的行動點（AP）與三位病患互動，累積病患的信任值與治癒值，並由選擇累積自己的 MBTI 傾向。

> **目前開發階段：遊戲系統原型。**
> 後端已實作遊戲狀態、規則與劇情引擎，前端已能透過 API 操作後端進度；**正式劇情、第 15 天危機內容、結局與評分尚未製作**，目前無法完整遊玩 21 天。
> 專案內的劇情資料（`frontend/src/stories/`、`backend/stories/depth.example.json`）都是**測試用範例**，不是正式故事。

## 技術架構

| 部分 | 技術 | 位置 |
| --- | --- | --- |
| 前端 | React 19 + Vite 6 | `frontend/` |
| 後端 | Express 5 + TypeScript（以 `tsx` 執行） | `backend/` |
| 前端測試 | Vitest + jsdom + Testing Library | `frontend/src/**/*.test.jsx` |
| 後端測試 | Node.js 內建測試執行器（`tsx --test`） | `backend/src/game/*.test.ts` |

前後端以 npm workspaces 管理；開發時 Vite 將 `/api` 代理到 `http://127.0.0.1:3001`。

## 已實作的遊戲系統（後端）

以下規則已寫入後端程式並有測試；哪些已經團隊確認、哪些仍屬暫定，請以 [決策紀錄](docs/DECISIONS.md) 為準。

- **21 天與 AP**：新遊戲為第 1 天、AP 5。`interaction` 選項消耗 1 AP；換日後 AP 回到 5，第 15 天為 0。第 21 天無法再換日。目前以「用完當天 AP」作為換日條件（暫定）。
- **病患數值**：病患 A、B、C 各有信任值與治癒值，範圍限制在 0～100。
- **MBTI 計分與鎖定**：E/I、S/N、T/F、J/P 八個傾向各自累積非負分數；進入第 15 天後鎖定，之後的 MBTI 效果不再累積。劇情可用 `lockedPreference` 條件檢查鎖定後某傾向是否嚴格高於相反傾向。
- **深度劇情（第 4～14 天）**：
  1. 第 4～14 天，病患信任值或治癒值由 ≤50 變為 >50 時，記錄隔天的深度劇情（`pendingDepth`）。
  2. 換日後，只有當天恰好一位病患到期、且劇情檔有設定該病患入口（`depthStarts`）時，才進入深度劇情。
  3. 深度劇情只使用 `dialogue` 選項、不消耗 AP；走到沒有選項的結尾節點後送出 `finishDepth`，回到進入前的原劇情節點。
  4. 同一病患完成後不會再次排程或重播。
- **第 15 天強制事件**：第 15 天 MBTI 鎖定、AP 為 0，`interaction` 選項不會出現；劇情中的 `finishCrisis` 選項標記強制事件完成，**完成前不能進入第 16 天**。正式危機劇情與完成條件尚未製作。
- **進度與版本**：每局進度以伺服器記憶體保存（最多 100 局，重啟即清除），每次成功操作 `revision` 加 1，送出舊版本號會回傳 `409 stale_revision`。

## 前端的兩種模式

首頁提供兩種彼此獨立的模式：

| | 本機示範模式 | 後端測試模式 |
| --- | --- | --- |
| 入口 | 「開始示範劇情」「讀取本機存檔」 | 「後端測試模式」 |
| 劇情來源 | `frontend/src/stories/` 的靜態中性示範 | 後端載入的劇情 JSON |
| 遊戲規則 | 無（只有分支跳轉） | 由後端判斷 AP、換日、深度劇情、第 15 天 |
| 進度保存 | 瀏覽器 localStorage（手動存檔） | 只在 React 記憶體；重新整理或後端重啟後需重新建立 |
| 用途 | 介面與分支流程示範 | 驗證後端規則與 API 串接 |

後端測試模式會顯示 Day、AP、MBTI 鎖定狀態、目前深度劇情及病患信任／治癒值，並提供「下一天」「完成深度劇情」按鈕。按鈕的啟用條件只是提示，最終一律由後端驗證。

## API 與程式碼位置

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 健康檢查 |
| POST | `/api/games` | 建立新局（201） |
| GET | `/api/games/:id` | 讀取進度 |
| POST | `/api/games/:id/actions` | `choose`（需 `choiceId`）、`advanceDay`、`finishDepth`，皆需目前 `revision` |

請求與回應格式、錯誤代碼見 [後端 API 說明](docs/BACKEND_GAME_API.md)。

| 內容 | 位置 |
| --- | --- |
| 伺服器進入點、劇情載入設定 | `backend/src/server.js` |
| API 路由 | `backend/src/game/GameRoutes.ts` |
| 劇情引擎、深度劇情流程 | `backend/src/game/StorySystem.ts` |
| 劇情 JSON 驗證規則 | `backend/src/game/StoryValidation.ts` |
| 選項條件 | `backend/src/game/EventConditions.ts` |
| 時間與 AP、第 15 天換日限制 | `backend/src/game/TimeSystem.ts`、`backend/src/game/EventSystem.ts` |
| 病患數值、MBTI | `backend/src/game/PatientSystem.ts`、`backend/src/game/MBTISystem.ts` |
| 遊戲狀態初始值 | `backend/src/game/GameState.ts` |
| 深度劇情測試範本 | `backend/stories/depth.example.json` |
| 前端 API client | `frontend/src/api/gameApi.js` |
| 後端測試模式畫面 | `frontend/src/components/BackendGame.jsx` |
| 本機示範模式畫面、示範劇情 | `frontend/src/components/Game.jsx`、`frontend/src/stories/` |
| 首頁與模式切換 | `frontend/src/App.jsx` |

## 安裝與啟動（Windows PowerShell）

需安裝 Node.js **20.19 以上**、npm 與 Git。以下指令皆在專案根目錄執行。

```powershell
# 安裝相依套件
npm install

# 載入深度劇情測試範本，同時啟動前端（Vite）與後端
$env:GAME_STORY_FILE = (Resolve-Path backend/stories/depth.example.json).Path
npm run dev
```

開啟 <http://127.0.0.1:5173/>，按 Ctrl+C 結束。後端健康檢查為 <http://127.0.0.1:3001/api/health>。

- 不設定 `GAME_STORY_FILE` 時，可改設 `$env:ENABLE_GAME_DEMO = '1'` 載入只有一個測試互動的最小示範；兩者都沒設定時，遊戲端點回傳 `503 story_unconfigured`，本機示範模式仍可使用。
- 環境變數只在目前的 PowerShell 視窗有效；可用 `Remove-Item Env:GAME_STORY_FILE` 清除。後端也會讀取 `backend/.env`（參考 `backend/.env.example`，不要提交 `.env`）。
- 只啟動後端：`npm start`。

### 測試與檢查

```powershell
npm run build                              # 前端正式建置
npm run typecheck --workspace backend      # 後端型別檢查
npm test --workspace backend               # 後端測試
npm test --workspace frontend              # 前端回歸測試
npm run story:validate --workspace backend -- ./stories/depth.example.json   # 驗證劇情 JSON
```

`story:validate` 的相對路徑以 `backend/` 為基準，也可使用絕對路徑。

## 用 depth.example.json 驗證深度劇情

1. 依上方指令設定 `GAME_STORY_FILE` 並執行 `npm run dev`。
2. 首頁按「後端測試模式」→「建立新遊戲」。
3. 第 1～3 天：每天選五次「測試互動」，AP 歸零後按「下一天」。
4. 第 4 天：前四次選「測試互動」，最後一次選「測試超過信任門檻」（病患 A 信任值 0→51），再按「下一天」。
5. 第 5 天會進入「病患 A 的深度劇情測試」：選「繼續」後按「完成深度劇情」，畫面回到每日互動節點，AP 仍為 5。

此範本**沒有** `finishCrisis` 選項，因此玩到第 15 天會停在「請先完成第 15 天強制事件」，無法進入第 16 天；這是範本內容不足，不是程式錯誤。

## 已知限制與尚未完成的功能

- 尚無正式劇情、角色文本與第 15 天危機內容；現有劇情資料都只用於驗證流程。
- 結局、評分與通關判定尚未決定，也未實作。
- 多位病患同日到期的深度劇情、跨第 15 天未執行的深度劇情，目前只保留在 `pendingDepth`，不會進入；處理方式待決定。
- MBTI 同分時 `lockedPreference` 條件不成立，正式同分規則待決定。
- 後端進度只存在伺服器記憶體；尚無永久存檔、資料庫或帳號。
- 前端正式遊戲畫面尚未製作；後端測試模式是驗證用介面，背景、立繪與音效尚未接入（`frontend/public/assets/` 目前為空）。

待決事項的完整清單見 [決策紀錄](docs/DECISIONS.md)，下一階段工作見 [下一步工作](docs/NEXT_STEPS.md)。

## 團隊開發流程與文件

- 每項工作先開 Issue，從最新 `main` 建立功能分支，透過 Pull Request 經其他組員審查後合併；不要直接推送 `main`。
- 不要提交 `.env`、密碼、Token、真實個資或 `node_modules`。

| 文件 | 內容 |
| --- | --- |
| [docs/COLLABORATION.md](docs/COLLABORATION.md) | 分支與 PR 流程、分工位置 |
| [docs/BACKEND_GAME_API.md](docs/BACKEND_GAME_API.md) | 後端 API、劇情 JSON 載入與遊戲規則細節 |
| [docs/STORY_GUIDE.md](docs/STORY_GUIDE.md) | 劇情編寫與交付方式 |
| [docs/DECISIONS.md](docs/DECISIONS.md) | 已確認規則、暫定行為與待決事項 |
| [docs/DEVLOG.md](docs/DEVLOG.md) | 里程碑紀錄 |
| [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) | 下一階段工作與驗收標準 |
