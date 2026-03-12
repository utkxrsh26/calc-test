import json
import psycopg2
import os

def fetch_charger_coordinates_from_db():
    """Fetch all existing charger coordinates from the database."""
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "65.1.125.185"),
        database=os.getenv("DB_NAME", "cms_analytics"),
        user=os.getenv("DB_USER", "cms_analytics_admin"),
        password=os.getenv("DB_PASSWORD", "airbyte@Synergy!"),
        port=os.getenv("DB_PORT", "5433")
    )
    cursor = conn.cursor()
    cursor.execute("SELECT latitude, longitude FROM chargers_external")
    db_chargers = {f"{lat},{lon}" for lat, lon in cursor.fetchall()}
    cursor.close()
    conn.close()
    return db_chargers

def insert_unique_chargers_to_db(unique_chargers):
    """Insert unique chargers into the database, using rollback for safety."""
    if not unique_chargers:
        print("No new chargers to insert.")
        return

    conn = None
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "65.1.125.185"),
            database=os.getenv("DB_NAME", "cms_analytics"),
            user=os.getenv("DB_USER", "cms_analytics_admin"),
            password=os.getenv("DB_PASSWORD", "airbyte@Synergy!"),
            port=os.getenv("DB_PORT", "5433")
        )
        cursor = conn.cursor()

        insert_query = """
        INSERT INTO chargers_external (
            object_id, latitude, longitude, station_name, address, city, zip_code, country, 
            status, owner_type, data_source
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (object_id, data_source) DO UPDATE 
        SET 
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            station_name = EXCLUDED.station_name,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            zip_code = EXCLUDED.zip_code,
            country = EXCLUDED.country,
            status = EXCLUDED.status,
            owner_type = EXCLUDED.owner_type;

        """

        for charger in unique_chargers:
            values = (
                charger.get("id"),                
                charger.get("latitude"), 
                charger.get("longitude"),
                charger.get("station_name"),   # Changed from "caption"
                charger.get("address"),        # Changed from "identityKey"
                charger.get("city"),           # Changed from "addressCity"
                charger.get("zip_code"),       # Changed from "addressZipcode"
                charger.get("country"),        # Changed from "addressCountryName"
                charger.get("status"),         # Changed from "stationStatusId"
                charger.get("owner_type"),     # Changed from "stationOwnerName"
                "OBEP-SCRAPED"
            )
            cursor.execute(insert_query, values)
        
        conn.commit()
        print(f"Inserted {len(unique_chargers)} new chargers successfully.")

    except Exception as e:
        print(f"Error inserting chargers: {e}")
        if conn:
            conn.rollback()  # Rollback in case of failure

    finally:
        if conn:
            cursor.close()
            conn.close()


def find_unique_chargers(json_file, db_chargers):
    """Find chargers from JSON that are not already in the database."""
    unique_chargers = []
    try:
        with open(json_file, 'r', encoding='utf-8') as file:
            json_data = json.load(file)
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON file: {e}")
        return
    
    for charger in json_data:
        lat, lon = charger.get("latitude"), charger.get("longitude")
        if lat is None or lon is None:
            continue  # Skip invalid data
        key = f"{lat},{lon}"
        if key not in db_chargers:
            unique_chargers.append(charger)
    
    if unique_chargers:
        insert_unique_chargers_to_db(unique_chargers)
    
    print("Unique chargers processing completed and inserted into DB.")

if __name__ == "__main__":
    json_file = "unique_values_from_obe.json"  # Ensure this file exists
    db_chargers = fetch_charger_coordinates_from_db()
    find_unique_chargers(json_file, db_chargers)
