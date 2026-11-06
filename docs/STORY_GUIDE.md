# 劇情編寫指南

## 劇情放哪裡？

- `frontend/src/stories/chapter-001.js`：目前可執行的**中性示範**。
- `frontend/src/stories/chapter-template.example.js`：新章節格式範本；請複製、重新命名。
- `frontend/src/stories/index.js`：匯入並組合所有章節，指定故事起點 `START_NODE`。
- `frontend/public/assets/backgrounds/`：背景圖。
- `frontend/public/assets/characters/`：人物立繪。
- `frontend/public/assets/audio/`：音效與音樂素材（確認授權）。

## 單個節點範例

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

`example_001` 是唯一節點 ID。`next` 要指向已存在的節點，否則無法前往。`options: []` 表示分支結束。多個章節不能使用重複的節點 ID；推薦 `ch01_001`、`ch02_001` 等命名。

## 新增章節的步驟

1. 複製 `chapter-template.example.js` 為 `chapter-002.js`。
2. 修改節點 ID、說話者、對話、選項及 next。
3. 在 `index.js` 匯入 `chapter002`，將 `story` 改為 `{ ...chapter001, ...chapter002 }`。
4. 在遊戲中逐一測試分支；跨章節的 next 也能指向另一章節的節點。
5. 透過 PR 請組員確認劇情與資料格式。

目前 UI **只實作** `scene`、`speaker`、`text`、`options`。背景圖、角色立繪、好感度、條件式選項及音效需要前端組員增加支援後才能啟用；不要以為新增欄位就會自動顯示。

目前未決定題材，因此請避免在共用範例資料中直接加入特定世界觀。正式劇情草稿可等團隊確認方向後才合併。
