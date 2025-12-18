import bcrypt
import sqlite3
from pathlib import Path

db_path = Path("apex_assistant.db")
email = "test@apexrestoration.pro"
password = "testy12"
display_name = "Test User"
role = "admin"

password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Check if user exists
cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
existing = cursor.fetchone()

if existing:
    cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (password_hash, email))
    print(f"Updated {email} with new password")
else:
    cursor.execute(
        "INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, 1)",
        (email, password_hash, display_name, role)
    )
    print(f"Created new user: {email}")

conn.commit()
conn.close()
print(f"Credentials: {email} / {password}")
