"""
OMNIA foundation model registry — 100+ models across major providers.

Single source of truth for catalog, task scoring, and OpenRouter routing.
Scores are design configuration (published docs + community benchmarks).
"""
from __future__ import annotations

from typing import Any


def _m(
    name: str,
    display: str,
    provider: str,
    family: str,
    *,
    cost: float,
    latency: int,
    reasoning: float,
    creativity: float,
    privacy: int = 3,
    context: int = 128_000,
    openrouter_id: str | None = None,
    capabilities: list[str] | None = None,
    free: bool = False,
    coding: float | None = None,
    vision: float | None = None,
    tools: bool = True,
) -> dict[str, Any]:
    caps = list(capabilities or [])
    if tools and "tools" not in caps:
        caps.append("tools")
    if free and "free" not in caps:
        caps.append("free")
    return {
        "name": name,
        "display_name": display,
        "provider": provider,
        "family": family,
        "cost_per_1k": cost,
        "avg_latency_ms": latency,
        "reasoning_score": reasoning,
        "creativity_score": creativity,
        "coding_score": coding if coding is not None else reasoning * 0.92,
        "vision_score": vision if vision is not None else 0.0,
        "privacy_tier": privacy,
        "context_window": context,
        "openrouter_id": openrouter_id or name,
        "capabilities": caps,
        "supports_tools": tools,
        "free": free,
    }


