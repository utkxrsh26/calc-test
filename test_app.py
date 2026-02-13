import sys
import sqlite3
import importlib
import pytest
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock, Mock, call


@pytest.fixture
def mock_env(monkeypatch):
    """Set up a mocked environment: backend.cal.greet_user and sqlite3 connection/cursor."""
    # Mock the external backend.cal.greet_user
    backend_mod = ModuleType("backend")
    cal_mod = ModuleType("backend.cal")
    greet_user_mock = Mock(name="greet_user")
    cal_mod.greet_user = greet_user_mock
    backend_mod.cal = cal_mod
    sys.modules["backend"] = backend_mod
    sys.modules["backend.cal"] = cal_mod

    # Mock sqlite connection and cursor
    cursor = MagicMock(name="cursor")
    cursor.execute.return_value = cursor  # support chaining: execute(...).fetchall()
    cursor.fetchall.return_value = []
    cursor.fetchone.return_value = None
    cursor.rowcount = 0

    conn = MagicMock(name="conn")
    conn.cursor.return_value = cursor

    def fake_connect(_):
        return conn

    monkeypatch.setattr(sqlite3, "connect", fake_connect)

    # Ensure a fresh import of app for each test
    if "app" in sys.modules:
        del sys.modules["app"]

    return SimpleNamespace(conn=conn, cursor=cursor, greet_user=greet_user_mock)


@pytest.mark.parametrize(
    "user,pw,rows",
    [
        ("alice", "secret", [("alice", "secret")]),
        ("admin' OR 1=1--", "x", [("row1",), ("row2",)]),
    ],
)
def test_login_returns_query_results_and_calls_greet_user(mock_env, user, pw, rows):
    """Test login returns cursor.fetchall results and calls greet_user with correct args."""
    from app import login

    mock_env.cursor.fetchall.return_value = rows
    result = login(user, pw)

    assert result == rows
    mock_env.greet_user.assert_called_once_with(user, "15")
    expected_query = f"SELECT * FROM users WHERE username = '{user}' AND password = '{pw}'"
    mock_env.cursor.execute.assert_called_once_with(expected_query)


def test_register_success_commits_and_uses_parameterized_query(mock_env):
    """Test register inserts a new user with parameterized query and commits on success."""
    from app import register

    user, pw = "bob", "hunter2"
    result = register(user, pw)

    assert result == "User registered successfully"
    mock_env.cursor.execute.assert_called_once_with(
        "INSERT INTO users (username, password) VALUES (?, ?)", (user, pw)
    )
    mock_env.conn.commit.assert_called_once()


def test_register_duplicate_username_returns_message_no_commit(mock_env):
    """Test register handles sqlite3.IntegrityError and does not commit on duplicate username."""
    from app import register

    user, pw = "alice", "pw"
    mock_env.cursor.execute.side_effect = sqlite3.IntegrityError

    result = register(user, pw)

    assert result == "Username already exists"
    mock_env.conn.commit.assert_not_called()


@pytest.mark.parametrize(
    "found,expected_message,should_commit",
    [
        (True, "Password updated successfully", True),
        (False, "Incorrect old password", False),
    ],
)
def test_update_password_behavior_based_on_current_credentials(
    mock_env, found, expected_message, should_commit
):
    """Test update_password updates when current credentials match, else returns error."""
    from app import update_password

    user = "bob"
    old_pw = "old"
    new_pw = "newpass"
    mock_env.cursor.fetchone.return_value = ("row",) if found else None

    result = update_password(user, old_pw, new_pw)

    assert result == expected_message
    # First call is the SELECT
    assert mock_env.cursor.execute.call_args_list[0] == call(
        "SELECT * FROM users WHERE username = ? AND password = ?", (user, old_pw)
    )
    if found:
        # Second call should be the UPDATE
        assert mock_env.cursor.execute.call_args_list[1] == call(
            "UPDATE users SET password = ? WHERE username = ?", (new_pw, user)
        )
        mock_env.conn.commit.assert_called_once()
    else:
        # No UPDATE executed, no commit
        assert len(mock_env.cursor.execute.call_args_list) == 1
        mock_env.conn.commit.assert_not_called()


@pytest.mark.parametrize(
    "rowcount,expected_message,should_commit",
    [
        (1, "User deleted successfully", True),
        (0, "User not found or incorrect password", False),
    ],
)
def test_delete_user_deletion_outcome_based_on_rowcount(
    mock_env, rowcount, expected_message, should_commit
):
    """Test delete_user commits and returns success only when a row is deleted."""
    from app import delete_user

    user, pw = "carl", "pass"
    mock_env.cursor.rowcount = rowcount

    result = delete_user(user, pw)

    assert result == expected_message
    mock_env.cursor.execute.assert_called_once_with(
        "DELETE FROM users WHERE username = ? AND password = ?", (user, pw)
    )
    if should_commit:
        mock_env.conn.commit.assert_called_once()
    else:
        mock_env.conn.commit.assert_not_called()