import sys
import types
import sqlite3
import pytest
from unittest.mock import Mock

# Provide a stub for external dependency before importing app
backend = types.ModuleType("backend")
cal = types.ModuleType("backend.cal")
def _dummy_greet_user(*args, **kwargs):
    pass
cal.greet_user = _dummy_greet_user
sys.modules.setdefault("backend", backend)
sys.modules.setdefault("backend.cal", cal)

from app import login, register, update_password, delete_user  # noqa: E402
import app as app_module  # noqa: E402


@pytest.fixture
def db(monkeypatch):
    """Set up an in-memory sqlite database and patch app's conn/cursor."""
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute(
        "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)"
    )
    conn.commit()

    # Patch the globals in the app module so functions use this in-memory DB
    monkeypatch.setattr(app_module, "conn", conn)
    monkeypatch.setattr(app_module, "cursor", cursor)

    try:
        yield {"conn": conn, "cursor": cursor}
    finally:
        conn.close()


@pytest.fixture
def greet_mock(monkeypatch):
    """Mock the greet_user function imported by app."""
    mock = Mock()
    monkeypatch.setattr(app_module, "greet_user", mock)
    return mock


def test_register_success(db):
    """Register a new user successfully."""
    msg = register("alice", "wonderland")
    assert msg == "User registered successfully"

    cur = db["cursor"]
    cur.execute("SELECT username, password FROM users WHERE username = ?", ("alice",))
    row = cur.fetchone()
    assert row == ("alice", "wonderland")


def test_register_duplicate_user(db):
    """Attempt to register a duplicate username and receive an error."""
    assert register("bob", "secret") == "User registered successfully"
    assert register("bob", "another") == "Username already exists"


def test_login_happy_path_calls_greet_user(db, greet_mock):
    """Login with correct credentials returns matching rows and calls greet_user."""
    register("carol", "s3cr3t")

    result = login("carol", "s3cr3t")

    greet_mock.assert_called_once_with("carol", "15")
    assert isinstance(result, list)
    assert len(result) == 1
    row = result[0]
    # row schema: (id, username, password)
    assert isinstance(row[0], int)
    assert row[1] == "carol"
    assert row[2] == "s3cr3t"


@pytest.mark.parametrize("user,pw", [
    ("carol", "wrongpass"),   # existing user, wrong password
    ("nonexistent", "anypw"), # non-existing user
])
def test_login_wrong_credentials_returns_empty_and_calls_greet(db, greet_mock, user, pw):
    """Login with wrong credentials returns empty list and still calls greet_user."""
    register("carol", "s3cr3t")

    result = login(user, pw)

    greet_mock.assert_called_once_with(user, "15")
    assert result == []


def test_login_sql_injection_bypasses_password(db, greet_mock):
    """Demonstrate SQL injection vulnerability in login."""
    register("victim", "secret")
    # Craft username to break out of the quoted string and comment the rest
    injected_user = "' OR 1=1 -- "
    result = login(injected_user, "irrelevant")

    greet_mock.assert_called_once_with(injected_user, "15")
    assert len(result) >= 1  # Should return at least one row due to injection


def test_update_password_success(db):
    """Successfully update a user's password."""
    register("dave", "oldpass")
    msg = update_password("dave", "oldpass", "newpass")
    assert msg == "Password updated successfully"

    cur = db["cursor"]
    cur.execute("SELECT username, password FROM users WHERE username = ?", ("dave",))
    row = cur.fetchone()
    assert row == ("dave", "newpass")


def test_update_password_incorrect_old_password(db):
    """Fail to update password when current password is incorrect."""
    register("erin", "correctpass")
    msg = update_password("erin", "wrongpass", "newpass")
    assert msg == "Incorrect old password"

    cur = db["cursor"]
    cur.execute("SELECT username, password FROM users WHERE username = ?", ("erin",))
    row = cur.fetchone()
    assert row == ("erin", "correctpass")


def test_update_password_nonexistent_user(db):
    """Fail to update password for a nonexistent user."""
    msg = update_password("ghost", "any", "new")
    assert msg == "Incorrect old password"


def test_delete_user_success(db):
    """Successfully delete a user with correct credentials."""
    register("helen", "pw")
    msg = delete_user("helen", "pw")
    assert msg == "User deleted successfully"

    cur = db["cursor"]
    cur.execute("SELECT * FROM users WHERE username = ?", ("helen",))
    assert cur.fetchone() is None


@pytest.mark.parametrize("user,pw", [
    ("helen", "wrong"),   # existing user, wrong password
    ("unknown", "anypw"), # nonexistent user
])
def test_delete_user_not_found_or_incorrect_password(db, user, pw):
    """Fail to delete a user when credentials are incorrect or user does not exist."""
    register("helen", "pw")
    msg = delete_user(user, pw)
    assert msg == "User not found or incorrect password"

    # Ensure original user still exists if wrong password was provided
    cur = db["cursor"]
    cur.execute("SELECT username FROM users WHERE username = ?", ("helen",))
    assert cur.fetchone() == ("helen",)