import asyncio
from typing import Dict, List

from src.code_reviewer import CodeReviewer, ReviewResult


class AsyncReviewService:
    def __init__(self):
        self._reviewer = CodeReviewer()
        self._cache: Dict[str, ReviewResult] = {}

    async def _perform_review(self, content: str, language: str) -> ReviewResult:
        cache_key = f"{language}:{hash(content)}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        result = self._reviewer.review_code(content, language)
        self._cache[cache_key] = result
        return result

    async def review_code(self, content: str, language: str) -> ReviewResult:
        result = await self._perform_review(content, language)
        return result

    async def review_batch(self, files: List[Dict[str, str]]) -> List[ReviewResult]:
        tasks = [
            self.review_code(f["content"], f.get("language", "python"))
            for f in files
        ]
        return await asyncio.gather(*tasks)
