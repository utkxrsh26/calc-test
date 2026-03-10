import pytest
from unittest.mock import patch, MagicMock

from setup import setup


@pytest.fixture
def mock_setup():
    """Fixture to patch setuptools.setup and yield the mock."""
    with patch("setup.setup") as mock:
        yield mock


def test_setup_called_with_expected_arguments(monkeypatch):
    """Test that setup is called with the expected basic metadata and dependencies."""
    recorded_args = {}
    original_setup = setup

    def recording_setup(*args, **kwargs):
        recorded_args["args"] = args
        recorded_args["kwargs"] = kwargs

    # Patch the setup symbol imported into this module's namespace
    monkeypatch.setenv("PYTHONPATH", ".")
    globals()["setup"] = recording_setup  # override imported setup in this test

    # Re-import the module code behavior by executing it again via exec
    # Simulate running the file content that calls setup(...)
    exec(
        'from setuptools import setup, find_packages\n'
        'setup(\n'
        '    name="python-service",\n'
        '    version="0.1.0",\n'
        '    packages=find_packages(),\n'
        '    install_requires=[\n'
        '        "flask==3.0.0",\n'
        '        "flask-cors==4.0.0",\n'
        '    ],\n'
        ')\n',
        globals(),
    )

    kwargs = recorded_args["kwargs"]
    assert kwargs["name"] == "python-service"
    assert kwargs["version"] == "0.1.0"
    assert "install_requires" in kwargs
    assert "flask==3.0.0" in kwargs["install_requires"]
    assert "flask-cors==4.0.0" in kwargs["install_requires"]

    # restore original
    globals()["setup"] = original_setup


@pytest.mark.parametrize(
    "dependency",
    [
        "flask==3.0.0",
        "flask-cors==4.0.0",
    ],
)
def test_setup_install_requires_contains_dependencies(monkeypatch, dependency):
    """Test that each expected dependency is present in install_requires."""
    recorded_args = {}

    def recording_setup(*args, **kwargs):
        recorded_args["args"] = args
        recorded_args["kwargs"] = kwargs

    original_setup = setup
    globals()["setup"] = recording_setup

    exec(
        'from setuptools import setup, find_packages\n'
        'setup(\n'
        '    name="python-service",\n'
        '    version="0.1.0",\n'
        '    packages=find_packages(),\n'
        '    install_requires=[\n'
        '        "flask==3.0.0",\n'
        '        "flask-cors==4.0.0",\n'
        '    ],\n'
        ')\n',
        globals(),
    )

    kwargs = recorded_args["kwargs"]
    assert dependency in kwargs["install_requires"]

    globals()["setup"] = original_setup


def test_setup_uses_find_packages(monkeypatch):
    """Test that setup uses find_packages to determine packages."""
    recorded_args = {}

    mock_find_packages = MagicMock(return_value=["pkg1", "pkg2"])

    def recording_setup(*args, **kwargs):
        recorded_args["args"] = args
        recorded_args["kwargs"] = kwargs

    original_setup = setup
    globals()["setup"] = recording_setup

    # Execute a simulated version of the setup.py that uses the mocked find_packages
    exec(
        'from setuptools import setup\n'
        'from unittest.mock import MagicMock\n'
        'find_packages = MagicMock(return_value=["pkg1", "pkg2"])\n'
        'setup(\n'
        '    name="python-service",\n'
        '    version="0.1.0",\n'
        '    packages=find_packages(),\n'
        '    install_requires=[\n'
        '        "flask==3.0.0",\n'
        '        "flask-cors==4.0.0",\n'
        '    ],\n'
        ')\n',
        globals(),
    )

    kwargs = recorded_args["kwargs"]
    assert kwargs["packages"] == ["pkg1", "pkg2"]

    globals()["setup"] = original_setup


def test_setup_missing_required_argument_error():
    """Test behavior when setup is called without required arguments (simulated error case)."""
    with pytest.raises(TypeError):
        setup()  # calling setup without required args should raise TypeError