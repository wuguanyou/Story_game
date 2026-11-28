# 劇情編寫指南

專案中有兩種劇情資料，用途不同、格式也不同：

| | 前端本機示範資料 | 後端劇情 JSON |
| --- | --- | --- |
| 位置 | `frontend/src/stories/*.js` | JSON 檔，例如 `backend/stories/depth.example.json` |
| 使用者 | 首頁「開始示範劇情」 | 首頁「後端測試模式」與之後的正式遊戲 |
| 遊戲規則 | 無，只有分支跳轉 | AP、換日、病患數值、MBTI、深度劇情、第 15 天 |
| 用途 | 介面與分支流程示範 | **正式劇情應以此格式交付** |

正式劇情請使用後端劇情 JSON。不要另外設計第二套格式，也不要把正式劇情寫進 `frontend/src/stories/`。

---

## 一、後端劇情 JSON

後端啟動時以環境變數 `GAME_STORY_FILE` 指定劇情 JSON。載入時會驗證整份檔案，有錯誤時伺服器會直接報錯、不啟動。欄位與規則以下列程式為準：

- `backend/src/game/StoryValidation.ts`：欄位、條件、效果的驗證。
- `backend/src/game/StorySystem.ts`：節點 ID、跳轉目標、`action`、深度劇情結構的檢查與執行。
- `backend/src/game/EventConditions.ts`：條件的判斷方式。

### 檔案結構

```json
{
  "start": "daily",
  "depthStarts": { "A": "depth_a" },
  "nodes": [
    {
      "id": "daily",
      "text": "每日互動測試。",
      "choices": [
        { "id": "practice", "label": "測試互動", "next": "daily", "action": "interaction" }
      ]
    }
  ]
}
```

完整可執行的例子見 `backend/stories/depth.example.json`（**測試範本，不是正式劇情**）。

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `start` | 是 | 新遊戲的起始節點 ID，必須存在於 `nodes` |
| `nodes` | 是 | 節點陣列 |
| `dayStarts` | 否 | 第 2～21 天的每日入口。鍵為十進位天數字串，例如 `"2"`，值為已存在的節點 ID |
| `nodes[].id` | 是 | 節點 ID，不可空白、不可重複 |
| `nodes[].text` | 是 | 顯示給玩家的文字 |
| `nodes[].choices` | 是 | 選項陣列；空陣列 `[]` 代表結尾節點 |
| `depthStarts` | 否 | 病患深度劇情入口，鍵只能是 `A`、`B`、`C`，值為節點 ID |

每個選項（`choices[]`）：

| 欄位 | 必填 | 說明 |
| --- | --- | --- |
| `id` | 是 | 同一節點內不可重複 |
| `label` | 是 | 玩家看到的選項文字 |
| `next` | 是 | 選擇後前往的節點 ID，必須存在 |
| `action` | 是 | `interaction`、`dialogue` 或 `finishCrisis` |
| `condition` | 否 | 顯示條件，格式見下方 |
| `effect` | 否 | 選擇後的效果，格式見下方 |

API 目前只把節點的 `id`、`text` 及可用選項的 `id`、`label` 傳給前端。說話者、背景、立繪等欄位尚未支援；需要時請先開 Issue 請程式組評估，不要自行加入欄位。驗證器不一定會拒絕多餘欄位，但引擎與畫面都不會使用。

### `action` 的現行意義

| 值 | 意義 |
| --- | --- |
| `interaction` | 自由行動，消耗 1 AP。AP 為 0 或第 15 天時不會出現 |
| `dialogue` | 對話，不消耗 AP。深度劇情中只會顯示這類選項 |
| `finishCrisis` | 標記第 15 天強制事件完成。只在第 15 天、MBTI 鎖定後、事件尚未完成時出現，只能完成一次；完成後才能進入第 16 天 |

正式的第 15 天危機內容與完成條件尚未決定（見 `docs/DECISIONS.md`）；`finishCrisis` 目前只是標記機制。

### 條件 `condition`

只能使用以下類型，不能自行發明新的條件：

