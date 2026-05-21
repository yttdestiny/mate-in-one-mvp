# Mate-in-One MVP

一个最小可运行的前端原型，使用 `react-chessboard` + `chess.js` 实现一步将死题目的交互与验证。可部署到 Vercel 或 GitHub Pages（静态站点）。

快速开始：

```bash
cd /path/to/mate-in-one-mvp
npm install
npm run dev
```
 
Backend API (optional):

```bash
cd /path/to/mate-in-one-mvp/server
npm install
node index.js
# server listens on port 4000
```

APIs:
- `GET /api/problems` - list problems
- `POST /api/verify` - body `{ fen, from, to }` -> `{ valid, mate }`
- `POST /api/users/register` - body `{ username }`
- `GET /api/leaderboard` - top users
- `POST /api/submit` - record attempt `{ userId, problemId, correct }`

CI:
- A GitHub Actions workflow is added at `.github/workflows/ci.yml` to install and build the frontend.

自动推送到 GitHub：（两种可选脚本）

1. 使用 `gh` CLI（推荐，需先登录）：

```bash
cd /path/to/mate-in-one-mvp
./scripts/create_github_repo.sh youruser/mate-in-one-mvp
```

2. 使用 GitHub Token（CI/CD 服务器或无 gh 时使用）：

```bash
cd /path/to/mate-in-one-mvp
./scripts/create_github_repo_with_token.sh youruser/mate-in-one-mvp YOUR_GITHUB_TOKEN
```

安全注意：第二个脚本会把 token 暂时放入远程 URL 中以便推送，操作完成后请删除该远程或更新远程 URL：

```bash
git remote set-url origin https://github.com/youruser/mate-in-one-mvp.git
```

在 GitHub 上创建仓库后，可连接 Vercel：

- 在 Vercel 控制台选择“Import Project”，连接到刚创建的 GitHub 仓库。
- Build Command: `npm run build`，Output Directory: `dist`。
- 设置 Environment Variables（若需要后端 API 地址等）。


主要文件：
- [src/App.tsx](src/App.tsx) - 页面入口与题目切换
- [src/components/ChessProblemBoard.tsx](src/components/ChessProblemBoard.tsx) - 棋盘与验证逻辑
- [src/data/problems.json](src/data/problems.json) - 示例题库
