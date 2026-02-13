import sys
import types
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import Mock
import pytest


@pytest.fixture(autouse=True)
def add_project_root_to_sys_path():
    """
    Ensure the project root (containing setup.py) is importable.
    Assumes tests/ is inside python-service/ directory.
    """
    project_root = Path(__file__).resolve().parents[1]
    sys.path.insert(0, str(project_root))
    try:
        yield
    finally:
        if str(project_root) in sys.path:
            sys.path.remove(str(project_root))


@pytest.fixture
def clear_setup_module():
    """
    Ensure the 'setup' module is re-imported fresh for each test.
    """
    original = sys.modules.pop("setup", None)
    try:
        yield
    finally:
        sys.modules.pop("setup", None)
        if original is not None:
            sys.modules["setup"] = original


@pytest.fixture
def mock_setuptools():
    """
    Inject a mocked 'setuptools' module so importing setup.py does not run real packaging.
    """
    original = sys.modules.get("setuptools")
    fake = types.ModuleType("setuptools")
    setup_mock = Mock(name="setuptools.setup")
    find_packages_mock = Mock(name="setuptools.find_packages")
    fake.setup = setup_mock
    fake.find_packages = find_packages_mock
    sys.modules["setuptools"] = fake

    try:
        yield SimpleNamespace(module=fake, setup=setup_mock, find_packages=find_packages_mock)
    finally:
        if original is not None:
            sys.modules["setuptools"] = original
        else:
            sys.modules.pop("setuptools", None)


def test_setup_called_with_correct_arguments(mock_setuptools, clear_setup_module):
    """Verify setup() is called once with expected metadata and discovered packages."""
    # Arrange the mocked return for find_packages
    mock_setuptools.find_packages.return_value = ["mypkg", "mypkg.sub"]

    # Act: importing the module triggers the call to setup()
    from setup import setup, find_packages  # noqa: F401

    # Assert the mocked functions were used
    mock_setuptools.find_packages.assert_called_once_with()
    assert mock_setuptools.setup.call_count == 1

    # Validate arguments passed to setup()
    _, kwargs = mock_setuptools.setup.call_args
    assert kwargs["name"] == "python-service"
    assert kwargs["version"] == "0.1.0"
    assert kwargs["packages"] == ["mypkg", "mypkg.sub"]
    assert kwargs["install_requires"] == ["flask==3.0.0", "flask-cors==4.0.0"]


@pytest.mark.parametrize("dependency", ["flask==3.0.0", "flask-cors==4.0.0"])
def test_setup_install_requires_contains_dependencies(mock_setuptools, clear_setup_module, dependency):
    """Ensure each required dependency is present in install_requires."""
    # Arrange
    mock_setuptools.find_packages.return_value = ["pkg"]

    # Act
    from setup import setup, find_packages  # noqa: F401

    # Assert
    _, kwargs = mock_setuptools.setup.call_args
    assert dependency in kwargs["install_requires"]


def test_find_packages_called_without_arguments(mock_setuptools, clear_setup_module):
    """Ensure find_packages is invoked without any arguments."""
    # Arrange
    mock_setuptools.find_packages.return_value = ["a"]

    # Act
    from setup import setup, find_packages  # noqa: F401

    # Assert
    mock_setuptools.find_packages.assert_called_once_with()


def test_setup_import_propagates_exception(mock_setuptools, clear_setup_module):
    """Verify that exceptions from setuptools.setup propagate during import."""
    # Arrange
    mock_setuptools.find_packages.return_value = ["pkg"]
    mock_setuptools.setup.side_effect = RuntimeError("boom")

    # Act / Assert
    with pytest.raises(RuntimeError, match="boom"):
        from setup import setup  # noqa: F401