| 類型 | 格式 | 成立條件 |
| --- | --- | --- |
| `day` | `{ "type": "day", "value": 4 }` | 目前是第 `value` 天（1～21 的整數） |
| `slot` | `{ "type": "slot", "value": "morning" }` | 目前時段；依剩餘 AP 對應：5 `morning`、4 `lateMorning`、3 `afternoon`、2 `evening`、1 `night`。第 15 天不成立 |
| `patient` | `{ "type": "patient", "patientId": "A", "field": "trust", "minimum": 50 }` | 病患 `A`/`B`/`C` 的 `trust` 或 `healing` **大於或等於** `minimum` |
| `flag` | `{ "type": "flag", "value": "day15_event_completed" }` | 遊戲已有該旗標。目前只有引擎會寫入 `day15_event_completed`，劇情效果無法新增旗標 |
| `lockedPreference` | `{ "type": "lockedPreference", "value": "F" }` | MBTI 已鎖定，且該傾向**嚴格高於**相反傾向（同分不成立） |
| `all` | `{ "type": "all", "conditions": [ ... ] }` | 所有子條件都成立（空陣列永遠不成立） |
| `any` | `{ "type": "any", "conditions": [ ... ] }` | 至少一個子條件成立（空陣列永遠不成立） |

### 效果 `effect`

只能包含 `patient` 與 `mbti` 兩個鍵：

```json
{
  "patient": { "id": "A", "trust": 5, "healing": -2 },
  "mbti": { "F": 1, "N": 1 }
}
```

- `patient.id` 必須是 `A`、`B`、`C`；`trust`、`healing` 為有限數字，可為負數，結果會限制在 0～100。
- `mbti` 的鍵只能是 `E`、`I`、`S`、`N`、`T`、`F`、`J`、`P`，值必須是非負數字；第 15 天起 MBTI 鎖定，效果會被忽略。

### 每日劇情入口 `dayStarts`

第 1 天從 `start` 開始。成功換日後，若 `dayStarts` 有設定該天的入口，就切換到指定節點。省略 `dayStarts` 或某天的設定時，換日會延續當前節點。日期鍵請使用 `"2"` 到 `"21"`，例如第 2 天使用 `"2"`。

以下是含第 2 天與第 15 天入口的測試用範例：

```json
{
  "start": "daily",
  "dayStarts": { "2": "day_02", "15": "day_15" },
  "nodes": [
    {
      "id": "daily",
      "text": "第 1 天測試。",
      "choices": [
        { "id": "practice", "label": "測試互動", "next": "daily", "action": "interaction" }
      ]
    },
    {
      "id": "day_02",
      "text": "一般日測試。",
      "choices": [
        { "id": "practice", "label": "測試互動", "next": "day_02", "action": "interaction" }
      ]
    },
    {
      "id": "day_15",
      "text": "第 15 天事件測試。",
      "choices": [
        { "id": "finish", "label": "完成測試事件", "next": "day_02", "action": "finishCrisis" }
      ]
    }
  ]
}
```

`dayStarts` 只指定成功換日後的入口。第 15 天仍須完成 `finishCrisis` 才能進入第 16 天。範例未配置第 16 天入口，因此會延續完成選項所前往的 `day_02` 節點。

每日入口由換日流程進入，不需要從前一天加一個 `next` 指向該入口。每個入口 ID 須存在於 `nodes`，否則劇情載入會失敗。

請勿將深度劇情專用節點設為每日入口。這些節點應由深度劇情流程進入，才能在結尾使用 `finishDepth` 返回日常。正式劇情建議配置第 16～21 天的入口，讓危機完成後的各天都有明確的起始節點。

### 深度劇情 `depthStarts`

