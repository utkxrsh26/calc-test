import sys
import types
import pytest


def _install_fake_setuptools(monkeypatch, *, raise_error=None, find_packages_return=("fakepkg",)):
    """
    Install a fake 'setuptools' module into sys.modules that records setup() calls
    and provides a controllable find_packages() return value.
    """
    fake = types.ModuleType("setuptools")
    fake._calls = []
    fake._find_packages_call_count = 0

    def fake_find_packages():
        fake._find_packages_call_count += 1
        return list(find_packages_return)

    def fake_setup(*args, **kwargs):
        if raise_error:
            raise raise_error
        fake._calls.append({"args": args, "kwargs": kwargs})

    fake.find_packages = fake_find_packages
    fake.setup = fake_setup

    # Inject fake setuptools; monkeypatch will restore original automatically
    monkeypatch.setitem(sys.modules, "setuptools", fake)
    return fake


@pytest.fixture(autouse=False)
def fresh_setup_module():
    """
    Ensure a fresh import of the 'setup' module by clearing it from sys.modules
    before and after a test.
    """
    sys.modules.pop("setup", None)
    try:
        yield
    finally:
        sys.modules.pop("setup", None)


def test_setup_called_with_expected_metadata(monkeypatch, fresh_setup_module):
    """Verify that importing the setup module calls setuptools.setup with expected metadata."""
    expected_pkgs = ["pkg_a", "pkg_b"]
    fake_setuptools = _install_fake_setuptools(
        monkeypatch, find_packages_return=tuple(expected_pkgs)
    )

    from setup import setup, find_packages  # noqa: F401

    # The imported objects should be our fakes
    assert setup is fake_setuptools.setup
    assert find_packages is fake_setuptools.find_packages

    # The setup() should have been called exactly once on import
    assert len(fake_setuptools._calls) == 1

    kwargs = fake_setuptools._calls[0]["kwargs"]

    # Validate key metadata fields
    assert kwargs["name"] == "python-service"
    assert kwargs["version"] == "0.1.0"

    # packages should be the return of our fake find_packages
    assert kwargs["packages"] == expected_pkgs
    assert fake_setuptools._find_packages_call_count == 1

    # install_requires should include the expected dependencies
    assert kwargs["install_requires"] == ["flask==3.0.0", "flask-cors==4.0.0"]
    assert all(isinstance(x, str) for x in kwargs["install_requires"])


@pytest.mark.parametrize("dep", ["flask==3.0.0", "flask-cors==4.0.0"])
def test_setup_install_requires_contains_dependencies(dep, monkeypatch, fresh_setup_module):
    """Parametrized test to ensure each required dependency is present in install_requires."""
    fake_setuptools = _install_fake_setuptools(monkeypatch)

    from setup import setup  # noqa: F401

    assert len(fake_setuptools._calls) == 1
    kwargs = fake_setuptools._calls[0]["kwargs"]
    assert dep in kwargs["install_requires"]


def test_import_raises_if_setup_errors(monkeypatch, fresh_setup_module):
    """Ensure that if setuptools.setup raises, importing the module propagates the error."""
    boom = RuntimeError("boom")
    _install_fake_setuptools(monkeypatch, raise_error=boom)

    with pytest.raises(RuntimeError) as excinfo:
        from setup import setup  # noqa: F401

    assert "boom" in str(excinfo.value)
    assert "setup" not in sys.modules  # Import should have failed, module not cached