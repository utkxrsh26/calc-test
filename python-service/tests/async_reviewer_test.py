import asyncio
from typing import Any

import pytest
from unittest.mock import Mock, patch

from src.async_reviewer import AsyncReviewService


@pytest.fixture
def review_result_mock() -> Any:
    """Create a simple mock-like object to act as ReviewResult."""
    class ReviewResultMock:
        def __init__(self, value: str):
            self.value = value

        def __eq__(self, other: Any) -> bool:
            # Simple equality for testing purposes
            if isinstance(other, ReviewResultMock):
                return self.value == other.value
            return False

        def __repr__(self) -> str:
            return f"ReviewResultMock(value={self.value!r})"

    return ReviewResultMock


@pytest.fixture
def async_review_service():
    """Create AsyncReviewService instance for testing."""
    return AsyncReviewService()


def _make_code_reviewer_mock(review_result_cls, side_effect=None):
    """Helper to create a CodeReviewer mock with configurable behavior."""
    mock_reviewer = Mock()
    if side_effect is not None:
        mock_reviewer.review_code.side_effect = side_effect
    else:
        def _review_code(content, language):
            return review_result_cls(f"reviewed:{language}:{content}")
        mock_reviewer.review_code.side_effect = _review_code
    return mock_reviewer


def test_asyncreviewservice_init_creates_reviewer_and_cache(async_review_service):
    """Test AsyncReviewService initialization creates reviewer and cache."""
    assert async_review_service._reviewer is not None
    assert isinstance(async_review_service._cache, dict)
    assert async_review_service._cache == {}


@pytest.mark.asyncio
async def test_asyncreviewservice_perform_review_calls_reviewer_and_caches(
    async_review_service, review_result_mock
):
    """Test _perform_review calls CodeReviewer.review_code and caches result."""
    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ) as mock_cr_cls:
        service = AsyncReviewService()
        content = "print('hello')"
        language = "python"

        # First call should invoke CodeReviewer.review_code
        result1 = await service._perform_review(content, language)

        assert isinstance(result1, review_result_mock.__class__)
        assert result1.value == f"reviewed:{language}:{content}"
        mock_cr_cls.return_value.review_code.assert_called_once_with(
            content, language
        )

        # Second call with same content/language should use cache
        result2 = await service._perform_review(content, language)

        # No additional call to review_code
        mock_cr_cls.return_value.review_code.assert_called_once()
        assert result2 is result1  # cached object identity
        # Ensure cache key exists
        cache_key = f"{language}:{hash(content)}"
        assert cache_key in service._cache
        assert service._cache[cache_key] is result1


@pytest.mark.asyncio
async def test_asyncreviewservice_perform_review_different_content_not_cached(
    review_result_mock,
):
    """Test _perform_review does not reuse cache for different content."""
    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ):
        service = AsyncReviewService()
        content1 = "print('one')"
        content2 = "print('two')"
        language = "python"

        result1 = await service._perform_review(content1, language)
        result2 = await service._perform_review(content2, language)

        assert result1 is not result2
        assert len(service._cache) == 2


@pytest.mark.asyncio
async def test_asyncreviewservice_perform_review_different_language_not_cached(
    review_result_mock,
):
    """Test _perform_review does not reuse cache for different language."""
    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ):
        service = AsyncReviewService()
        content = "console.log('hello');"
        lang1 = "javascript"
        lang2 = "typescript"

        result1 = await service._perform_review(content, lang1)
        result2 = await service._perform_review(content, lang2)

        assert result1 is not result2
        assert len(service._cache) == 2


@pytest.mark.asyncio
async def test_asyncreviewservice_perform_review_propagates_exception():
    """Test _perform_review propagates exceptions from CodeReviewer.review_code."""
    error = RuntimeError("review failure")

    def side_effect(content, language):
        raise error

    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock=None, side_effect=side_effect),
    ):
        service = AsyncReviewService()
        with pytest.raises(RuntimeError) as excinfo:
            await service._perform_review("code", "python")
        assert excinfo.value is error
        # No cache entry should be added in case of exception
        assert service._cache == {}


@pytest.mark.asyncio
async def test_asyncreviewservice_review_code_delegates_to_perform_review(
    review_result_mock,
):
    """Test review_code delegates to _perform_review and returns its result."""
    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ):
        service = AsyncReviewService()
        content = "print('hi')"
        language = "python"

        # Spy on _perform_review
        with patch.object(
            service, "_perform_review", wraps=service._perform_review
        ) as mock_perform:
            result = await service.review_code(content, language)

            mock_perform.assert_awaited_once_with(content, language)
            cache_key = f"{language}:{hash(content)}"
            assert service._cache[cache_key] is result