- 第 4～14 天病患信任值或治癒值跨過 50 時，隔天可能進入該病患的入口節點（完整規則見 `README.md` 與 `docs/DECISIONS.md`）。
- 從入口節點能到達的所有節點都只能使用 `dialogue` 選項。
- 每個深度劇情節點都必須保留一條**不需條件**即可走到結尾節點（`choices: []`）的路徑，否則驗證失敗。可以有條件分支，但不能讓玩家卡住。
- 同一天配置了每日入口且觸發深度劇情時，會先顯示深度劇情。走到結尾並送出 `finishDepth` 後回到新一天的每日入口。當天沒有配置入口時，則回到換日前的節點。深度劇情應透過 `finishDepth` 回到日常流程。

### 其他注意事項

- 日常節點應保留可用的 `interaction` 選項；目前換日條件是「用完當天 AP」，若日常節點沒有可用的互動選項，玩家可能無法換日。
- 同日多位病患到期、MBTI 同分、結局等規則尚未決定，請不要在劇情中假設某種處理方式。

### 驗證指令

在專案根目錄執行（相對路徑以 `backend/` 為基準，也可用絕對路徑）：

```powershell
npm run story:validate --workspace backend -- ./stories/depth.example.json
```

通過時顯示「劇情驗證通過，共 N 個節點，起點為 …」。請查看輸出中的錯誤與警告：

- **錯誤（error）**：JSON 格式、欄位、節點參照或深度劇情結構有誤時，驗證指令以狀態碼 1 結束；後端載入同一檔案時也會失敗。訊息會指出相關節點或選項，例如 `選項條件無效：start/act`。
- **警告（warning）**：警告不影響退出狀態（仍退出 0）或後端載入。同一節點於多個日期／AP 組合重複出現同類警告時，只列首次發現的日期與 AP 並標註其餘受影響組合數：
  - `unreachable_node`：僅沿選項連線檢查是否可從 `start`、`dayStarts` 或 `depthStarts` 抵達節點（不考慮條件與遊戲進度）。
  - `ap_blocked`／`crisis_blocked`：第 21 天以前，在該日期、AP、時段與旗標下，連「可能可達」路徑都找不到消耗 AP 的互動或第 15 天 `finishCrisis` 選項（確定卡關）。
  - `ap_conditional`：第 1～14 天或第 16～20 天（包含非主線分支），節點僅在假設未確定的病患數值或 MBTI 條件成立時才找得到消耗 AP 的互動路徑，缺乏無條件保底互動或返回主線的無條件對話。若同節點已有合法無條件替代路徑，不會發出此警告。
  - `crisis_conditional`：第 15 天（包含非主線分支）節點僅在假設動態條件成立時才找得到 `finishCrisis` 路徑，或從第 1 天到完成第 15 天事件的整體路徑只在假設動態條件成立時可達。
  - `crisis_missing`：從第 1 天起點找不到可在第 15 天執行 `finishCrisis` 的路徑（例如 `depth.example.json` 僅涵蓋深度劇情測試而缺少第 15 天完成選項）。
  - **`dayStarts` 獨立檢查**：若前置天數卡關導致主流程中斷，驗證器仍會對後續尚未抵達、明確設定的 `dayStarts`（第 2～20 天）獨立掃描，並於警告訊息標註「`獨立檢查 dayStarts 入口，前置天數未從第 1 天抵達`」。獨立檢查僅驗證該入口後續區段本身是否卡關，不代表可從第 1 天實際抵達，也不會消除 `crisis_missing`。
- **需團隊確認**：第 15 天正式危機的完成條件，以及第 21 天的結局與通關判定，依 [團隊決策紀錄](DECISIONS.md) 處理。驗證器不將第 21 天的空節點判定為卡關或通關。

#### 可達性層級與靜態分析限制

驗證器區分四種層級，判讀警告時請勿混用：