MODEL_TABLE: list[dict[str, Any]] = [
    # OpenAI
    _m("gpt-5", "GPT-5", "openai", "GPT", cost=0.01, latency=2200, reasoning=9.9, creativity=9.5, context=1_000_000, openrouter_id="openai/gpt-5", capabilities=["reasoning", "coding", "multimodal"], vision=9.5),
    _m("gpt-5-thinking", "GPT-5 Thinking", "openai", "Reasoning", cost=0.025, latency=14000, reasoning=10.0, creativity=9.0, context=400_000, openrouter_id="openai/gpt-5-thinking", capabilities=["reasoning", "coding"], coding=9.9),
    _m("gpt-5-mini", "GPT-5 Mini", "openai", "GPT", cost=0.0008, latency=900, reasoning=8.8, creativity=8.4, context=400_000, openrouter_id="openai/gpt-5-mini", capabilities=["coding", "speed"], vision=8.0),
    _m("gpt-5-nano", "GPT-5 Nano", "openai", "GPT", cost=0.00015, latency=400, reasoning=7.2, creativity=7.0, context=200_000, openrouter_id="openai/gpt-5-nano", capabilities=["speed"]),
    _m("gpt-4.1", "GPT-4.1", "openai", "GPT", cost=0.004, latency=1600, reasoning=9.3, creativity=8.7, context=1_000_000, openrouter_id="openai/gpt-4.1", capabilities=["coding", "long_context"], coding=9.4, vision=8.5),
    _m("gpt-4.1-mini", "GPT-4.1 Mini", "openai", "GPT", cost=0.0004, latency=700, reasoning=8.0, creativity=7.5, context=1_000_000, openrouter_id="openai/gpt-4.1-mini", capabilities=["coding", "speed"], coding=8.2),
    _m("gpt-4.1-nano", "GPT-4.1 Nano", "openai", "GPT", cost=0.0001, latency=450, reasoning=6.8, creativity=6.5, context=1_000_000, openrouter_id="openai/gpt-4.1-nano", capabilities=["speed"]),
    _m("o3", "o3", "openai", "Reasoning", cost=0.02, latency=10000, reasoning=9.8, creativity=8.2, context=200_000, openrouter_id="openai/o3", capabilities=["reasoning", "coding"], coding=9.7),
    _m("o4-mini", "o4-mini", "openai", "Reasoning", cost=0.0035, latency=4000, reasoning=9.4, creativity=8.0, context=200_000, openrouter_id="openai/o4-mini", capabilities=["reasoning", "coding"], coding=9.3),
    _m("gpt-4o", "GPT-4o", "openai", "GPT", cost=0.005, latency=1800, reasoning=9.0, creativity=8.5, context=128_000, openrouter_id="openai/gpt-4o", capabilities=["multimodal", "coding"], vision=9.0),
    _m("gpt-4o-mini", "GPT-4o mini", "openai", "GPT", cost=0.0002, latency=800, reasoning=7.5, creativity=7.0, context=128_000, openrouter_id="openai/gpt-4o-mini", capabilities=["speed", "coding"], vision=7.5),
    _m("o1", "o1", "openai", "Reasoning", cost=0.03, latency=12000, reasoning=9.7, creativity=8.0, context=200_000, openrouter_id="openai/o1", capabilities=["reasoning"]),
    _m("o1-mini", "o1 mini", "openai", "Reasoning", cost=0.006, latency=6000, reasoning=9.0, creativity=7.5, context=128_000, openrouter_id="openai/o1-mini", capabilities=["reasoning", "coding"]),
    _m("o3-mini", "o3 mini", "openai", "Reasoning", cost=0.004, latency=4500, reasoning=9.2, creativity=7.8, context=200_000, openrouter_id="openai/o3-mini", capabilities=["reasoning", "coding"]),
    # Anthropic
    _m("claude-opus-4", "Claude Opus 4", "anthropic", "Claude", cost=0.02, latency=2200, reasoning=9.8, creativity=9.4, privacy=4, context=200_000, openrouter_id="anthropic/claude-opus-4", capabilities=["reasoning", "coding", "writing"], coding=9.7),
    _m("claude-sonnet-4", "Claude Sonnet 4", "anthropic", "Claude", cost=0.004, latency=1400, reasoning=9.5, creativity=9.1, privacy=4, context=200_000, openrouter_id="anthropic/claude-sonnet-4", capabilities=["coding", "writing", "agents"], coding=9.6),
    _m("claude-haiku-4", "Claude Haiku 4", "anthropic", "Claude", cost=0.0005, latency=500, reasoning=8.2, creativity=8.0, privacy=4, context=200_000, openrouter_id="anthropic/claude-haiku-4", capabilities=["speed", "coding"]),
    _m("claude-3.7-sonnet", "Claude 3.7 Sonnet", "anthropic", "Claude", cost=0.0035, latency=1500, reasoning=9.4, creativity=9.0, privacy=4, context=200_000, openrouter_id="anthropic/claude-3.7-sonnet", capabilities=["coding", "reasoning"], coding=9.5),
    _m("claude-3-5-sonnet", "Claude 3.5 Sonnet", "anthropic", "Claude", cost=0.003, latency=1500, reasoning=9.2, creativity=8.8, privacy=4, context=200_000, openrouter_id="anthropic/claude-3.5-sonnet", capabilities=["coding", "writing"], coding=9.3),
    _m("claude-3-5-haiku", "Claude 3.5 Haiku", "anthropic", "Claude", cost=0.0004, latency=550, reasoning=7.8, creativity=7.6, privacy=4, context=200_000, openrouter_id="anthropic/claude-3.5-haiku", capabilities=["speed"]),
    _m("claude-3-opus", "Claude 3 Opus", "anthropic", "Claude", cost=0.015, latency=2500, reasoning=9.4, creativity=9.2, privacy=4, context=200_000, openrouter_id="anthropic/claude-3-opus", capabilities=["reasoning", "writing"]),
    _m("claude-3-sonnet", "Claude 3 Sonnet", "anthropic", "Claude", cost=0.003, latency=1600, reasoning=8.6, creativity=8.4, privacy=4, context=200_000, openrouter_id="anthropic/claude-3-sonnet", capabilities=["writing"]),
    _m("claude-3-haiku", "Claude 3 Haiku", "anthropic", "Claude", cost=0.00025, latency=450, reasoning=7.2, creativity=7.0, privacy=4, context=200_000, openrouter_id="anthropic/claude-3-haiku", capabilities=["speed"]),
    _m("claude-instant", "Claude Instant (legacy)", "anthropic", "Claude", cost=0.0008, latency=600, reasoning=6.5, creativity=6.8, privacy=4, context=100_000, openrouter_id="anthropic/claude-instant-1.2", capabilities=["speed"], tools=False),
    # Google
    _m("gemini-2.5-pro", "Gemini 2.5 Pro", "google", "Gemini", cost=0.0025, latency=2000, reasoning=9.6, creativity=9.0, context=1_000_000, openrouter_id="google/gemini-2.5-pro", capabilities=["reasoning", "multimodal", "long_context"], vision=9.4, coding=9.3),
    _m("gemini-2.5-flash", "Gemini 2.5 Flash", "google", "Gemini", cost=0.0003, latency=700, reasoning=8.8, creativity=8.4, context=1_000_000, openrouter_id="google/gemini-2.5-flash", capabilities=["speed", "multimodal", "long_context"], vision=8.8),
    _m("gemini-2.5-flash-lite", "Gemini 2.5 Flash Lite", "google", "Gemini", cost=0.0001, latency=400, reasoning=7.6, creativity=7.4, context=1_000_000, openrouter_id="google/gemini-2.5-flash-lite", capabilities=["speed"]),
    _m("gemini-2.0-flash", "Gemini 2.0 Flash", "google", "Gemini", cost=0.0002, latency=650, reasoning=8.4, creativity=8.2, context=1_000_000, openrouter_id="google/gemini-2.0-flash", capabilities=["speed", "multimodal"], vision=8.5),
    _m("gemini-2.0-flash-lite", "Gemini 2.0 Flash Lite", "google", "Gemini", cost=0.00008, latency=350, reasoning=7.2, creativity=7.0, context=1_000_000, openrouter_id="google/gemini-2.0-flash-lite", capabilities=["speed"]),
    _m("gemini-1.5-pro", "Gemini 1.5 Pro", "google", "Gemini", cost=0.0025, latency=2100, reasoning=9.0, creativity=8.6, context=2_000_000, openrouter_id="google/gemini-pro-1.5", capabilities=["long_context", "multimodal"], vision=8.8),
    _m("gemini-1.5-flash", "Gemini 1.5 Flash", "google", "Gemini", cost=0.00015, latency=550, reasoning=7.8, creativity=7.6, context=1_000_000, openrouter_id="google/gemini-flash-1.5", capabilities=["speed", "long_context"]),
    _m("gemma-3", "Gemma 3", "google", "Gemma", cost=0.0002, latency=900, reasoning=8.0, creativity=7.8, privacy=5, context=128_000, openrouter_id="google/gemma-3-27b-it", capabilities=["open_weights"]),
    _m("gemma-2", "Gemma 2", "google", "Gemma", cost=0.00015, latency=800, reasoning=7.4, creativity=7.2, privacy=5, context=128_000, openrouter_id="google/gemma-2-27b-it", capabilities=["open_weights"]),
    _m("medgemma", "MedGemma", "google", "Gemma", cost=0.0003, latency=1100, reasoning=8.2, creativity=6.5, privacy=5, context=128_000, openrouter_id="google/medgemma-27b", capabilities=["specialized", "vision"], vision=8.0),
    # Meta
    _m("llama-4-maverick", "Llama 4 Maverick", "meta", "Llama", cost=0.0005, latency=1400, reasoning=9.2, creativity=8.8, privacy=5, context=1_000_000, openrouter_id="meta-llama/llama-4-maverick", capabilities=["coding", "open_weights", "multimodal"], vision=8.5, coding=9.1),
    _m("llama-4-scout", "Llama 4 Scout", "meta", "Llama", cost=0.0003, latency=1000, reasoning=8.7, creativity=8.4, privacy=5, context=10_000_000, openrouter_id="meta-llama/llama-4-scout", capabilities=["long_context", "open_weights", "speed"], coding=8.5),
    _m("llama-3.3-70b", "Llama 3.3 70B", "meta", "Llama", cost=0.0004, latency=1200, reasoning=8.5, creativity=8.2, privacy=5, context=128_000, openrouter_id="meta-llama/llama-3.3-70b-instruct", capabilities=["open_weights", "coding"]),
    _m("llama-3.2-90b-vision", "Llama 3.2 90B Vision", "meta", "Llama", cost=0.0009, latency=1800, reasoning=8.4, creativity=8.0, privacy=5, context=128_000, openrouter_id="meta-llama/llama-3.2-90b-vision-instruct", capabilities=["vision", "open_weights"], vision=8.6),
    _m("llama-3.2-11b-vision", "Llama 3.2 11B Vision", "meta", "Llama", cost=0.0002, latency=700, reasoning=7.4, creativity=7.2, privacy=5, context=128_000, openrouter_id="meta-llama/llama-3.2-11b-vision-instruct", capabilities=["vision", "speed"], vision=7.8),
    _m("llama-3.2-3b", "Llama 3.2 3B", "meta", "Llama", cost=0.00005, latency=350, reasoning=6.2, creativity=6.0, privacy=5, context=128_000, openrouter_id="meta-llama/llama-3.2-3b-instruct", capabilities=["speed", "edge"]),
    _m("llama-3.2-1b", "Llama 3.2 1B", "meta", "Llama", cost=0.00002, latency=250, reasoning=5.2, creativity=5.0, privacy=5, context=128_000, openrouter_id="meta-llama/llama-3.2-1b-instruct", capabilities=["speed", "edge"]),
    _m("llama-3.1-405b", "Llama 3.1 405B", "meta", "Llama", cost=0.003, latency=3500, reasoning=9.3, creativity=8.8, privacy=5, context=128_000, openrouter_id="meta-llama/llama-3.1-405b-instruct", capabilities=["reasoning", "open_weights"], coding=9.0),
    _m("llama-3.1-70b", "Llama 3.1 70B", "meta", "Llama", cost=0.0005, latency=1300, reasoning=8.2, creativity=8.0, privacy=5, context=128_000, openrouter_id="meta-llama/llama-3.1-70b-instruct", capabilities=["open_weights"]),
    _m("llama-3.1-8b", "Llama 3.1 8B", "meta", "Llama", cost=0.00008, latency=450, reasoning=6.8, creativity=6.6, privacy=5, context=128_000, openrouter_id="meta-llama/llama-3.1-8b-instruct", capabilities=["speed", "open_weights"]),
    _m("code-llama", "Code Llama", "meta", "Llama", cost=0.0003, latency=900, reasoning=8.0, creativity=6.5, privacy=5, context=100_000, openrouter_id="meta-llama/codellama-70b-instruct", capabilities=["coding"], coding=8.6),
    # Mistral
    _m("magistral", "Magistral", "mistral", "Mistral", cost=0.002, latency=1600, reasoning=9.3, creativity=8.6, privacy=4, context=128_000, openrouter_id="mistralai/magistral-medium", capabilities=["reasoning"]),
    _m("mistral-large", "Mistral Large", "mistral", "Mistral", cost=0.003, latency=1400, reasoning=9.0, creativity=8.6, privacy=4, context=128_000, openrouter_id="mistralai/mistral-large", capabilities=["coding", "multilingual"]),
    _m("mistral-medium", "Mistral Medium", "mistral", "Mistral", cost=0.001, latency=900, reasoning=8.2, creativity=8.0, privacy=4, context=128_000, openrouter_id="mistralai/mistral-medium", capabilities=["general"]),
    _m("mistral-small", "Mistral Small", "mistral", "Mistral", cost=0.0002, latency=600, reasoning=7.4, creativity=7.2, privacy=4, context=128_000, openrouter_id="mistralai/mistral-small", capabilities=["speed"]),
    _m("mistral-nemo", "Mistral Nemo", "mistral", "Mistral", cost=0.00015, latency=550, reasoning=7.6, creativity=7.4, privacy=4, context=128_000, openrouter_id="mistralai/mistral-nemo", capabilities=["speed", "open_weights"]),
    _m("pixtral-large", "Pixtral Large", "mistral", "Mistral", cost=0.002, latency=1600, reasoning=8.8, creativity=8.4, privacy=4, context=128_000, openrouter_id="mistralai/pixtral-large", capabilities=["vision", "multimodal"], vision=9.0),
    _m("pixtral-12b", "Pixtral 12B", "mistral", "Mistral", cost=0.0003, latency=800, reasoning=7.6, creativity=7.4, privacy=4, context=128_000, openrouter_id="mistralai/pixtral-12b", capabilities=["vision", "speed"], vision=8.0),
    _m("codestral", "Codestral", "mistral", "Mistral", cost=0.0003, latency=750, reasoning=8.2, creativity=7.4, privacy=4, context=256_000, openrouter_id="mistralai/codestral", capabilities=["coding"], coding=9.0),
    _m("devstral", "Devstral", "mistral", "Mistral", cost=0.0004, latency=850, reasoning=8.5, creativity=7.2, privacy=4, context=128_000, openrouter_id="mistralai/devstral-small", capabilities=["coding", "agents"], coding=9.2),
    _m("ministral", "Ministral", "mistral", "Mistral", cost=0.0001, latency=400, reasoning=6.8, creativity=6.6, privacy=4, context=128_000, openrouter_id="mistralai/ministral-8b", capabilities=["speed", "edge"]),
    # xAI
    _m("grok-4", "Grok 4", "xai", "Grok", cost=0.005, latency=1800, reasoning=9.5, creativity=9.2, context=256_000, openrouter_id="x-ai/grok-4", capabilities=["reasoning", "coding"], coding=9.3),
    _m("grok-4-heavy", "Grok 4 Heavy", "xai", "Grok", cost=0.015, latency=8000, reasoning=9.8, creativity=9.0, context=256_000, openrouter_id="x-ai/grok-4-heavy", capabilities=["reasoning"], coding=9.5),
    _m("grok-3", "Grok 3", "xai", "Grok", cost=0.003, latency=1600, reasoning=9.1, creativity=8.9, context=131_072, openrouter_id="x-ai/grok-3", capabilities=["reasoning"]),
    _m("grok-3-mini", "Grok 3 Mini", "xai", "Grok", cost=0.0005, latency=700, reasoning=8.0, creativity=7.8, context=131_072, openrouter_id="x-ai/grok-3-mini", capabilities=["speed"]),
    _m("grok-vision", "Grok Vision", "xai", "Grok", cost=0.004, latency=1700, reasoning=8.8, creativity=8.6, context=128_000, openrouter_id="x-ai/grok-2-vision", capabilities=["vision", "multimodal"], vision=9.0),
    _m("grok-2", "Grok 2", "xai", "Grok", cost=0.002, latency=1500, reasoning=8.6, creativity=8.5, context=131_072, openrouter_id="x-ai/grok-2", capabilities=["general"]),
    # DeepSeek
    _m("deepseek-r1", "DeepSeek R1", "deepseek", "DeepSeek", cost=0.0014, latency=6000, reasoning=9.7, creativity=8.0, privacy=4, context=64_000, openrouter_id="deepseek/deepseek-r1", capabilities=["reasoning", "coding"], coding=9.6),
    _m("deepseek-v3", "DeepSeek V3", "deepseek", "DeepSeek", cost=0.0004, latency=1100, reasoning=9.0, creativity=8.4, privacy=4, context=128_000, openrouter_id="deepseek/deepseek-chat", capabilities=["coding", "general"], coding=9.2),
    _m("deepseek-coder-v2", "DeepSeek Coder V2", "deepseek", "DeepSeek", cost=0.0003, latency=1000, reasoning=8.8, creativity=7.0, privacy=4, context=128_000, openrouter_id="deepseek/deepseek-coder", capabilities=["coding"], coding=9.5),
    _m("deepseek-math", "DeepSeek Math", "deepseek", "DeepSeek", cost=0.0003, latency=1200, reasoning=9.2, creativity=6.0, privacy=4, context=64_000, openrouter_id="deepseek/deepseek-math", capabilities=["reasoning", "specialized"], coding=8.5),
    _m("deepseek-vl", "DeepSeek VL", "deepseek", "DeepSeek", cost=0.0004, latency=1300, reasoning=8.0, creativity=7.5, privacy=4, context=64_000, openrouter_id="deepseek/deepseek-vl", capabilities=["vision"], vision=8.2),
    _m("deepseek-chat", "DeepSeek Chat", "deepseek", "DeepSeek", cost=0.0004, latency=1100, reasoning=8.8, creativity=8.2, privacy=4, context=128_000, openrouter_id="deepseek/deepseek-chat", capabilities=["general"]),
    _m("deepseek-coder", "DeepSeek Coder", "deepseek", "DeepSeek", cost=0.0003, latency=1000, reasoning=8.6, creativity=6.8, privacy=4, context=128_000, openrouter_id="deepseek/deepseek-coder", capabilities=["coding"], coding=9.3),
    # Qwen
    _m("qwen3-235b", "Qwen3 235B", "qwen", "Qwen", cost=0.0008, latency=2500, reasoning=9.5, creativity=8.8, privacy=4, context=128_000, openrouter_id="qwen/qwen3-235b-a22b", capabilities=["reasoning", "coding"], coding=9.4),
    _m("qwen3-30b", "Qwen3 30B", "qwen", "Qwen", cost=0.0003, latency=1100, reasoning=8.6, creativity=8.2, privacy=4, context=128_000, openrouter_id="qwen/qwen3-30b", capabilities=["coding"]),
    _m("qwen3-14b", "Qwen3 14B", "qwen", "Qwen", cost=0.00015, latency=700, reasoning=8.0, creativity=7.6, privacy=4, context=128_000, openrouter_id="qwen/qwen3-14b", capabilities=["speed"]),
    _m("qwen3-8b", "Qwen3 8B", "qwen", "Qwen", cost=0.00008, latency=450, reasoning=7.4, creativity=7.0, privacy=4, context=128_000, openrouter_id="qwen/qwen3-8b", capabilities=["speed", "edge"]),
    _m("qwen2.5-coder", "Qwen2.5 Coder", "qwen", "Qwen", cost=0.0003, latency=900, reasoning=8.4, creativity=7.0, privacy=4, context=128_000, openrouter_id="qwen/qwen-2.5-coder-32b-instruct", capabilities=["coding"], coding=9.2),
    _m("qwen3", "Qwen3", "qwen", "Qwen", cost=0.0005, latency=1400, reasoning=9.0, creativity=8.5, privacy=4, context=128_000, openrouter_id="qwen/qwen3-235b-a22b", capabilities=["general"]),
    _m("qwen2.5-72b", "Qwen2.5 72B", "qwen", "Qwen", cost=0.0004, latency=1300, reasoning=8.6, creativity=8.2, privacy=4, context=128_000, openrouter_id="qwen/qwen-2.5-72b-instruct", capabilities=["general"]),
    # Microsoft
    _m("phi-4", "Phi-4", "microsoft", "Phi", cost=0.0002, latency=700, reasoning=8.4, creativity=7.6, privacy=4, context=16_000, openrouter_id="microsoft/phi-4", capabilities=["reasoning", "edge"]),
    _m("phi-4-mini", "Phi-4 Mini", "microsoft", "Phi", cost=0.00008, latency=400, reasoning=7.4, creativity=6.8, privacy=4, context=128_000, openrouter_id="microsoft/phi-4-mini", capabilities=["speed", "edge"]),
    _m("phi-4-multimodal", "Phi-4 Multimodal", "microsoft", "Phi", cost=0.00025, latency=900, reasoning=8.0, creativity=7.4, privacy=4, context=128_000, openrouter_id="microsoft/phi-4-multimodal", capabilities=["vision", "multimodal"], vision=8.2),
    _m("phi-3.5", "Phi-3.5", "microsoft", "Phi", cost=0.0001, latency=500, reasoning=7.6, creativity=7.0, privacy=4, context=128_000, openrouter_id="microsoft/phi-3.5-mini-128k-instruct", capabilities=["speed"]),
    _m("wizardlm-2", "WizardLM 2", "microsoft", "Wizard", cost=0.0004, latency=1200, reasoning=8.2, creativity=8.0, privacy=4, context=64_000, openrouter_id="microsoft/wizardlm-2-8x22b", capabilities=["general"]),
    # Cohere
    _m("command-a", "Command A", "cohere", "Command", cost=0.0025, latency=1400, reasoning=9.0, creativity=8.6, privacy=4, context=256_000, openrouter_id="cohere/command-a", capabilities=["agents", "rag"]),
    _m("command-r-plus", "Command R+", "cohere", "Command", cost=0.003, latency=1500, reasoning=8.8, creativity=8.4, privacy=4, context=128_000, openrouter_id="cohere/command-r-plus", capabilities=["rag", "agents"]),
    _m("command-r", "Command R", "cohere", "Command", cost=0.0005, latency=800, reasoning=8.0, creativity=7.8, privacy=4, context=128_000, openrouter_id="cohere/command-r", capabilities=["rag", "speed"]),
    _m("aya-expanse-32b", "Aya Expanse 32B", "cohere", "Aya", cost=0.0004, latency=1100, reasoning=8.0, creativity=8.0, privacy=4, context=128_000, openrouter_id="cohere/aya-expanse-32b", capabilities=["multilingual"]),
    _m("aya-expanse-8b", "Aya Expanse 8B", "cohere", "Aya", cost=0.00015, latency=500, reasoning=7.0, creativity=7.0, privacy=4, context=128_000, openrouter_id="cohere/aya-expanse-8b", capabilities=["multilingual", "speed"]),
    # AI21
    _m("jamba-large", "Jamba Large", "ai21", "Jamba", cost=0.002, latency=1600, reasoning=8.6, creativity=8.2, privacy=4, context=256_000, openrouter_id="ai21/jamba-1.5-large", capabilities=["long_context"]),
    _m("jamba-mini", "Jamba Mini", "ai21", "Jamba", cost=0.0003, latency=700, reasoning=7.4, creativity=7.2, privacy=4, context=256_000, openrouter_id="ai21/jamba-1.5-mini", capabilities=["speed", "long_context"]),
    _m("jurassic-2-ultra", "Jurassic-2 Ultra", "ai21", "Jurassic", cost=0.01, latency=2000, reasoning=7.8, creativity=8.0, privacy=4, context=8_000, openrouter_id="ai21/j2-ultra", capabilities=["writing"], tools=False),
    _m("jurassic-2-mid", "Jurassic-2 Mid", "ai21", "Jurassic", cost=0.005, latency=1200, reasoning=7.2, creativity=7.4, privacy=4, context=8_000, openrouter_id="ai21/j2-mid", capabilities=["writing"], tools=False),
    _m("jamba-instruct", "Jamba Instruct", "ai21", "Jamba", cost=0.0005, latency=900, reasoning=7.6, creativity=7.4, privacy=4, context=256_000, openrouter_id="ai21/jamba-instruct", capabilities=["general"]),
    # IBM
    _m("granite-3.3-8b", "Granite 3.3 8B", "ibm", "Granite", cost=0.00015, latency=600, reasoning=7.6, creativity=7.0, privacy=5, context=128_000, openrouter_id="ibm-granite/granite-3.3-8b-instruct", capabilities=["enterprise", "open_weights"]),
    _m("granite-3.3-2b", "Granite 3.3 2B", "ibm", "Granite", cost=0.00005, latency=350, reasoning=6.4, creativity=6.0, privacy=5, context=128_000, openrouter_id="ibm-granite/granite-3.3-2b-instruct", capabilities=["edge", "enterprise"]),
    _m("granite-vision", "Granite Vision", "ibm", "Granite", cost=0.0003, latency=900, reasoning=7.4, creativity=6.8, privacy=5, context=128_000, openrouter_id="ibm-granite/granite-vision-3.2-2b", capabilities=["vision", "enterprise"], vision=7.8),
    _m("granite-code", "Granite Code", "ibm", "Granite", cost=0.0002, latency=700, reasoning=7.8, creativity=6.2, privacy=5, context=128_000, openrouter_id="ibm-granite/granite-3.1-8b-instruct", capabilities=["coding", "enterprise"], coding=8.4),
    _m("granite-guardian", "Granite Guardian", "ibm", "Granite", cost=0.0002, latency=650, reasoning=7.0, creativity=5.5, privacy=5, context=128_000, openrouter_id="ibm-granite/granite-guardian-3.0-8b", capabilities=["safety", "enterprise"]),
    # NVIDIA
    _m("nemotron-ultra", "Nemotron Ultra", "nvidia", "Nemotron", cost=0.0015, latency=2000, reasoning=9.2, creativity=8.4, privacy=4, context=128_000, openrouter_id="nvidia/llama-3.1-nemotron-ultra-253b-v1", capabilities=["reasoning", "coding"], coding=9.1),
    _m("nemotron-70b", "Nemotron 70B", "nvidia", "Nemotron", cost=0.0005, latency=1300, reasoning=8.6, creativity=8.0, privacy=4, context=128_000, openrouter_id="nvidia/llama-3.1-nemotron-70b-instruct", capabilities=["coding"]),
    _m("nemotron-mini", "Nemotron Mini", "nvidia", "Nemotron", cost=0.0001, latency=450, reasoning=7.0, creativity=6.6, privacy=4, context=32_000, openrouter_id="nvidia/nemotron-mini-4b-instruct", capabilities=["speed"]),
    _m("nvlm", "NVLM", "nvidia", "NVLM", cost=0.0006, latency=1400, reasoning=8.2, creativity=7.8, privacy=4, context=128_000, openrouter_id="nvidia/nvlm-d", capabilities=["vision", "multimodal"], vision=8.6),
    _m("eagle-2", "Eagle 2", "nvidia", "Eagle", cost=0.0004, latency=1000, reasoning=7.8, creativity=7.4, privacy=4, context=128_000, openrouter_id="nvidia/eagle2", capabilities=["vision"], vision=8.0),
    # Amazon
    _m("nova-premier", "Nova Premier", "amazon", "Nova", cost=0.004, latency=1800, reasoning=9.2, creativity=8.8, privacy=4, context=1_000_000, openrouter_id="amazon/nova-premier-v1", capabilities=["reasoning", "multimodal", "long_context"], vision=8.8),
    _m("nova-pro", "Nova Pro", "amazon", "Nova", cost=0.0015, latency=1200, reasoning=8.6, creativity=8.2, privacy=4, context=300_000, openrouter_id="amazon/nova-pro-v1", capabilities=["general", "multimodal"], vision=8.2),
    _m("nova-lite", "Nova Lite", "amazon", "Nova", cost=0.0002, latency=500, reasoning=7.4, creativity=7.2, privacy=4, context=300_000, openrouter_id="amazon/nova-lite-v1", capabilities=["speed"]),
    _m("nova-micro", "Nova Micro", "amazon", "Nova", cost=0.00005, latency=300, reasoning=6.4, creativity=6.2, privacy=4, context=128_000, openrouter_id="amazon/nova-micro-v1", capabilities=["speed", "edge"]),
    _m("titan-text-g1", "Titan Text G1", "amazon", "Titan", cost=0.0008, latency=1000, reasoning=7.2, creativity=7.0, privacy=4, context=32_000, openrouter_id="amazon/titan-text-express", capabilities=["enterprise"], tools=False),
    # Specialized / open source
    _m("dbrx", "DBRX", "databricks", "DBRX", cost=0.0008, latency=1400, reasoning=8.4, creativity=8.0, privacy=5, context=32_000, openrouter_id="databricks/dbrx-instruct", capabilities=["coding", "open_weights"], coding=8.6),
    _m("yi-34b", "Yi-34B", "01-ai", "Yi", cost=0.0004, latency=1100, reasoning=8.0, creativity=7.8, privacy=5, context=200_000, openrouter_id="01-ai/yi-large", capabilities=["multilingual", "open_weights"]),
    _m("molmo", "Molmo", "allenai", "Molmo", cost=0.0003, latency=1000, reasoning=7.6, creativity=7.4, privacy=5, context=128_000, openrouter_id="allenai/molmo-7b-d", capabilities=["vision", "open_weights"], vision=8.4),
    _m("olmo-2", "OLMo 2", "allenai", "OLMo", cost=0.0002, latency=800, reasoning=7.4, creativity=7.2, privacy=5, context=128_000, openrouter_id="allenai/olmo-2-1124-13b", capabilities=["open_weights", "research"]),
    _m("falcon-3", "Falcon 3", "tii", "Falcon", cost=0.0003, latency=900, reasoning=7.6, creativity=7.4, privacy=5, context=32_000, openrouter_id="tiiuae/falcon-3-10b-instruct", capabilities=["open_weights"]),
    # OpenRouter free
    _m("openrouter/free", "Auto (Free)", "openrouter", "OpenRouter Free", cost=0.0, latency=1800, reasoning=8.0, creativity=8.0, context=200_000, openrouter_id="meta-llama/llama-3.3-70b-instruct:free", capabilities=["free", "tools"], free=True),
    _m("openai/gpt-oss-20b:free", "GPT-OSS 20B (Free)", "openrouter", "OpenRouter Free", cost=0.0, latency=1200, reasoning=7.8, creativity=7.3, context=131_072, openrouter_id="openai/gpt-oss-20b:free", capabilities=["free", "tools"], free=True),
    _m("qwen/qwen3-coder:free", "Qwen3 Coder (Free)", "openrouter", "OpenRouter Free", cost=0.0, latency=1800, reasoning=9.0, creativity=7.8, context=1_048_576, openrouter_id="qwen/qwen3-coder:free", capabilities=["free", "coding", "tools"], coding=9.2, free=True),
    _m("meta-llama/llama-3.3-70b-instruct:free", "Llama 3.3 70B (Free)", "openrouter", "OpenRouter Free", cost=0.0, latency=1400, reasoning=8.4, creativity=8.1, context=131_072, openrouter_id="meta-llama/llama-3.3-70b-instruct:free", capabilities=["free", "tools"], free=True),
    _m("google/gemma-4-26b-a4b-it:free", "Gemma 4 26B (Free)", "openrouter", "OpenRouter Free", cost=0.0, latency=1300, reasoning=8.1, creativity=7.8, context=262_144, openrouter_id="google/gemma-4-26b-a4b-it:free", capabilities=["free", "tools"], free=True),
]