@pytest.mark.asyncio
async def test_asyncreviewservice_review_code_exception_propagates():
    """Test review_code propagates exceptions from _perform_review."""
    service = AsyncReviewService()
    error = ValueError("bad code")

    async def failing_perform(content, language):
        raise error

    with patch.object(service, "_perform_review", side_effect=failing_perform):
        with pytest.raises(ValueError) as excinfo:
            await service.review_code("bad", "python")
        assert excinfo.value is error


@pytest.mark.asyncio
async def test_asyncreviewservice_review_batch_calls_review_code_for_each(
    review_result_mock,
):
    """Test review_batch calls review_code for each file and returns results list."""
    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ):
        service = AsyncReviewService()
        files = [
            {"content": "print('a')", "language": "python"},
            {"content": "print('b')", "language": "python"},
        ]

        # Spy on review_code
        with patch.object(
            service, "review_code", wraps=service.review_code
        ) as mock_review_code:
            results = await service.review_batch(files)

            assert len(results) == 2
            assert all(
                isinstance(r, review_result_mock.__class__) for r in results
            )
            assert mock_review_code.await_count == 2
            mock_review_code.assert_any_await("print('a')", "python")
            mock_review_code.assert_any_await("print('b')", "python")


@pytest.mark.asyncio
async def test_asyncreviewservice_review_batch_uses_default_language(
    review_result_mock,
):
    """Test review_batch uses default language 'python' when not specified."""
    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ) as mock_cr_cls:
        service = AsyncReviewService()
        files = [
            {"content": "print('default lang')"},
        ]

        results = await service.review_batch(files)

        assert len(results) == 1
        assert results[0].value == "reviewed:python:print('default lang')"
        mock_cr_cls.return_value.review_code.assert_called_once_with(
            "print('default lang')", "python"
        )


@pytest.mark.asyncio
async def test_asyncreviewservice_review_batch_empty_list():
    """Test review_batch returns an empty list when given no files."""
    service = AsyncReviewService()

    # Patch review_code to ensure it's not called
    with patch.object(service, "review_code", wraps=service.review_code) as mock_review:
        results = await service.review_batch([])

        assert results == []
        mock_review.assert_not_called()


@pytest.mark.asyncio
async def test_asyncreviewservice_review_batch_concurrent_caching(
    review_result_mock,
):
    """Test review_batch benefits from caching when reviewing identical content."""
    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ) as mock_cr_cls:
        service = AsyncReviewService()
        files = [
            {"content": "print('same')", "language": "python"},
            {"content": "print('same')", "language": "python"},
        ]

        results = await service.review_batch(files)

        assert len(results) == 2
        assert results[0] is results[1]
        # Note: Because of caching in _perform_review, CodeReviewer.review_code
        # should only be called once for identical content+language
        mock_cr_cls.return_value.review_code.assert_called_once()


@pytest.mark.asyncio
async def test_asyncreviewservice_review_batch_propagates_exceptions(
    review_result_mock,
):
    """Test review_batch propagates exceptions raised by review_code."""
    error = RuntimeError("batch failure")

    async def failing_review_code(content, language):
        raise error

    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ):
        service = AsyncReviewService()

        # Patch review_code to fail for all inputs
        with patch.object(service, "review_code", side_effect=failing_review_code):
            files = [{"content": "code1", "language": "python"}]

            with pytest.raises(RuntimeError) as excinfo:
                await service.review_batch(files)
            assert excinfo.value is error


@pytest.mark.asyncio
async def test_asyncreviewservice_review_batch_partial_failure(
    review_result_mock,
):
    """Test review_batch surfaces the first exception when some tasks fail."""
    # One success, one failure
    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ):
        service = AsyncReviewService()

        async def conditional_review_code(content, language):
            if content == "fail":
                raise ValueError("bad file")
            return await AsyncReviewService.review_code(service, content, language)

        with patch.object(service, "review_code", side_effect=conditional_review_code):
            files = [
                {"content": "ok", "language": "python"},
                {"content": "fail", "language": "python"},
            ]
            with pytest.raises(ValueError) as excinfo:
                await service.review_batch(files)
            assert "bad file" in str(excinfo.value)


@pytest.mark.asyncio
async def test_asyncreviewservice_review_batch_uses_asyncio_gather_behavior(
    review_result_mock,
):
    """Test review_batch uses asyncio.gather semantics for order of results."""
    with patch(
        "src.async_reviewer.CodeReviewer",
        return_value=_make_code_reviewer_mock(review_result_mock),
    ):
        service = AsyncReviewService()

        async def delayed_review_code(content, language):
            # Introduce different delays to test ordering
            if content == "second":
                await asyncio.sleep(0.01)
            return await AsyncReviewService.review_code(service, content, language)

        with patch.object(service, "review_code", side_effect=delayed_review_code):
            files = [
                {"content": "first", "language": "python"},
                {"content": "second", "language": "python"},
            ]
            results = await service.review_batch(files)

            # Despite different completion times, asyncio.gather preserves order
            assert results[0].value.endswith(":first")
            assert results[1].value.endswith(":second")