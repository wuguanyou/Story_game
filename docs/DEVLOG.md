# 開發日誌（Developer Log）

> 記錄**里程碑、重大修改、遇到的問題與下一步**即可；小修改請交給 Git commit 和 GitHub Issues。建議每週更新一次，或完成重要功能後更新。

## 2026-11-06｜共用框架
- **完成**：建立獨立劇情資料夾、章節範本與編寫指南。
- **目前限制**：只有範例劇情，尚無正式題材、登入、雲端資料庫或角色動畫。
- **待討論**：題材方向、成員分工、主線/支線架構、存檔需求。
- **下一步**：先確認需求與分工，再實作正式功能。

## 2026-11-17｜後端規則測試與前後端 API 串接

- **完成內容**：
  - PR #1（已合併）：補齊後端深度劇情與第 15 天規則的單元測試及 HTTP API 整合測試，涵蓋第 3／4／14／16 天與 49／50／51 門檻邊界、同日多位到期、缺少入口、深度劇情不消耗 AP 並返回原節點、同一病患不重播、第 15 天 MBTI 鎖定與 AP 為 0、強制事件完成前不能換日，以及成功請求以舊 revision 重送回傳 `409 stale_revision`。測試未發現實作違反已確認規則，未修改後端規則。
  - PR #2（已合併）：新增前端 API client（`frontend/src/api/gameApi.js`）與首頁「後端測試模式」（`frontend/src/components/BackendGame.jsx`），可建立遊戲、選擇選項、換日、完成深度劇情，並處理連線失敗、`503 story_unconfigured`、`404 game_not_found`、`409 stale_revision`（重新讀取、不重送）等錯誤。審查後修正：離開畫面或建立新局後，舊請求的回應不再覆蓋目前進度；第 15 天強制事件完成前與第 21 天停用「下一天」按鈕。本機示範模式與 localStorage 存檔保持不變。
- **測試紀錄**（取自 PR #1、PR #2 合併前的測試紀錄，本次文件更新未重新執行）：
  - 後端 `npm test --workspace backend`：32 項通過；`npm run typecheck --workspace backend` 通過。
  - 前端 `npm test --workspace frontend`：11 項回歸測試通過；`npm run build` 通過。
  - 另以 Edge 瀏覽器自動化腳本驗收（腳本未納入專案）：以 `backend/stories/depth.example.json` 完成建立遊戲、扣 AP、換日、第 4 天跨門檻、第 5 天深度劇情並返回原節點。
- **已知限制**：
  - 尚無正式劇情；`depth.example.json` 沒有 `finishCrisis`，遊玩到第 15 天會停住。
  - 多位病患同日到期、跨第 15 天的深度劇情排程、MBTI 同分、第 15 天危機內容與完成條件、結局與評分仍待決定。
  - 後端進度只存在記憶體，尚無永久存檔與帳號；前端正式遊戲畫面與素材尚未製作。
- **相關 PR**：#1、#2
- **下一步**：整理正式劇情資料並確認第 15 天事件規則，再製作正式劇情 JSON 與前端正式畫面；細項見 `docs/NEXT_STEPS.md`。

---

## 2026-11-23～25｜21 天流程、每日入口與劇情驗證

- [PR #10](https://github.com/wuguanyou/Story_game/pull/10) 建立第 1～21 天的後端 HTTP 流程測試，涵蓋第 15 天的測試事件。
- [PR #12](https://github.com/wuguanyou/Story_game/pull/12) 加入劇情可玩性警告。[PR #15](https://github.com/wuguanyou/Story_game/pull/15) 加入每日入口設定，並讓換日觸發的深度劇情結束後返回當天的日常入口。
- [PR #16](https://github.com/wuguanyou/Story_game/pull/16) 改善病患門檻判斷及警告彙整，補上 CLI 與 HTTP 回歸測試。依合併前紀錄，後端 51 項、前端 11 項和後端型別檢查通過。21 天測試資料無警告，深度劇情範本有預期警告，兩者皆退出 0。
- [Issue #17](https://github.com/wuguanyou/Story_game/issues/17) 追蹤第 5 天獨立入口的 HTTP 斷言與跨環境 CLI 測試穩定性。

---

## 2026-11-25｜CI 審查與依賴稽核

- [PR #20](https://github.com/wuguanyou/Story_game/pull/20) 的 Ubuntu、Windows 與 Node.js 20.19.0、24 共四組檢查已通過。依團隊協作規則，待至少一位其他組員審查後合併。[Actions 執行紀錄](https://github.com/wuguanyou/Story_game/actions/runs/45576018973)
- 在當時的 `main` 執行 npm audit。完整依賴樹列出三個受影響的開發套件，正式依賴樹回報零項。[安全性 Issue #21](https://github.com/wuguanyou/Story_game/issues/21)

---

## 新紀錄範本（複製下方）

### YYYY-MM-DD｜功能或里程碑名稱
- **負責人**：
- **完成內容**：
- **遇到的問題／處理方式**：
- **相關 Issue / PR**：
- **下一步**：