MODEL_BY_NAME: dict[str, dict[str, Any]] = {m["name"]: m for m in MODEL_TABLE}

MODEL_ALIASES: dict[str, str] = {
    "openai/gpt-4o": "gpt-4o",
    "openai/gpt-4o-mini": "gpt-4o-mini",
    "claude-3.5-sonnet": "claude-3-5-sonnet",
    "claude-3.5-haiku": "claude-3-5-haiku",
}


def resolve_model_name(name: str | None) -> str | None:
    if not name:
        return None
    key = name.strip()
    if key in MODEL_BY_NAME:
        return key
    return MODEL_ALIASES.get(key) or MODEL_ALIASES.get(key.lower()) or key


def openrouter_id_for(name: str) -> str:
    resolved = resolve_model_name(name) or name
    row = MODEL_BY_NAME.get(resolved)
    if row:
        return str(row.get("openrouter_id") or resolved)
    return resolved


def openrouter_model_map() -> dict[str, str]:
    return {m["name"]: str(m.get("openrouter_id") or m["name"]) for m in MODEL_TABLE}


def catalog_public() -> list[dict[str, Any]]:
    out = []
    for m in MODEL_TABLE:
        out.append(
            {
                "name": m["name"],
                "display_name": m["display_name"],
                "provider": m["provider"],
                "family": m.get("family"),
                "cost_per_1k": m["cost_per_1k"],
                "avg_latency_ms": m["avg_latency_ms"],
                "reasoning_score": m["reasoning_score"],
                "creativity_score": m["creativity_score"],
                "coding_score": m.get("coding_score"),
                "vision_score": m.get("vision_score"),
                "privacy_tier": m["privacy_tier"],
                "context_window": m["context_window"],
                "capabilities": list(m.get("capabilities") or []),
                "supports_tools": bool(m.get("supports_tools", True)),
                "free": bool(m.get("free")),
                "openrouter_id": m.get("openrouter_id"),
            }
        )
    return out
