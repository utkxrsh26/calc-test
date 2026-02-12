import sys
import types
from unittest.mock import MagicMock, call
import pytest

# Mock external dependency before importing the module under test
backend = types.ModuleType("backend")
cal = types.ModuleType("backend.cal")
greet_user_mock = MagicMock(name="greet_user")
cal.greet_user = greet_user_mock
backend.cal = cal
sys.modules["backend"] = backend
sys.modules["backend.cal"] = cal

from app import login, register, update_password, delete_user  # noqa: E402
import app as app_module  # noqa: E402
import sqlite3  # noqa: E402


@pytest.fixture
def setup_app(monkeypatch):
    """
    Fixture to mock database connection and cursor for each test case.
    Also resets the greet_user mock.
    """
    cursor = MagicMock(name="cursor")
    conn = MagicMock(name="conn")
    # Default rowcount to 0 unless overridden by tests
    cursor.rowcount = 0

    monkeypatch.setattr(app_module, "cursor", cursor, raising=True)
    monkeypatch.setattr(app_module, "conn", conn, raising=True)

    # Reset external greet_user mock calls
    app_module.greet_user.reset_mock()

    return {"cursor": cursor, "conn": conn, "greet_user": app_module.greet_user}


@pytest.mark.parametrize(
    "user,pw,rows",
    [
        ("alice", "secret", []),
        ("bob", "hunter2", [("id", 2, "bob", "hunter2")]),
    ],
)
def test_login_returns_rows_and_calls_greet_user(setup_app, user, pw, rows):
    """Test login returns rows from fetchall and calls greet_user with correct args."""
    cursor = setup_app["cursor"]
    greet_user = setup_app["greet_user"]
    conn = setup_app["conn"]

    cursor.execute.return_value.fetchall.return_value = rows

    result = login(user, pw)

    assert result == rows
    greet_user.assert_called_once_with(user, "15")
    expected_query = f"SELECT * FROM users WHERE username = '{user}' AND password = '{pw}'"
    cursor.execute.assert_called_once_with(expected_query)
    conn.commit.assert_not_called()


def test_login_uses_raw_fstring_and_is_injection_prone(setup_app):
    """Test login builds a raw, unparameterized SQL query including special characters."""
    cursor = setup_app["cursor"]

    user = "admin' --"
    pw = "irrelevant"
    cursor.execute.return_value.fetchall.return_value = []

    login(user, pw)

    expected_query = f"SELECT * FROM users WHERE username = '{user}' AND password = '{pw}'"
    cursor.execute.assert_called_once_with(expected_query)


def test_register_success_commits_and_uses_params(setup_app):
    """Test register inserts user with parameterized query and commits on success."""
    cursor = setup_app["cursor"]
    conn = setup_app["conn"]

    user = "charlie"
    pw = "p@ssw0rd"

    msg = register(user, pw)

    assert msg == "User registered successfully"
    cursor.execute.assert_called_once_with(
        "INSERT INTO users (username, password) VALUES (?, ?)", (user, pw)
    )
    conn.commit.assert_called_once()


def test_register_integrity_error_returns_message_no_commit(setup_app):
    """Test register handles sqlite3.IntegrityError and does not commit."""
    cursor = setup_app["cursor"]
    conn = setup_app["conn"]

    cursor.execute.side_effect = sqlite3.IntegrityError()

    msg = register("dana", "duplicate")

    assert msg == "Username already exists"
    conn.commit.assert_not_called()


def test_update_password_success_updates_and_commits(setup_app):
    """Test update_password updates when old password matches and commits."""
    cursor = setup_app["cursor"]
    conn = setup_app["conn"]

    user = "erin"
    old_pw = "oldpass"
    new_pw = "newpass123"

    cursor.fetchone.return_value = ("some-row",)

    msg = update_password(user, old_pw, new_pw)

    assert msg == "Password updated successfully"
    assert cursor.execute.call_args_list[0] == call(
        "SELECT * FROM users WHERE username = ? AND password = ?", (user, old_pw)
    )
    assert cursor.execute.call_args_list[1] == call(
        "UPDATE users SET password = ? WHERE username = ?", (new_pw, user)
    )
    conn.commit.assert_called_once()


def test_update_password_incorrect_old_password_no_update_no_commit(setup_app):
    """Test update_password returns error when old password is incorrect."""
    cursor = setup_app["cursor"]
    conn = setup_app["conn"]

    user = "frank"
    old_pw = "wrong"
    new_pw = "newpass123"

    cursor.fetchone.return_value = None

    msg = update_password(user, old_pw, new_pw)

    assert msg == "Incorrect old password"
    # Only the SELECT should be executed
    assert len(cursor.execute.call_args_list) == 1
    assert cursor.execute.call_args_list[0] == call(
        "SELECT * FROM users WHERE username = ? AND password = ?", (user, old_pw)
    )
    conn.commit.assert_not_called()


@pytest.mark.parametrize(
    "rowcount,expected_message,committed",
    [
        (1, "User deleted successfully", True),
        (0, "User not found or incorrect password", False),
    ],
)
def test_delete_user_handles_rowcount_and_commit(setup_app, rowcount, expected_message, committed):
    """Test delete_user commits only when a user row is deleted and returns correct message."""
    cursor = setup_app["cursor"]
    conn = setup_app["conn"]

    user = "grace"
    pw = "topsecret"

    cursor.rowcount = rowcount

    msg = delete_user(user, pw)

    assert msg == expected_message
    cursor.execute.assert_called_once_with(
        "DELETE FROM users WHERE username = ? AND password = ?", (user, pw)
    )
    if committed:
        conn.commit.assert_called_once()
    else:
        conn.commit.assert_not_called()