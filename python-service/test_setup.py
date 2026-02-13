import sys
from pathlib import Path
from unittest.mock import patch
import pytest


@pytest.fixture
def add_python_service_to_sys_path():
    """Temporarily add the python-service directory to sys.path so 'setup' can be imported."""
    root = Path(__file__).resolve().parent.parent
    service_dir = root / "python-service"
    sys.path.insert(0, str(service_dir))
    try:
        yield str(service_dir)
    finally:
        sys.path = [p for p in sys.path if p != str(service_dir)]


@pytest.fixture
def fresh_setup_module():
    """Ensure the 'setup' module is re-imported fresh for each test."""
    if "setup" in sys.modules:
        del sys.modules["setup"]
    yield
    if "setup" in sys.modules:
        del sys.modules["setup"]


def test_setup_called_with_expected_arguments(add_python_service_to_sys_path, fresh_setup_module):
    """Test that setuptools.setup is called with the correct arguments."""
    with patch("setuptools.find_packages", return_value=["pkgA", "pkgB"]) as mock_find, \
         patch("setuptools.setup") as mock_setup:
        from setup import setup as setup_func  # noqa: F401 - ensures the module is executed

        mock_find.assert_called_once_with()
        assert mock_setup.call_count == 1

        args, kwargs = mock_setup.call_args
        assert args == ()
        assert kwargs["name"] == "python-service"
        assert kwargs["version"] == "0.1.0"
        assert kwargs["packages"] == ["pkgA", "pkgB"]
        assert kwargs["install_requires"] == ["flask==3.0.0", "flask-cors==4.0.0"]


@pytest.mark.parametrize("required_pkg", [
    "flask==3.0.0",
    "flask-cors==4.0.0",
])
def test_setup_install_requires_contains_dependencies(required_pkg, add_python_service_to_sys_path, fresh_setup_module):
    """Test that each required dependency is included in install_requires."""
    with patch("setuptools.find_packages", return_value=["pkgOnly"]) as mock_find, \
         patch("setuptools.setup") as mock_setup:
        from setup import setup as setup_func  # noqa: F401 - triggers module execution

        mock_find.assert_called_once_with()
        _, kwargs = mock_setup.call_args
        assert required_pkg in kwargs["install_requires"]


def test_setup_propagates_exception(add_python_service_to_sys_path, fresh_setup_module):
    """Test that exceptions from setuptools.setup are propagated during import."""
    with patch("setuptools.find_packages", return_value=["pkgA"]) as mock_find, \
         patch("setuptools.setup", side_effect=RuntimeError("boom")):
        with pytest.raises(RuntimeError) as excinfo:
            from setup import setup as setup_func  # noqa: F401

        assert "boom" in str(excinfo.value)
        mock_find.assert_called_once_with()