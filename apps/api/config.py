"""
OMNIA configuration — loaded from environment variables.
All secrets live here and NOWHERE else in the codebase.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ─── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://omnia:omnia_dev@localhost:5432/omnia"

    # ─── Redis ──────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── Upstash Redis (REST) — durable user store on serverless/Vercel ───────
    # Set either the Upstash-native names or Vercel KV's KV_REST_API_* names.
    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""
    KV_REST_API_URL: str = ""
    KV_REST_API_TOKEN: str = ""

    # ─── Qdrant ─────────────────────────────────────────────────────────────
    QDRANT_URL: str = "http://localhost:6333"

    # ─── OpenAI ─────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    LLM_GENERATION_MODEL: str = "gpt-4o"
    LLM_FAST_MODEL: str = "gpt-4o-mini"
    LLM_MAX_TOKENS: int = 4096
    LLM_DEMO_TIMEOUT_SECONDS: int = 4

    # ─── Third-party / local model endpoints ─────────────────────────────────
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_API_URL: str = "https://openrouter.ai/api/v1"
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    # Cloud Translation API (falls back to GOOGLE_API_KEY when empty)
    GOOGLE_TRANSLATE_API_KEY: str = ""
    # Resend email (server-side only; never expose this key to the web app)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = ""
    # Social sign-in (provider credentials remain server-side)
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    GITHUB_OAUTH_CLIENT_ID: str = ""
    GITHUB_OAUTH_CLIENT_SECRET: str = ""
    APPLE_OAUTH_CLIENT_ID: str = ""
    APPLE_OAUTH_TEAM_ID: str = ""
    APPLE_OAUTH_KEY_ID: str = ""
    APPLE_OAUTH_PRIVATE_KEY: str = ""
    # Base URLs for OAuth redirect + post-login return
    OAUTH_REDIRECT_BASE: str = "http://localhost:8000/api/v1"
    WEB_BASE_URL: str = "http://localhost:3000"
    DEEPSEEK_API_URL: str = ""
    DEEPSEEK_API_KEY: str = ""
    QWEN_API_URL: str = ""
    QWEN_API_KEY: str = ""
    CODE_LLAMA_API_URL: str = ""
    CODE_LLAMA_API_KEY: str = ""
    MISTRAL_API_KEY: str = ""
    XAI_API_KEY: str = ""

    # ─── Agent tools (search / fetch / sandbox / browser / MCP) ───────────────
    BRAVE_SEARCH_API_KEY: str = ""
    TAVILY_API_KEY: str = ""
    EXA_API_KEY: str = ""
    PISTON_API_URL: str = "https://emkc.org/api/v2"
    E2B_API_KEY: str = ""
    BROWSERBASE_API_KEY: str = ""
    BROWSERBASE_PROJECT_ID: str = ""
    # JSON list: [{"name":"github","transport":"stdio","command":"npx","args":["-y","@modelcontextprotocol/server-github"]}]
    MCP_SERVERS_JSON: str = ""

    # ─── Cursor AI SDK (coding agents / cloud PRs) ───────────────────────────
    CURSOR_API_KEY: str = ""
    CURSOR_DEFAULT_MODEL: str = "composer-2.5"
    CURSOR_DEFAULT_RUNTIME: str = "local"  # local | cloud
    CURSOR_DEFAULT_CWD: str = ""  # empty → process cwd
    CURSOR_RUN_TIMEOUT_SECONDS: int = 600

    # ─── JWT ────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    # 30 days — sessions should survive coming back later / opening an agent.
    # A short TTL made the SPA hard-log-out on the first 401 after expiry.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43_200

    # ─── Demo Mode (§11.2) ──────────────────────────────────────────────────
    DEMO_MODE: bool = False

    # ─── Budget / Rate control (§7.4) ────────────────────────────────────────
    DAILY_TOKEN_BUDGET_PER_USER: int = 100_000

    # ─── Execution Intelligence Layer ───────────────────────────────────────
    # When true, ModelRouter blends registry scores with observed performance.
    ADAPTIVE_ROUTING: bool = False

    # ─── Product Factory (Create invent pipeline) ───────────────────────────
    # When true, Create invents a full product blueprint (IA/nav/design) before AI core.
    PRODUCT_FACTORY: bool = True


settings = Settings()
