"""
Rental Application Table Migration
Run this to create the rental_applications table
"""
import sqlite3

DB_PATH = 'rentkeepers.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Creating rental_applications table...")
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rental_applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        property_id INTEGER,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        date_of_birth DATE,
        ssn_last4 TEXT(4),
        current_address TEXT NOT NULL,
        current_city TEXT NOT NULL,
        current_state TEXT NOT NULL,
        current_zip TEXT NOT NULL,
        current_rent REAL,
        landlord_name TEXT,
        landlord_phone TEXT,
        employment_status TEXT NOT NULL,
        employer_name TEXT,
        employer_phone TEXT,
        position TEXT,
        monthly_income REAL,
        additional_occupants TEXT,
        has_pets INTEGER DEFAULT 0,
        pet_details TEXT,
        has_vehicle INTEGER DEFAULT 0,
        vehicle_make TEXT,
        vehicle_model TEXT,
        vehicle_year INTEGER,
        vehicle_color TEXT,
        license_plate TEXT,
        applicant_references TEXT,
        move_in_date DATE,
        lease_term TEXT,
        how_heard TEXT,
        additional_comments TEXT,
        consent_background_check INTEGER DEFAULT 0,
        consent_credit_check INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        screening_status TEXT,
        screening_report_url TEXT,
        admin_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (property_id) REFERENCES properties(id)
    )
    """)
    
    conn.commit()
    conn.close()
    print("✅ rental_applications table created!")

if __name__ == '__main__':
    migrate()