1. **結構可達（`unreachable_node`）**：只看選項連線是否能從 `start`、`dayStarts`、`depthStarts` 抵達，不判斷任何條件或能否玩到該日。
2. **可能可達（`possible`）**：依現行日期、AP、時段與危機旗標展開對話與換日，並納入以下兩項靜態判定——若連可能可達路徑都無法脫離，回報 `ap_blocked`／`crisis_blocked`：
   - **MBTI 互斥條件**：在單一選項的巢狀 `all`／`any` 中檢查四組軸向互斥（例如同時要求 `E` 與 `I` 判為確定不可達），同時保留 `any` 內的合法替代分支（例如 `all([E, any([I, F])])` 仍保留 `E + F`）。
   - **病患正向效果來源分析**：病患信任與治癒值範圍為 0～100（`minimum <= 0` 一定成立、`minimum > 100` 一定不成立）。對 `0 < minimum <= 100`，驗證器會預先掃描結構可達節點的正向 `effect.patient` 來源與最早時機：日常 `dialogue` 正向效果在第 1 天 AP 5 即視為可達（不假設第 1 天 AP 5 必為 0）；僅日常 `interaction` 正向效果自第 1 天 AP 4 或第 2 天起可達；僅深度劇情節點自第 5 天起可達；僅 `finishCrisis` 自危機完成後或第 16 天起可達；全劇情皆無正向效果時判為確定不可達。
3. **無條件保底路徑（`guaranteed`）**：不依賴未知病患門檻（`minimum > 0`）或 `lockedPreference` 即可消耗 AP 或完成第 15 天危機的路徑。若可能可達成立但缺乏保底路徑，回報 `ap_conditional`／`crisis_conditional`。
4. **實際遊戲可達性（需實機試玩）**：靜態分析無法替代試玩。目前**未**完整模擬：
   - 病患數值的實際累積上限、負向扣減，或條件式正向效果本身的解鎖前提。
   - MBTI 效果來源（僅判斷單一選項內的互斥一致性，不檢查劇情是否提供對應傾向的 `mbti` 正向效果）。
   - 跨選項的 MBTI 互斥（例如進入節點需 `E`、離開節點僅能靠 `I` 分散於兩個選項時，仍以 `ap_conditional`／`crisis_conditional` 提示試玩，不升級為確定卡關）。
   - 深度劇情的跨檻排程、同日衝突與觸發流程。

驗證通過後，可載入後端實際試玩：

```powershell
$env:GAME_STORY_FILE = (Resolve-Path backend/stories/你的檔案.json).Path
npm run dev
```

再到首頁「後端測試模式」建立新遊戲。

### 交付新劇情給程式組

1. 從最新 `main` 建立分支，例如 `story/patient-a-depth`。
2. 將劇情 JSON 放在 `backend/stories/`，檔名使用英文與連字號（建議，非強制）。
3. 執行上方的 `story:validate`，必須通過。
4. 以後端測試模式實際走過新增的分支，確認文字、跳轉與數值效果符合預期。
5. 開 Pull Request，說明新增或修改的節點、涉及的病患與天數，並列出任何需要團隊決定的規則問題。
6. 若需要目前格式不支援的功能（新欄位、新條件、說話者、背景圖等），請另開 Issue 給程式組，不要直接修改引擎程式或自行擴充格式。

---

## 二、正式劇情交付驗收

以同一個 commit 驗證交付的 JSON，並把檔名、驗證結果與實際跑過的分支記在 PR。先跑既有 fixture 建立基準，再驗證這次交付的檔案。

### Windows PowerShell 驗證

在專案根目錄執行。傳給驗證器的相對路徑以 `backend/` 為基準。每次執行後立即讀取 `$LASTEXITCODE`。

```powershell
npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }

npm run story:validate --workspace backend -- ./stories/day-1-21.fixture.json
if ($LASTEXITCODE -ne 0) { throw '21-day fixture validation failed' }

npm run story:validate --workspace backend -- ./stories/depth.example.json
if ($LASTEXITCODE -ne 0) { throw 'Depth example validation failed' }
```

| 檔案 | 驗證預期 | 試跑預期 |
| --- | --- | --- |
| `day-1-21.fixture.json` | 退出 0，無警告 | 每天從 `daily` 延續。第 15 天完成測試事件後可進入第 16 天，流程可到第 21 天。 |
| `depth.example.json` | 退出 0，出現 `crisis_blocked`、`crisis_missing` | 第 5 天進入病患 A 的深度劇情，再回到 `daily`。第 15 天因沒有完成選項而停住。 |

