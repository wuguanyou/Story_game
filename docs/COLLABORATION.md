# GitHub 小組協作

- 前端：`frontend/src/App.jsx`、`frontend/src/components/`、`frontend/src/styles.css`
- 劇情：`frontend/src/stories/`（先讀 `docs/STORY_GUIDE.md`）
- 美術：`frontend/public/assets/`
- 後端：`backend/src/`
- 文件：`README.md`、`docs/`

## 分支流程

1. `git pull origin main`
2. `git switch -c feat/story-ch01`（名稱依工作調整）
3. 修改並測試，使用 `git add .`、`git commit -m "feat: add story nodes"`。
4. `git push -u origin feat/story-ch01`
5. GitHub 建 Pull Request，至少一位其他組員確認後合併。

每項工作先開 Issue，分支與 PR 引用 Issue。不要直接推送未審核的修改到 main。

README 記錄「怎麼用」，DEVLOG 記錄「做了什麼」，DECISIONS 記錄「為何這樣決定」，Issue 記錄「誰要做什麼」，請避免同一件事重複寫五份。

不要提交 `.env`、密碼、Token、真實個資、`node_modules`。
