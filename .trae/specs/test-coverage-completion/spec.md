# spec-14 测试补齐

## 背景
项目已有测试框架和部分测试：
- ✅ pytest + fixtures（`tests/conftest.py`、`tests/fixtures/`）
- ✅ 单元测试：`test_points_calc.py`、`test_rank_calc.py`、`test_evidence_credibility.py`
- ✅ 集成测试：`test_guess_flow.py`、`test_pipeline_flow.py`、`test_user_flow.py`
- ✅ 测试工厂：`melon_factory.py`、`user_factory.py`
- ❌ 缺少 spec-11 LLM 矩阵故障转移测试
- ❌ 缺少 spec-12 安全加固测试（密码强度、CORS、限流）
- ❌ 缺少边界场景测试（并发猜瓜、积分透支、重复提交）
- ❌ `tests/legacy/test_ranks.py` 已损坏（ImportError: cannot import name 'RankCalculator'）

## 任务范围

### 任务 1：LLM 矩阵故障转移测试
- 新建 `backend/tests/unit/test_llm_matrix.py`
- 测试用例：
  - `test_key_pool_round_robin`：3 key 轮询，调用 3 次各用 1 个 key
  - `test_key_pool_rpm_limit`：rpm=2 时第 3 次调用返回 None
  - `test_key_pool_available_keys`：达限的 key 不在 available_keys 中
  - `test_circuit_breaker_open_after_threshold`：3 次失败后状态为 OPEN
  - `test_circuit_breaker_half_open_recovery`：recovery_timeout 后转 HALF_OPEN
  - `test_circuit_breaker_record_success_resets`：成功后重置为 CLOSED
  - `test_matrix_failover_to_next_key`：mock 第一个 key 抛 429，自动切第二个 key
  - `test_matrix_failover_to_next_provider`：mock provider 全部 key 熔断，切 fallback provider
- 使用 `unittest.mock.AsyncMock` mock AsyncOpenAI 客户端
- 不依赖真实 LLM API

### 任务 2：安全加固测试
- 新建 `backend/tests/unit/test_security.py`
- 测试用例：
  - `test_password_too_short`：密码 < 8 位返回 422
  - `test_password_no_letter`：纯数字密码返回 422
  - `test_password_no_digit`：纯字母密码返回 422
  - `test_username_invalid_chars`：含特殊字符的 username 返回 422
  - `test_username_too_long`：> 20 字符返回 422
  - `test_verify_content_too_long`：> 2000 字返回 422
  - `test_cors_headers_present`：响应包含安全头
  - `test_login_rate_limit`：60 秒内 6 次登录返回 429
- 使用 FastAPI TestClient

### 任务 3：边界场景测试
- 新建 `backend/tests/integration/test_edge_cases.py`
- 测试用例：
  - `test_duplicate_guess`：同一用户对同一瓜重复猜瓜返回错误
  - `test_guess_after_reveal`：瓜已开奖后猜瓜返回错误
  - `test_insufficient_points`：积分不足时操作返回错误（若适用）
  - `test_concurrent_guess`：模拟并发猜瓜（用 threading 或 asyncio）
  - `test_melon_not_found`：访问不存在的瓜返回 404
  - `test_unauthorized_access`：未登录访问需要认证的端点返回 401
  - `test_admin_access_required`：普通用户访问管理员端点返回 403

### 任务 4：修复 legacy 测试
- 检查 `tests/legacy/test_ranks.py` 的 ImportError
- 若 `RankCalculator` 已重命名或移除：
  - 找到替代实现，更新 import
  - 若功能已移到其他模块，更新测试指向新模块
- 若功能已完全删除：
  - 将 `test_ranks.py` 移到 `tests/legacy/_deprecated/` 或直接删除
  - 在 `tests/legacy/__init__.py` 中排除此文件
- 确认 `pytest tests/` 全部通过（包括 legacy 目录）

### 任务 5：测试覆盖率报告
- 在 `backend/requirements.txt` 或 `backend/requirements-dev.txt` 新增 `pytest-cov`
- 新增 `backend/pytest.ini` 配置：
  ```ini
  [pytest]
  testpaths = tests
  python_files = test_*.py
  python_classes = Test*
  python_functions = test_*
  addopts = --cov=services --cov=api --cov=pipeline --cov-report=term-missing --cov-report=html:htmlcov
  ```
- 运行 `pytest` 生成覆盖率报告
- 目标：services/ 覆盖率 > 60%，api/ 覆盖率 > 40%

## 不做的事
- 不做端到端（E2E）测试（前端不在本 spec 范围）
- 不 mock 真实 LLM API 调用（用单元测试覆盖即可）
- 不做性能测试（阶段 2 预留）
- 不重构现有测试（只补齐和修复）

## 验收
- `pytest tests/ -v` 全部通过（0 failed）
- `tests/legacy/` 不再报 ImportError
- 新增测试文件至少 3 个（test_llm_matrix.py、test_security.py、test_edge_cases.py）
- 新增测试用例至少 20 个
- 覆盖率报告生成成功（htmlcov/index.html）
