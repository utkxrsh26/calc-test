import pytest
from unittest.mock import MagicMock, patch

from app import login, register, update_password, delete_user


@pytest.fixture
def mock_sqlite_connect():
    """Fixture to mock sqlite3.connect, returning a mock connection and cursor."""
    with patch("app.sqlite3.connect") as mock_connect:
        mock_conn = MagicMock(name="mock_conn")
        mock_cursor = MagicMock(name="mock_cursor")
        mock_conn.cursor.return_value = mock_cursor
        mock_connect.return_value = mock_conn
        yield mock_conn, mock_cursor


@pytest.fixture(autouse=True)
def reset_app_db_mocks():
    """
    Autouse fixture to ensure that for each test, app's conn and cursor
    can be safely monkeypatched without leaking state between tests.
    """
    # No setup needed here because we patch conn and cursor explicitly in each test
    yield
    # No teardown needed; patches are handled by context managers in each test


@pytest.mark.parametrize(
    "user,pw,db_result",
    [
        ("admin", "password123", [("admin", "password123")]),
        ("user1", "pw1", []),
    ],
)
def test_login_executes_query_and_returns_result(user, pw, db_result):
    """Test login executes the correct SQL query and returns database results."""
    with patch("app.cursor") as mock_cursor, patch("app.greet_user") as mock_greet:
        mock_cursor.execute.return_value.fetchall.return_value = db_result

        result = login(user, pw)

        expected_query = f"SELECT * FROM users WHERE username = '{user}' AND password = '{pw}'"
        mock_cursor.execute.assert_called_once_with(expected_query)
        mock_greet.assert_called_once_with(user, "15")
        assert result == db_result


def test_login_allows_sql_injection_like_input():
    """Test login with SQL-like input to ensure it still builds raw query as coded."""
    malicious_user = "admin' OR '1'='1"
    pw = "anything"
    fake_result = [("row1",), ("row2",)]

    with patch("app.cursor") as mock_cursor, patch("app.greet_user"):
        mock_cursor.execute.return_value.fetchall.return_value = fake_result

        result = login(malicious_user, pw)

        expected_query = (
            "SELECT * FROM users WHERE username = 'admin' OR '1'='1' AND password = 'anything'"
        )
        mock_cursor.execute.assert_called_once_with(expected_query)
        assert result == fake_result


@pytest.mark.parametrize(
    "user,pw,rows_affected,expected_message",
    [
        ("newuser", "newpass", 1, "User registered successfully"),
    ],
)
def test_register_success(user, pw, rows_affected, expected_message):
    """Test register inserts a new user and commits on success."""
    with patch("app.cursor") as mock_cursor, patch("app.conn") as mock_conn:
        mock_cursor.execute.return_value.rowcount = rows_affected

        result = register(user, pw)

        mock_cursor.execute.assert_called_once_with(
            "INSERT INTO users (username, password) VALUES (?, ?)", (user, pw)
        )
        mock_conn.commit.assert_called_once()
        assert result == expected_message


def test_register_username_already_exists():
    """Test register returns proper message when username already exists."""
    with patch("app.cursor") as mock_cursor, patch("app.conn") as mock_conn:
        mock_cursor.execute.side_effect = __import__("sqlite3").IntegrityError()

        result = register("existing_user", "pw")

        mock_conn.commit.assert_not_called()
        assert result == "Username already exists"


def test_update_password_success():
    """Test update_password updates password when old credentials are correct."""
    user = "user1"
    old_pw = "oldpw"
    new_pw = "newpw"

    with patch("app.cursor") as mock_cursor, patch("app.conn") as mock_conn:
        # First SELECT returns a row (user exists with old_pw)
        mock_cursor.fetchone.return_value = ("user1", "oldpw")

        result = update_password(user, old_pw, new_pw)

        mock_cursor.execute.assert_any_call(
            "SELECT * FROM users WHERE username = ? AND password = ?", (user, old_pw)
        )
        mock_cursor.execute.assert_any_call(
            "UPDATE users SET password = ? WHERE username = ?", (new_pw, user)
        )
        mock_conn.commit.assert_called_once()
        assert result == "Password updated successfully"


@pytest.mark.parametrize(
    "fetch_result,expected_message,expect_commit",
    [
        (None, "Incorrect old password", False),
    ],
)
def test_update_password_incorrect_old_password(fetch_result, expected_message, expect_commit):
    """Test update_password behavior when the old password is incorrect or user not found."""
    user = "user1"
    old_pw = "wrongpw"
    new_pw = "newpw"

    with patch("app.cursor") as mock_cursor, patch("app.conn") as mock_conn:
        mock_cursor.fetchone.return_value = fetch_result

        result = update_password(user, old_pw, new_pw)

        mock_cursor.execute.assert_called_once_with(
            "SELECT * FROM users WHERE username = ? AND password = ?", (user, old_pw)
        )
        mock_conn.commit.assert_not_called()
        assert result == expected_message
        if not expect_commit:
            mock_conn.commit.assert_not_called()


def test_delete_user_success():
    """Test delete_user deletes user when correct credentials are provided."""
    user = "user1"
    pw = "pw1"

    with patch("app.cursor") as mock_cursor, patch("app.conn") as mock_conn:
        mock_cursor.rowcount = 1

        result = delete_user(user, pw)

        mock_cursor.execute.assert_called_once_with(
            "DELETE FROM users WHERE username = ? AND password = ?", (user, pw)
        )
        mock_conn.commit.assert_called_once()
        assert result == "User deleted successfully"


@pytest.mark.parametrize("rowcount", [0, -1])
def test_delete_user_not_found_or_incorrect_password(rowcount):
    """Test delete_user returns proper message when user is not found or password is incorrect."""
    user = "unknown"
    pw = "wrong"

    with patch("app.cursor") as mock_cursor, patch("app.conn") as mock_conn:
        mock_cursor.rowcount = rowcount

        result = delete_user(user, pw)

        mock_cursor.execute.assert_called_once_with(
            "DELETE FROM users WHERE username = ? AND password = ?", (user, pw)
        )
        mock_conn.commit.assert_not_called()
        assert result == "User not found or incorrect password"