import sys
from unittest.mock import patch

import pytest


@pytest.fixture
def clear_setup_module():
    """Ensure the setup module is re-imported fresh for each test."""
    sys.modules.pop("setup", None)
    yield
    sys.modules.pop("setup", None)


def test_setup_called_with_expected_arguments(clear_setup_module):
    """Test that setuptools.setup is called with correct metadata and requirements."""
    with patch("setuptools.setup") as mock_setup, patch(
        "setuptools.find_packages", return_value=["my_pkg"]
    ) as mock_find:
        from setup import setup as setup_func, find_packages as find_packages_func

        # Ensure imported names map to the patched objects
        assert setup_func is mock_setup
        assert find_packages_func is mock_find

        # setup() should be called exactly once with expected arguments
        assert mock_setup.call_count == 1
        args, kwargs = mock_setup.call_args
        assert args == ()
        assert kwargs["name"] == "python-service"
        assert kwargs["version"] == "0.1.0"
        assert kwargs["packages"] == ["my_pkg"]
        assert kwargs["install_requires"] == ["flask==3.0.0", "flask-cors==4.0.0"]


@pytest.mark.parametrize(
    "pkg_list",
    [
        [],
        ["single_pkg"],
        ["pkg_a", "pkg_b"],
    ],
)
def test_setup_passes_through_find_packages_result(clear_setup_module, pkg_list):
    """Test that the result of find_packages() is passed directly to setup(packages=...)."""
    with patch("setuptools.setup") as mock_setup, patch(
        "setuptools.find_packages", return_value=pkg_list
    ):
        from setup import setup as setup_func  # noqa: F401  # triggers module execution

        assert mock_setup.call_count == 1
        _, kwargs = mock_setup.call_args
        assert kwargs["packages"] == pkg_list


def test_setup_import_raises_when_find_packages_errors(clear_setup_module):
    """Test that an exception in find_packages propagates and setup is not called."""
    with patch("setuptools.setup") as mock_setup, patch(
        "setuptools.find_packages", side_effect=RuntimeError("boom")
    ):
        with pytest.raises(RuntimeError, match="boom"):
            from setup import setup as setup_func  # noqa: F401

        # setup() should not be called because find_packages failed first
        assert mock_setup.call_count == 0


def test_setup_called_only_once_due_to_module_caching(clear_setup_module):
    """Test that repeated imports do not re-execute setup due to module caching."""
    with patch("setuptools.setup") as mock_setup, patch(
        "setuptools.find_packages", return_value=["cached_pkg"]
    ):
        from setup import setup as setup_func_1  # noqa: F401
        assert mock_setup.call_count == 1

        # Import again without clearing sys.modules; should not call setup again
        from setup import setup as setup_func_2  # noqa: F401
        assert mock_setup.call_count == 1