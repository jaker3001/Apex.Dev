import sqlite3
from datetime import datetime, timedelta

def create_sample_projects():
    conn = sqlite3.connect('apex_operations.db')
    cursor = conn.cursor()
    
    # Check if we have projects already
    cursor.execute("SELECT count(*) FROM projects")
    count = cursor.fetchone()[0]
    
    if count > 0:
        print(f"Database already has {count} projects. Skipping seed.")
        conn.close()
        return

    print("Seeding database with sample projects...")

    # Create a dummy client first
    try:
        cursor.execute("INSERT INTO clients (name, email, phone, is_active) VALUES (?, ?, ?, ?)", 
                       ("Test Client", "client@test.com", "555-0100", 1))
        client_id = cursor.lastrowid
        print(f"Created client with ID {client_id}")
    except Exception as e:
        print(f"Error creating client: {e}")
        client_id = 1 # Fallback
    
    projects = [
        (
            '202512-001-MIT', 'active', '123 Oak St', 'Springfield', 'IL', '62704',
            'Water', 'Category 2', 'Class 2', client_id, 
            datetime.now().strftime('%Y-%m-%d'), 
            (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
        ),
        (
            '202512-002-RPR', 'pending', '456 Maple Ave', 'Springfield', 'IL', '62704',
            'Fire', 'Category 1', 'Class 1', client_id,
            datetime.now().strftime('%Y-%m-%d'),
            (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
        ),
        (
            '202512-003-REM', 'lead', '789 Pine Ln', 'Shelbyville', 'IL', '62565',
            'Mold', 'Category 3', 'Class 3', client_id,
            None,
            (datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')
        )
    ]
    
    for p in projects:
        try:
            cursor.execute("""
                INSERT INTO projects (
                    job_number, status, address, city, state, zip,
                    damage_source, damage_category, damage_class, client_id,
                    start_date, date_contacted
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, p)
            print(f"Inserted project {p[0]}")
        except Exception as e:
            print(f"Error inserting {p[0]}: {e}")
            
    conn.commit()
    conn.close()
    print("Seeding complete.")

if __name__ == "__main__":
    create_sample_projects()