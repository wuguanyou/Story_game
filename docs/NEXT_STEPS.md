# 下一階段工作

優先級為建議。P0 是正式內容與核心規則的優先工作，P1 是下一輪製作、整合與驗收，P2 依團隊確認的範圍安排。各 Issue 記錄工作目標、前置條件、相依任務、交付成果與驗收標準。規則決議記入 [決策紀錄](DECISIONS.md)，人員與期限由團隊確認。

## 工作清單

| Issue | 優先級 | 工作 | 類型 | 相依與啟動條件 |
| --- | --- | --- | --- | --- |
| [#7](https://github.com/wuguanyou/Story_game/issues/7) | P1 | 評估前端畫面原型 | 可先試用，採用需團隊決定 | [Draft PR #8](https://github.com/wuguanyou/Story_game/pull/8) 提供試用版本。 |
| [#24](https://github.com/wuguanyou/Story_game/issues/24) | P0 | 整理正式劇情與節點清單 | 可獨立啟動 | 無。涉及待決規則的分支依危機、排程、MBTI、日程與結局決策補齊。 |
| [#25](https://github.com/wuguanyou/Story_game/issues/25) | P0 | 確認第 15 天正式危機與完成條件 | 團隊決策 | 無硬性前置。若採用 MBTI 或深度排程結果，與對應決策對齊。 |
| [#26](https://github.com/wuguanyou/Story_game/issues/26) | P1 | 確認深度劇情同日到期與第 15 天排程 | 團隊決策 | 無硬性前置。確認結論與危機流程相容。 |
| [#27](https://github.com/wuguanyou/Story_game/issues/27) | P1 | 確認 MBTI 同分判定 | 團隊決策 | 無。危機與結局可引用本議題的結果。 |
| [#28](https://github.com/wuguanyou/Story_game/issues/28) | P1 | 確認正式日程、AP 與換日條件 | 團隊決策 | 無硬性前置。結尾日及危機例外須與結局、危機議題對齊。 |
| [#29](https://github.com/wuguanyou/Story_game/issues/29) | P0 | 確認結局、評分、通關與適性報告 | 團隊決策 | 可先討論。最終口徑對齊 [#28](https://github.com/wuguanyou/Story_game/issues/28)、[#27](https://github.com/wuguanyou/Story_game/issues/27)、[#25](https://github.com/wuguanyou/Story_game/issues/25)。 |
| [#30](https://github.com/wuguanyou/Story_game/issues/30) | P2 | 確認正式存檔與帳號需求 | 團隊決策 | 無。正式 UI 的續玩入口依結論安排。 |
| [#31](https://github.com/wuguanyou/Story_game/issues/31) | P1 | 確認視覺素材、音效與授權規格 | 團隊決策 | 可先盤點。依 [#24](https://github.com/wuguanyou/Story_game/issues/24) 補齊場景，搭配 [#7](https://github.com/wuguanyou/Story_game/issues/7) 的呈現討論。 |
| [#32](https://github.com/wuguanyou/Story_game/issues/32) | P1 | 建立正式劇情交付的後端驗收範本 | 可獨立執行 | 無。供 [#24](https://github.com/wuguanyou/Story_game/issues/24) 與正式 JSON 交付使用。 |
| [#33](https://github.com/wuguanyou/Story_game/issues/33) | P1 | 製作與驗證正式劇情 JSON | 部分可先做 | 依 [#24](https://github.com/wuguanyou/Story_game/issues/24) 分批開始，參考 [#32](https://github.com/wuguanyou/Story_game/issues/32)。危機、排程、MBTI、日程及結局部分依 [#25](https://github.com/wuguanyou/Story_game/issues/25)、[#26](https://github.com/wuguanyou/Story_game/issues/26)、[#27](https://github.com/wuguanyou/Story_game/issues/27)、[#28](https://github.com/wuguanyou/Story_game/issues/28)、[#29](https://github.com/wuguanyou/Story_game/issues/29)。 |
| [#34](https://github.com/wuguanyou/Story_game/issues/34) | P1 | 製作並交付正式美術與音效 | 部分可先做 | 依 [#31](https://github.com/wuguanyou/Story_game/issues/31) 的已確認項目先交付，依 [#24](https://github.com/wuguanyou/Story_game/issues/24) 補完場景。 |
| [#35](https://github.com/wuguanyou/Story_game/issues/35) | P1 | 整合正式遊戲畫面與後端 API | 部分可先做 | 正式版依 [#7](https://github.com/wuguanyou/Story_game/issues/7)／PR #8 的畫面決策與 [#31](https://github.com/wuguanyou/Story_game/issues/31)、[#34](https://github.com/wuguanyou/Story_game/issues/34)，搭配 [#33](https://github.com/wuguanyou/Story_game/issues/33) 驗收。結局與存檔介面依 [#29](https://github.com/wuguanyou/Story_game/issues/29)、[#30](https://github.com/wuguanyou/Story_game/issues/30)。 |
| [#36](https://github.com/wuguanyou/Story_game/issues/36) | P1 | 驗收正式劇情的完整遊戲流程 | 整合交付後驗收 | 需 [#33](https://github.com/wuguanyou/Story_game/issues/33)、[#35](https://github.com/wuguanyou/Story_game/issues/35)，以及 [#25](https://github.com/wuguanyou/Story_game/issues/25)、[#26](https://github.com/wuguanyou/Story_game/issues/26)、[#27](https://github.com/wuguanyou/Story_game/issues/27)、[#28](https://github.com/wuguanyou/Story_game/issues/28)、[#29](https://github.com/wuguanyou/Story_game/issues/29) 涉及的正式規則已落地。存檔依 [#30](https://github.com/wuguanyou/Story_game/issues/30) 的決議驗收。 |
| [#37](https://github.com/wuguanyou/Story_game/issues/37) | P2 | 確認目前交付範圍、分工與里程碑 | 團隊決策 | 可立即討論。估算應參照 [#24](https://github.com/wuguanyou/Story_game/issues/24)、[#34](https://github.com/wuguanyou/Story_game/issues/34)、[#36](https://github.com/wuguanyou/Story_game/issues/36)。 |

## 執行順序

1. 同步啟動 [#24](https://github.com/wuguanyou/Story_game/issues/24) 的日常與深度劇情整理、[#32](https://github.com/wuguanyou/Story_game/issues/32) 的後端交付驗收範本，以及 [#7](https://github.com/wuguanyou/Story_game/issues/7) 的瀏覽器試用。團隊可並行討論 [#25](https://github.com/wuguanyou/Story_game/issues/25) 的危機與 [#29](https://github.com/wuguanyou/Story_game/issues/29) 的結局。
2. [#33](https://github.com/wuguanyou/Story_game/issues/33) 依已確認內容分批提交。需要危機、排程、MBTI、日程及結局決議的分支，在對應規則確認後補齊。若需要改動引擎或 API，先依確認的範圍開實作 Issue。
3. [#35](https://github.com/wuguanyou/Story_game/issues/35) 可用現有 API 和測試範本先驗證流程。正式介面依 [#7](https://github.com/wuguanyou/Story_game/issues/7)、[#31](https://github.com/wuguanyou/Story_game/issues/31) 與 [#34](https://github.com/wuguanyou/Story_game/issues/34) 整合，再以 [#36](https://github.com/wuguanyou/Story_game/issues/36) 驗收正式版本。

## 自動化驗證與測試維護

現有 21 天 HTTP 測試可用來驗證引擎流程。正式版驗收（[#36](https://github.com/wuguanyou/Story_game/issues/36)）需搭配正式劇情和正式畫面。製作正式劇情時可使用 `dayStarts` 設定每日入口，並用 `story:validate` 檢查節點參照與可玩性警告。

- 跨平台 CI 與第 5 天入口、CLI 回歸測試改善已合併。[PR #20](https://github.com/wuguanyou/Story_game/pull/20) · [Issue #17](https://github.com/wuguanyou/Story_game/issues/17) · [Issue #18](https://github.com/wuguanyou/Story_game/issues/18)
- Vitest 修補已合併，完整與正式依賴稽核皆為零項。[PR #23](https://github.com/wuguanyou/Story_game/pull/23) · [Issue #21](https://github.com/wuguanyou/Story_game/issues/21)

## 課程提案參照（原訂分工與時程）

- [專題提案摘要](PROJECT_PROPOSAL.md)
- [提案原訂分工與時程](TEAM_PLAN.md)
- [提案與目前實作差異及討論清單](PROPOSAL_GAPS.md)

提案原訂 2026/11/23 完成核心互動與入職適應期、11/30 完成劇情和主要素材、12/07 可完整遊玩、12/14 測試修正、12/21 成果展示。**這些是提案目標，並非已驗收進度或新指派的期限**；須由團隊確認是否調整。第 15 天危機仍屬討論事項，不能在規則確定前直接開發正式內容。