驗證交付檔時，在根目錄執行下列指令並輸入檔案路徑，例如 `backend/stories/patient-a.json`。使用絕對路徑可讓驗證器與後端使用同一份檔案。

```powershell
$deliveryStory = (Resolve-Path -LiteralPath (Read-Host '劇情 JSON 路徑') -ErrorAction Stop).Path
npm run story:validate --workspace backend -- "$deliveryStory"
if ($LASTEXITCODE -ne 0) { throw 'Story validation failed' }
```

### 試跑步驟

每次從專案根目錄指定一份 JSON、重新啟動服務並開新局。先以 `day-1-21.fixture.json` 試跑，再按 `Ctrl+C` 停止服務，把下方檔名改成 `depth.example.json` 或改用上一步取得的 `$deliveryStory`，重跑對應案例。試跑結束後可用 `Remove-Item Env:GAME_STORY_FILE` 清除設定。

```powershell
$env:GAME_STORY_FILE = (Resolve-Path -LiteralPath 'backend/stories/day-1-21.fixture.json').Path
npm run dev
```

開啟 Vite 終端顯示的網址，選擇「後端測試模式」→「建立新遊戲」。

1. **AP 與一般換日**。使用 21 天 fixture。第 1 天先選「測試對話」，確認 AP 維持 5。「測試自由行動」每次扣 1 AP，剩餘 AP 大於 0 時無法換日。AP 歸零後按「下一天」，確認第 2 天 AP 恢復為 5，節點延續 `daily`。
2. **第 15 天危機與第 16 天**。同一局的一般日用完 AP 後逐日換日。第 15 天確認 AP 為 0、MBTI 已鎖定、自由行動不可用，且事件完成前無法換日。選「標記第 15 天測試事件完成」再換日，確認第 16 天 AP 為 5、MBTI 仍鎖定，並回到日常流程。需要驗收完整基準時，繼續到第 21 天並確認無法換到第 22 天。
3. **深度劇情與返回**。使用深度劇情範本。第 1～3 天每天選五次「測試互動」再換日。第 4 天先選四次「測試互動」，最後選「測試超過信任門檻」，確認 A 的信任值升到 51。換到第 5 天後應顯示 A 的深度劇情，AP 為 5。選「繼續」到結尾，再按「完成深度劇情」，確認返回 `daily`、AP 仍為 5。繼續換到第 15 天，確認沒有危機完成選項且無法進入第 16 天。
4. **有設定的每日入口**。兩份 JSON 都省略 `dayStarts`，用來重現延續原節點的行為。透過下方後端測試重現設定入口的情境。`DayStarts.test.ts` 涵蓋一般換日、第 15 天入口與第 16 天入口，`DepthDay15Routes.test.ts` 涵蓋第 5 天先跑深度劇情、結束後回到當天設定的入口。交付檔有配置 `dayStarts` 時，另在試跑紀錄對照實際到達的節點與設定值。

### 警告、錯誤與分析限制

- **錯誤**會使驗證以狀態碼 1 結束。修正 JSON、欄位、節點參照或深度劇情結構後重跑。
- **警告**的退出碼仍為 0。逐項記下警告代碼、日期、AP、節點及處理結果：
  - `ap_blocked`、`crisis_blocked`、`crisis_missing` 指出確定卡關或從第 1 天無法抵達第 15 天危機（包含單一選項內互斥 MBTI 條件或全劇情缺乏病患正向效果來源所導致的不可達），正式交付需確認並處理。
  - `ap_conditional`（第 1～14 天與第 16～20 天，含非主線分支）與 `crisis_conditional`（第 15 天主線或非主線分支）代表節點缺乏無條件保底路徑，需在試跑紀錄分別驗證條件成立與不成立的情境。
  - 訊息含「`獨立檢查 dayStarts 入口，前置天數未從第 1 天抵達`」者，表示前置天數已中斷、驗證器僅獨立檢查該 `dayStarts` 區段；修復前置卡關後應重跑驗證，不可將獨立檢查視為從第 1 天實際可達。
  - `unreachable_node` 僅為結構可達檢查（沿選項連線），與可能可達、無條件保底路徑及實際遊戲可達性分屬不同層級。
