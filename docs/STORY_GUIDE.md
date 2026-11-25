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
- **警告（warning）**：驗證指令會列出從一般起點、每日劇情入口與各深度劇情入口都無法連到的節點，以及第 21 天以前可能因找不到互動而無法消耗剩餘 AP 的分支。第 15 天會檢查是否能直接或經過對話執行 `finishCrisis`，並提示無法完成的分支或依賴病患數值、MBTI 的路徑。警告不影響退出狀態或後端載入。短範本可能只涵蓋部分天數，例如 `depth.example.json` 會提示缺少可完成第 15 天的路徑。
- **需團隊確認**：第 15 天正式危機的完成條件，以及第 21 天的結局與通關判定，依 [團隊決策紀錄](DECISIONS.md) 處理。驗證器不將第 21 天的空節點判定為卡關或通關。

可玩性檢查依現行日期、AP、時段與危機旗標追蹤節點。病患數值與 MBTI 會隨選擇歷史改變，檢查只估算這些條件能否影響路徑，無法判定多個條件能否同時滿足，也不模擬深度劇情排程或效果。涉及這些條件的分支仍需實際試玩。

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

## 二、前端本機示範資料（僅供示範）

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

本機示範畫面只實作 `scene`、`speaker`、`text`、`options`，沒有 AP、病患數值或 MBTI 等遊戲規則。正式劇情請依第一節的後端劇情 JSON 製作。
