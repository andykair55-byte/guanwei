# spec-19 前端安全加固 + LLM 代理端点

## 背景
1. **前端 LLM 设置 CORS 问题**：`src/stores/llmStore.ts:66` 的 `testConnection` 直接从浏览器 fetch 书生 API，浏览器跨域请求被书生 API 的 CORS 拦截，报 "fail to fetched"。需要改为通过后端代理。
2. **前端 localStorage 存储 token**：XSS 攻击可窃取 token，需评估风险并加固
3. **前端无 XSS 防护**：富文本渲染（react-markdown）未配置 sanitize

## 现状
- ✅ 后端已有 `/admin/llm/health` 端点（spec-11）
- ✅ 后端已有 CORS 白名单（spec-12）
- ✅ 前端 api.ts 有 withFallback 机制
- ❌ llmStore.ts testConnection 直接浏览器 fetch 第三方 API
- ❌ localStorage 存储 token（XSS 风险）
- ❌ react-markdown 未配置 rehype-sanitize

## 任务范围

### 任务 1：LLM testConnection 改为后端代理
- 后端新增端点 `POST /api/v1/admin/llm/test-connection`（在 `backend/api/admin_routes.py`）：
  ```python
  @router.post("/admin/llm/test-connection", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
  async def test_llm_connection(
      payload: dict,
      current_user: User = Depends(require_admin),
  ):
      """测试 LLM 连接（后端代理，避免浏览器 CORS）"""
      provider = payload.get("provider")
      api_key = payload.get("api_key")
      base_url = payload.get("base_url")  # 自定义端点
      
      if not provider or not api_key:
          return {"success": False, "error": "provider 和 api_key 必填"}
      
      try:
          from openai import AsyncOpenAI
          import httpx
          
          # 构建客户端
          client_kwargs = {"api_key": api_key}
          if base_url:
              client_kwargs["base_url"] = base_url
          elif provider == "deepseek":
              client_kwargs["base_url"] = "https://api.deepseek.com"
          # ... 其他 provider 的默认 base_url
          
          client = AsyncOpenAI(**client_kwargs, http_client=httpx.AsyncClient(timeout=10.0))
          
          # 发送极简测试请求
          response = await client.chat.completions.create(
              model="deepseek-chat" if provider == "deepseek" else "gpt-3.5-turbo",
              messages=[{"role": "user", "content": "1"}],
              max_tokens=1,
          )
          return {"success": True, "model": response.model}
      except Exception as e:
          return {"success": False, "error": str(e)}
  ```
- 先读 `backend/services/llm.py` 了解各 provider 的默认 base_url 配置，复用而非硬编码
- 前端修改 `src/stores/llmStore.ts` 的 `testConnection`：
  - 改为调用后端 `/admin/llm/test-connection` 端点
  - 通过 `api.ts` 的 `request` 函数发送（自动带 Authorization 头）
  - 不再从浏览器直接 fetch 第三方 API
  - 保留原有的 UI 交互逻辑（loading 状态、成功/失败提示）

### 任务 2：Token 存储加固
- 当前：`localStorage.setItem('token', ...)` — XSS 可窃取
- 评估方案：
  - **方案 A（推荐）**：保持 localStorage，但加 token 过期检查 + XSS 防护（任务 3）
  - **方案 B**：改用 httpOnly cookie — 需要后端配合，改动大，阶段 2 再做
- 本 spec 采用方案 A：
  - 在 `src/services/api.ts` 新增 token 过期检查：
    ```typescript
    function getToken(): string | null {
      const token = localStorage.getItem('token')
      if (!token) return null
      try {
        // JWT 过期检查（payload 第二段）
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          localStorage.removeItem('token')
          return null
        }
        return token
      } catch {
        return token // 非 JWT 格式，保持兼容
      }
    }
    ```
  - 在 `src/stores/authStore.ts` 的 `init` 方法加 token 过期检查

### 任务 3：XSS 防护（react-markdown sanitize）
- 安装 `rehype-sanitize` 包
- 搜索所有使用 `react-markdown` 的组件（用 Grep 搜 `react-markdown`）
- 给每个 `<ReactMarkdown>` 加 rehype 插件：
  ```tsx
  import ReactMarkdown from 'react-markdown'
  import rehypeSanitize from 'rehype-sanitize'
  
  <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
    {content}
  </ReactMarkdown>
  ```
- 先 Grep 找出所有使用 react-markdown 的文件，逐个修改
- 若组件较多（>5 个），可新建 `src/components/SafeMarkdown.tsx` 统一封装：
  ```tsx
  import ReactMarkdown from 'react-markdown'
  import remarkGfm from 'remark-gfm'
  import rehypeSanitize from 'rehype-sanitize'
  
  export function SafeMarkdown({ children }: { children: string }) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    )
  }
  ```
  然后替换所有 `<ReactMarkdown>` 为 `<SafeMarkdown>`

### 任务 4：前端输入 sanitization
- 检查用户输入直接渲染到 DOM 的场景（dangerouslySetInnerHTML）
- 用 Grep 搜 `dangerouslySetInnerHTML`，若有则改为 sanitized 版本
- 检查 `src/components/CommentSection.tsx`、`PostDetailModal.tsx` 等用户内容展示组件
- 若无 dangerouslySetInnerHTML（React 默认转义），则无需改动，只在报告中说明

### 任务 5：CSRF 防护评估
- 当前前后端分离 + JWT 认证，CSRF 风险低
- 评估是否需要 CSRF Token：
  - JWT 通过 Authorization 头发送（非 cookie），CSRF 不适用
  - 若未来改用 cookie 认证，再加 CSRF Token
- 本 spec 不做 CSRF 改动，只在报告中说明评估结论

## 不做的事
- 不改用 httpOnly cookie（阶段 2）
- 不加 CSP（Content-Security-Policy）— 应在前端部署配置（nginx/Pages）
- 不加 SRI（Subresource Integrity）
- 不做 CSP Report-Only
- 不改后端认证流程
- 不做 XSS 扫描器

## 验收
- `llmStore.ts` 的 `testConnection` 通过后端代理，不再有 CORS 错误
- 后端 `/admin/llm/test-connection` 端点正常工作（返回 success/error）
- 过期 token 自动清除（不再用过期 token 请求）
- 所有 `<ReactMarkdown>` 加了 rehype-sanitize（XSS 防护）
- `npm run build` 通过
- `npm run test` 全部通过
- `npm run lint` 无新增 error
- `cd backend && python -m py_compile api\admin_routes.py` 通过
