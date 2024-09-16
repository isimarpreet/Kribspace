import sqlite3
import random

conn = sqlite3.connect("database.db")

# Define the schema for the real estate properties table
conn.execute('''
CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT,
    budget REAL,
    size_sqft REAL,
    year_built INTEGER,
    property_type TEXT,
    amenities TEXT
)
''')

# Function to generate random data
def generate_random_data():
    locations = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"]
    property_types = ["House", "Apartment", "Condo", "Townhouse"]
   
    amenities_options = ["Pool", "Garage", "Garden", "Gym", "None"]
    
    location = random.choice(locations)
    budget = round(random.uniform(50000, 50000000), 2)
    size_sqft = round(random.uniform(500, 10000), 2)
    year_built = random.randint(1900, 2024)
    property_type = random.choice(property_types)
    amenities = random.choice(amenities_options)
    
    return (location, budget, size_sqft, year_built, property_type, amenities)

# Populate the database with 10,000 entries
for _ in range(10000):
    data = generate_random_data()
    conn.execute('''
    INSERT INTO properties (location, budget, size_sqft, year_built, property_type, amenities)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', data)

# Commit the transaction
conn.commit()

# Close the connection after populating
conn.close()

# Function to execute a query
def execute_query(query):
    connection = sqlite3.connect('database.db')
    cursor = connection.cursor()
    cursor.execute(query)
    results = cursor.fetchall()
    connection.close()
    return results
