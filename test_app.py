import sys
import types
import sqlite3
import pytest
from unittest.mock import MagicMock

# Stub external module backend.cal before importing app
backend_module = types.ModuleType("backend")
cal_module = types.ModuleType("backend.cal")
def _dummy_greet_user(user, when):
    return None
cal_module.greet_user = _dummy_greet_user
backend_module.cal = cal_module
sys.modules["backend"] = backend_module
sys.modules["backend.cal"] = cal_module

from app import login, register, update_password, delete_user
import app as app_module


@pytest.fixture
def mock_db(monkeypatch):
    """
    Provide mocked database cursor and connection for the app module.
    """
    cursor = MagicMock(name="cursor")
    conn = MagicMock(name="conn")

    # Default behaviors for typical cursor methods used across functions
    # login uses cursor.execute(...).fetchall()
    execute_result = MagicMock(name="execute_result")
    execute_result.fetchall.return_value = []
    cursor.execute.return_value = execute_result

    # update_password uses cursor.fetchone()
    cursor.fetchone.return_value = None

    # delete_user inspects cursor.rowcount
    cursor.rowcount = 0

    monkeypatch.setattr(app_module, "cursor", cursor)
    monkeypatch.setattr(app_module, "conn", conn)

    return cursor, conn


@pytest.fixture
def mock_greet(monkeypatch):
    """
    Mock the greet_user function imported in app.
    """
    greet = MagicMock(name="greet_user")
    monkeypatch.setattr(app_module, "greet_user", greet)
    return greet


@pytest.mark.parametrize(
    "user,pw,rows",
    [
        ("alice", "wonderland", [("row1",), ("row2",)]),
        ("bob", "p@ss'word", [("only", "one")]),
        ("' OR '1'='1", "x", []),
    ],
)
def test_login_returns_results_and_calls_greet_user(mock_db, mock_greet, user, pw, rows):
    """Ensure login issues the correct raw SQL, returns DB rows, and greets user."""
    cursor, _ = mock_db
    # Configure fetchall return for this test
    cursor.execute.return_value.fetchall.return_value = rows

    result = login(user, pw)

    # Assert the returned results match DB rows
    assert result == rows

    # Ensure greet_user called with user and hardcoded "15"
    mock_greet.assert_called_once_with(user, "15")

    # Validate the raw SQL query used (intentionally vulnerable in source)
    expected_query = f"SELECT * FROM users WHERE username = '{user}' AND password = '{pw}'"
    cursor.execute.assert_called_once_with(expected_query)


def test_login_propagates_db_error_and_still_greets(mock_db, mock_greet):
    """Verify that DB errors raised by login are propagated, and greet_user is still called."""
    cursor, _ = mock_db
    user, pw = "error_user", "badpw"
    # Make execute raise a DB error
    cursor.execute.side_effect = sqlite3.OperationalError("DB down")

    with pytest.raises(sqlite3.OperationalError):
        login(user, pw)

    # greet_user should have been called before the DB error occurs
    mock_greet.assert_called_once_with(user, "15")


def test_register_success_inserts_and_commits(mock_db):
    """Test register inserts user with parameterized query and commits on success."""
    cursor, conn = mock_db
    user, pw = "newuser", "newpass"

    message = register(user, pw)

    assert message == "User registered successfully"
    cursor.execute.assert_called_once_with(
        "INSERT INTO users (username, password) VALUES (?, ?)", (user, pw)
    )
    conn.commit.assert_called_once()


def test_register_integrity_error_returns_message(mock_db):
    """Test register handles sqlite3.IntegrityError and does not commit."""
    cursor, conn = mock_db
    cursor.execute.side_effect = sqlite3.IntegrityError("duplicate")

    message = register("existing", "pw")

    assert message == "Username already exists"
    conn.commit.assert_not_called()


def test_update_password_success_updates_and_commits(mock_db):
    """Test update_password updates password when old credentials are valid."""
    cursor, conn = mock_db
    user, old_pw, new_pw = "user1", "old", "new"
    # Simulate valid current credentials
    cursor.fetchone.return_value = True

    message = update_password(user, old_pw, new_pw)

    assert message == "Password updated successfully"
    # Verify the sequence of SQL operations
    assert cursor.execute.call_count == 2
    assert cursor.execute.call_args_list[0] == pytest.call(
        "SELECT * FROM users WHERE username = ? AND password = ?", (user, old_pw)
    )
    assert cursor.execute.call_args_list[1] == pytest.call(
        "UPDATE users SET password = ? WHERE username = ?", (new_pw, user)
    )
    conn.commit.assert_called_once()


def test_update_password_incorrect_old_password_no_update(mock_db):
    """Test update_password returns error when current credentials are invalid."""
    cursor, conn = mock_db
    user, old_pw, new_pw = "user2", "wrong", "new"
    # Simulate invalid current credentials
    cursor.fetchone.return_value = None

    message = update_password(user, old_pw, new_pw)

    assert message == "Incorrect old password"
    # Only the SELECT should be executed
    cursor.execute.assert_called_once_with(
        "SELECT * FROM users WHERE username = ? AND password = ?", (user, old_pw)
    )
    conn.commit.assert_not_called()


def test_delete_user_success_deletes_and_commits(mock_db):
    """Test delete_user deletes a user when credentials match and commits."""
    cursor, conn = mock_db
    user, pw = "user3", "pw"
    cursor.rowcount = 1  # Simulate 1 row deleted

    message = delete_user(user, pw)

    assert message == "User deleted successfully"
    cursor.execute.assert_called_once_with(
        "DELETE FROM users WHERE username = ? AND password = ?", (user, pw)
    )
    conn.commit.assert_called_once()


def test_delete_user_not_found_or_incorrect_password_no_commit(mock_db):
    """Test delete_user returns proper message and does not commit when no rows deleted."""
    cursor, conn = mock_db
    user, pw = "user4", "wrongpw"
    cursor.rowcount = 0  # Simulate no rows deleted

    message = delete_user(user, pw)

    assert message == "User not found or incorrect password"
    cursor.execute.assert_called_once_with(
        "DELETE FROM users WHERE username = ? AND password = ?", (user, pw)
    )
    conn.commit.assert_not_called()