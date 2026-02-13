import sys
import types
import sqlite3
import pytest
from unittest.mock import Mock

# Create a dummy backend.cal module with greet_user to satisfy import in app.py
backend_module = types.ModuleType("backend")
cal_module = types.ModuleType("backend.cal")
def _dummy_greet_user(user, val):
    return None
setattr(cal_module, "greet_user", _dummy_greet_user)
backend_module.cal = cal_module
sys.modules["backend"] = backend_module
sys.modules["backend.cal"] = cal_module

from app import login, register, update_password, delete_user
import app as app_module


@pytest.fixture
def app_db(monkeypatch):
    """
    Fixture to provide a fresh in-memory SQLite database and mock greet_user
    for each test. It also patches app.conn and app.cursor to use this DB.
    """
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE users (username TEXT PRIMARY KEY, password TEXT)")
    conn.commit()

    # Patch the globals in app module
    monkeypatch.setattr(app_module, "conn", conn)
    monkeypatch.setattr(app_module, "cursor", cursor)

    # Mock greet_user to avoid external dependency and to assert calls
    greet_mock = Mock()
    monkeypatch.setattr(app_module, "greet_user", greet_mock)

    yield {"conn": conn, "cursor": cursor, "greet_mock": greet_mock}

    conn.close()


@pytest.mark.parametrize("user,pw", [
    ("alice", "pw1"),
    ("bob", "secret"),
])
def test_login_success_returns_row_and_calls_greet_user(app_db, user, pw):
    """Test that login returns a matching row and calls greet_user with correct args."""
    assert register(user, pw) == "User registered successfully"
    result = login(user, pw)

    app_db["greet_mock"].assert_called_once_with(user, "15")
    assert isinstance(result, list)
    assert len(result) == 1
    assert result[0] == (user, pw)


def test_login_wrong_credentials_returns_empty_list_and_calls_greet_user(app_db):
    """Test login with wrong password returns empty list and greet_user is still called."""
    assert register("charlie", "rightpw") == "User registered successfully"
    result = login("charlie", "wrongpw")

    app_db["greet_mock"].assert_called_once_with("charlie", "15")
    assert result == []


def test_register_success_then_duplicate_username_returns_message(app_db):
    """Test registering a user succeeds, and duplicate username returns proper error message."""
    assert register("dupuser", "pw") == "User registered successfully"
    assert register("dupuser", "another") == "Username already exists"


def test_update_password_success_persists_change(app_db):
    """Test that updating password with correct old password succeeds and persists."""
    assert register("dave", "oldpw") == "User registered successfully"
    msg = update_password("dave", "oldpw", "newpw")
    assert msg == "Password updated successfully"

    # Verify old password no longer works, new password works
    result_old = login("dave", "oldpw")
    result_new = login("dave", "newpw")
    assert result_old == []
    assert len(result_new) == 1 and result_new[0] == ("dave", "newpw")


def test_update_password_incorrect_old_password_returns_message(app_db):
    """Test that updating password with incorrect old password returns proper message and no change."""
    assert register("eve", "secret") == "User registered successfully"
    msg = update_password("eve", "wrong", "newsecret")
    assert msg == "Incorrect old password"

    # Verify password unchanged
    assert login("eve", "secret") != []
    assert login("eve", "newsecret") == []


def test_delete_user_success_removes_user(app_db):
    """Test deleting an existing user with correct password succeeds and removes the user."""
    assert register("frank", "pw") == "User registered successfully"
    msg = delete_user("frank", "pw")
    assert msg == "User deleted successfully"
    assert login("frank", "pw") == []


def test_delete_user_incorrect_password_or_not_found(app_db):
    """Test deleting a user with incorrect password or non-existent user returns proper message."""
    assert register("grace", "pw") == "User registered successfully"
    # Incorrect password
    msg_incorrect = delete_user("grace", "wrong")
    assert msg_incorrect == "User not found or incorrect password"
    # Non-existent user
    msg_missing = delete_user("nobody", "pw")
    assert msg_missing == "User not found or incorrect password"


def test_login_sql_injection_bypasses_auth_and_returns_multiple_rows(app_db):
    """Test that login is vulnerable to SQL injection and returns multiple rows."""
    # Insert multiple users
    assert register("u1", "p1") == "User registered successfully"
    assert register("u2", "p2") == "User registered successfully"

    injection_username = "' OR '1'='1' -- "
    result = login(injection_username, "doesnt_matter")

    app_db["greet_mock"].assert_called_once_with(injection_username, "15")
    # Expect all rows to be returned due to injection
    assert isinstance(result, list)
    assert len(result) == 2
    # The returned rows should correspond to the inserted users (order may be deterministic here)
    returned_users = {row[0] for row in result}
    assert returned_users == {"u1", "u2"}