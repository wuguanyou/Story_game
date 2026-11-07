# 互動劇情遊戲｜小組共同開發框架

> **目前主題未定。** 本專案僅提供通用網站介面、互動劇情分支、前後端骨架與協作文件。範例劇情不是正式故事，暫不設定角色、世界觀或心理測驗。

## 快速開始

需安裝 Node.js **20.19+**、npm、Git。於專案根目錄執行：

```bash
npm install
npm run dev
```

開啟 http://localhost:5173/ 。後端 API 為 http://127.0.0.1:3001/api/health 。使用 Ctrl+C 結束。

## 程式在哪裡？

- **劇情作者**：`frontend/src/stories/`，先讀 [劇情編寫指南](docs/STORY_GUIDE.md)。
- **前端作者**：`frontend/src/App.jsx`、`frontend/src/components/`、`frontend/src/styles.css`。
- **美術**：`frontend/public/assets/`（背景、角色、音效分類存放）。
- **後端**：`backend/src/server.js`，目前只有健康檢查等基本 API。
- **文件與協作**：`docs/`，見 [協作說明](docs/COLLABORATION.md)。

## 已有的功能

- 分支劇情示範。
- README、劇情指南、開發日誌、決策紀錄與 PR 模板。

## 文件應怎麼維護？

- **README.md：必備。**  5 分鐘內應能知道專案用途、如何啟動、去哪裡修改。
- **docs/DEVLOG.md：建議保留。** 記錄重要進度與阻礙，不必每次提交都寫長篇日記。
- **docs/DECISIONS.md：建議保留。** 主題、工具、分工等尚未決定之事項可以記錄討論結論，避免日後爭議。
- **GitHub Issues / Pull Requests：** 每項工作與程式碼審查細節放這裡；開發日誌只保留里程碑摘要，避免重複維護。

## GitHub 建議

每人建立 feature 分支並透過 Pull Request 合併到 `main`。禁止提交 `.env`、密碼、金鑰及 `node_modules`。如先在 GitHub 建立了 README，請用 clone/pull 或小心合併，不要強制推送覆蓋組員變更。
