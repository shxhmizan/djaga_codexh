"""Databricks Vector Search adapter, loaded only when an index is configured."""
from __future__ import annotations

from typing import Any

from config import settings


async def search_scripts(query: str, limit: int = 5) -> list[dict[str, Any]]:
    if not (settings.vs_endpoint and settings.vs_index):
        return []

    def _search() -> list[dict[str, Any]]:
        try:
            from databricks.vector_search.client import VectorSearchClient
        except ImportError as exc:  # dependency is optional in local mock mode
            raise RuntimeError("Install databricks-vectorsearch to query VS_INDEX") from exc
        client = VectorSearchClient()
        index = client.get_index(endpoint_name=settings.vs_endpoint, index_name=settings.vs_index)
        response = index.similarity_search(query_text=query, num_results=limit)
        result = response.get("result", response) if isinstance(response, dict) else response
        rows = result.get("data_array", []) if isinstance(result, dict) else []
        manifest = result.get("manifest", {}) if isinstance(result, dict) else {}
        columns = [item.get("name", "value") if isinstance(item, dict) else str(item) for item in manifest.get("columns", [])]
        return [dict(zip(columns or [f"value_{i}" for i in range(len(row))], row)) for row in rows]

    import asyncio
    return await asyncio.to_thread(_search)