- **靜態分析限制**：驗證器雖已檢查日期、AP、時段、危機旗標、單一選項內巢狀 `all`／`any` 的 MBTI 互斥與病患正向效果最早來源時機（含第 1 天 AP 5 的 `dialogue` 正向效果），但**未**完整模擬病患數值累積、MBTI 效果來源、跨選項互斥及深度劇情排程。即使驗證無警告，仍須實際試跑受影響的分支。涉及正式危機與結局的待決事項，請引用 [決策紀錄](DECISIONS.md)。

### 交付檢查表

- [ ] 交付 JSON 的檔名、commit、涵蓋天數、病患及新增或修改的節點已列於 PR。
- [ ] JSON 驗證退出 0，警告已逐項記錄並附處理結果。
- [ ] 核對 `start` 與受影響的 `dayStarts`，並驗證一般互動、對話和換日的 AP 行為。
- [ ] 受影響的深度劇情能依條件觸發、走到結尾並回到預期的日常節點。
- [ ] 若交付範圍涉及第 15 天，已驗證完成前阻擋換日、完成後進入第 16 天，並核對 AP 與 MBTI 鎖定狀態。
- [ ] 記錄各條件分支的試跑結果，標明不適用、未覆蓋或待決項目及原因。
- [ ] 後端型別檢查、前後端測試與正式建置通過。

```powershell
npm run typecheck --workspace backend
if ($LASTEXITCODE -ne 0) { throw 'Backend type-check failed' }

npm test --workspace backend
if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed' }

npm test --workspace frontend
if ($LASTEXITCODE -ne 0) { throw 'Frontend tests failed' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
```

### 分支試跑紀錄範本

複製到 PR，每條有差異的選項路徑各填一列。條件分支可從新局重走，並記錄重現所需的初始狀態或先前選擇。

```markdown
- 分支與 commit：
- 劇情檔與驗證環境（Windows、Node.js 版本）：
- 靜態驗證退出碼、警告與處理結果：
- 覆蓋天數、病患及入口：
- 未覆蓋、待決項目與相關 Issue：

| 案例 | 起始日／節點／AP 與條件 | 操作或選項順序 | 預期日／節點／AP 與狀態 | 實際結果 | 通過／失敗／不適用及證據 |
| --- | --- | --- | --- | --- | --- |
| 每日入口 | | | | | |
| 深度劇情與返回 | | | | | |
| 第 15 天與第 16 天 | | | | | |
```

---

## 三、前端本機示範資料（僅供示範）

### 檔案位置

- `frontend/src/stories/chapter-001.js`：目前可執行的**中性示範**。
- `frontend/src/stories/chapter-template.example.js`：示範章節格式範本。
- `frontend/src/stories/index.js`：匯入並組合所有章節，指定起點 `START_NODE`。
- `frontend/public/assets/backgrounds/`、`characters/`、`audio/`：素材資料夾（目前為空，素材需確認授權）。

### 單個節點範例

```js
example_001: {
  scene: '場景名稱',
  speaker: '說話的人',
  text: '對話或旁白文字',
  options: [
    { label: '玩家看到的選項文字', next: 'example_002' },
  ],
}
```

`example_001` 是唯一節點 ID。`next` 要指向已存在的節點。`options: []` 表示分支結束。多個章節不能使用重複的節點 ID。

### 新增示範章節

1. 複製 `chapter-template.example.js` 為 `chapter-002.js`。
2. 修改節點 ID、說話者、對話、選項及 `next`。
3. 在 `index.js` 匯入 `chapter002`，將 `story` 改為 `{ ...chapter001, ...chapter002 }`。
4. 以「開始示範劇情」逐一測試分支。

本機示範畫面只實作 `scene`、`speaker`、`text`、`options`，沒有 AP、病患數值或 MBTI 等遊戲規則。正式劇情請依第一節的後端劇情 JSON 製作，並依第二節驗收。
