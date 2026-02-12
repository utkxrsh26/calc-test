import sys
import types
import pytest
from unittest.mock import Mock


@pytest.fixture
def fake_setuptools(monkeypatch):
    """Fixture to inject a fake setuptools module and ensure fresh import of the target setup module."""

    def _setup(find_packages_return=None, find_packages_side_effect=None):
        fake = types.ModuleType("setuptools")
        setup_mock = Mock(name="setup")

        if find_packages_side_effect is not None:
            find_packages_mock = Mock(name="find_packages", side_effect=find_packages_side_effect)
        else:
            if find_packages_return is None:
                find_packages_return = ["default_pkg"]
            find_packages_mock = Mock(name="find_packages", return_value=find_packages_return)

        fake.setup = setup_mock
        fake.find_packages = find_packages_mock

        # Inject our fake setuptools and ensure fresh import of the target module
        monkeypatch.setitem(sys.modules, "setuptools", fake)
        monkeypatch.delitem(sys.modules, "setup", raising=False)
        return setup_mock, find_packages_mock

    return _setup


@pytest.mark.parametrize("pkg_list", [
    [],
    ["only_pkg"],
    ["pkg_a", "pkg_b", "pkg_c"],
])
def test_setup_called_with_expected_arguments_success(fake_setuptools, pkg_list):
    """Ensure setuptools.setup is called once with expected kwargs and find_packages result."""
    setup_mock, find_packages_mock = fake_setuptools(find_packages_return=pkg_list)

    from setup import setup as exported_setup, find_packages as exported_find_packages

    # Exported names in module should be our mocks
    assert exported_setup is setup_mock
    assert exported_find_packages is find_packages_mock

    # find_packages should be called with no arguments
    find_packages_mock.assert_called_once_with()

    # setup should be called exactly once with the expected parameters
    assert setup_mock.call_count == 1
    _, kwargs = setup_mock.call_args
    assert kwargs["name"] == "python-service"
    assert kwargs["version"] == "0.1.0"
    assert kwargs["packages"] == pkg_list
    assert kwargs["install_requires"] == ["flask==3.0.0", "flask-cors==4.0.0"]


def test_setup_import_raises_when_find_packages_errors(fake_setuptools):
    """Propagate exceptions from find_packages during import, and ensure setup is not called."""
    setup_mock, find_packages_mock = fake_setuptools(find_packages_side_effect=RuntimeError("boom"))

    with pytest.raises(RuntimeError):
        from setup import setup as exported_setup  # noqa: F401

    assert setup_mock.call_count == 0
    assert find_packages_mock.call_count == 1
    assert "setup" not in sys.modules


def test_setup_exports_are_mocks(fake_setuptools):
    """Verify that exported names from setup module are the mocked ones."""
    setup_mock, find_packages_mock = fake_setuptools(find_packages_return=["x"])

    from setup import setup as s1, find_packages as f1

    assert s1 is setup_mock
    assert f1 is find_packages_mock