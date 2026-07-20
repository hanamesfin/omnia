"""
OMNIA MCP Server — Web Scraper

Standalone Model Context Protocol server. Run beside the API:

  cd apps/api && python -m mcp_servers.scraper_server

Your agents connect as MCP *clients*; this process never sees enterprise DB passwords —
it only exposes the tools declared below.
"""
from __future__ import annotations

import re

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("web_scraper")


def _html_to_text(html: str) -> str:
    html = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", html)
    html = re.sub(r"(?is)<!--.*?-->", " ", html)
    html = re.sub(r"(?s)<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", html).strip()


@mcp.tool()
async def fetch_website_content(url: str) -> str:
    """Fetch the cleaned text content of a public URL. Use to read competitor or product pages."""
    if not url.startswith(("http://", "https://")):
        return "Error: only http/https URLs are allowed."
    async with httpx.AsyncClient(
        timeout=25.0,
        follow_redirects=True,
        headers={"User-Agent": "OMNIA-MCP-WebScraper/1.0"},
    ) as client:
        response = await client.get(url)
        response.raise_for_status()
        ctype = (response.headers.get("content-type") or "").lower()
        text = response.text
        if "html" in ctype:
            text = _html_to_text(text)
        # Truncate to avoid blowing out free-model context windows
        return text[:5000]


@mcp.tool()
async def extract_links(url: str, limit: int = 20) -> str:
    """Extract up to `limit` hyperlinks from a page. Useful for mapping a competitor site."""
    if not url.startswith(("http://", "https://")):
        return "Error: only http/https URLs are allowed."
    limit = max(1, min(50, int(limit or 20)))
    async with httpx.AsyncClient(
        timeout=25.0,
        follow_redirects=True,
        headers={"User-Agent": "OMNIA-MCP-WebScraper/1.0"},
    ) as client:
        response = await client.get(url)
        response.raise_for_status()
        hrefs = re.findall(r'href=["\'](https?://[^"\']+)["\']', response.text, flags=re.I)
        unique = list(dict.fromkeys(hrefs))[:limit]
        return "\n".join(unique) if unique else "No links found."


if __name__ == "__main__":
    mcp.run(transport="stdio")
