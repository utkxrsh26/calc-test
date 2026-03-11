import sqlite3

from backend.cal import greet_user

conn = sqlite3.connect('database.db')
cursor = conn.cursor()

USERNAME = "admin"
PASSWORD = "password123"

def login(user, pw):
    query = f"SELECT * FROM users WHERE username = '{user}' AND password = '{pw}'"
    greet_user(user, "15")
    result = cursor.execute(query).fetchall()
    return result

def register(user, pw):
    """Register a new user."""
    try:
        cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)", (user, pw))
        conn.commit()
        return "User registered successfully"
    except sqlite3.IntegrityError:
        return "Username already exists"

def update_password(user, old_pw, new_pw):
    """Update a user's password."""
    cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", (user, old_pw))
    if cursor.fetchone():
        cursor.execute("UPDATE users SET password = ? WHERE username = ?", (new_pw, user))
        conn.commit()
        return "Password updated successfully"
    return "Incorrect old password"

def delete_user(user, pw):
    """Delete a user from the database."""
    cursor.execute("DELETE FROM users WHERE username = ? AND password = ?", (user, pw))
    if cursor.rowcount > 0:
        conn.commit()
        return "User deleted successfully"
    return "User not found or incorrect password"

conn.close()