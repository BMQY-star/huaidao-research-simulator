# 导师模拟器（huaidaoshimoniqi）

一个基于 React + TypeScript 的网页模拟器：你扮演高校导师，招募学生、推进课题与论文，在季度循环里平衡经费/心态/声望等指标。部分叙事内容由 LLM 动态生成（导师档案、学生画像、随机论文事件等），未配置 LLM 时会自动使用兜底内容。

## 快速开始
1) 安装依赖：`npm install`
2) 启动后端：`npm run server`（默认 `http://localhost:4000`）
3) 启动前端：`npm run dev`（默认 `http://localhost:5173`，并代理 `/api/*` 到后端）

## 配置
### 后端（可选接入 LLM）
后端优先读取 `server/config/llmConfig.json`（已在 `.gitignore` 中忽略），示例：
```json
{
  "apiUrl": "http(s)://<openai-compatible-endpoint>/openai/v1/responses",
  "apiKey": "<your_api_key>",
  "model": "gpt-5.1-codex-max"
}
```

也可通过环境变量覆盖：`LLM_API_URL` / `LLM_API_KEY` / `LLM_MODEL`。

### 前端（Vite 环境变量）
复制 `.env.example` 为 `.env`，常用变量：
- `VITE_BACKEND_PORT`：开发时 Vite 代理后端端口（默认 4000）
- `VITE_API_BASE_URL`：生产构建时的 API 基础地址（同域部署可留空）

## 常用命令
- `npm run dev`：启动前端开发服务器（HMR）
- `npm run server`：启动后端 API
- `npm run build`：类型检查并构建生产包
- `npm run preview`：本地预览生产构建
- `npm run lint`：运行 ESLint

## 文档
- `玩法说明.md`
- `特质说明.md`
- `开发文档.md`
- `接口文档.md`
