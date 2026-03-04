# ═══════════════════════════════════════════════════════════════════════════════
# Firebase Firestore Database Module for EV Cars Application
# ═══════════════════════════════════════════════════════════════════════════════
# This file initializes Firebase and provides helper functions for Firestore
# database operations, replacing the SQLAlchemy ORM.
#
# Collections (equivalent to SQLite tables):
#   - admins: Administrator credentials for authentication
#   - customers: Customer accounts for personalized experience
#   - cars: Electric vehicle listings with details and images
#   - leads: Customer interest/inquiry information
#   - appointments: Scheduled test drive appointments
#   - saved_cars: Links customers to their saved/garage cars
#   - settings: Application settings (key-value pairs)
# ═══════════════════════════════════════════════════════════════════════════════

import os
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import credentials, firestore

# ─────────────────────────────────────────────────────────────────────────────
# FIREBASE INITIALIZATION
# ─────────────────────────────────────────────────────────────────────────────
# The credentials file should be downloaded from Firebase Console:
# Project Settings > Service Accounts > Generate New Private Key
#
# IMPORTANT: Never commit the credentials file to version control!
# Add it to .gitignore: backend/firebase-credentials.json

def initialize_firebase():
    """
    Initialize Firebase Admin SDK with service account credentials.
    
    The function checks if Firebase is already initialized to prevent
    multiple initialization errors during development with hot reload.
    
    Returns:
        firestore.Client: Firestore database client
    """
    # Check if Firebase is already initialized
    if not firebase_admin._apps:
        # Look for credentials file in the backend directory
        cred_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'firebase-credentials.json')
        
        if not os.path.exists(cred_path):
            raise FileNotFoundError(
                f"Firebase credentials file not found at: {cred_path}\n"
                "Please download your service account key from Firebase Console:\n"
                "1. Go to Firebase Console > Project Settings > Service Accounts\n"
                "2. Click 'Generate New Private Key'\n"
                "3. Save the file as 'backend/firebase-credentials.json'"
            )
        
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    
    return firestore.client()


# Initialize Firestore client
db = initialize_firebase()


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS FOR DOCUMENT CONVERSION
# ═══════════════════════════════════════════════════════════════════════════════

def doc_to_dict(doc, include_id=True):
    """
    Convert a Firestore document to a dictionary.
    
    Args:
        doc: Firestore document snapshot
        include_id: Whether to include the document ID in the dict
        
    Returns:
        dict: Document data with optional ID field
    """
    if not doc.exists:
        return None
    
    data = doc.to_dict()
    if include_id:
        data['id'] = doc.id
    return data


def datetime_to_iso(dt):
    """Convert datetime to ISO string for JSON serialization."""
    if dt is None:
        return None
    if hasattr(dt, 'isoformat'):
        return dt.isoformat()
    return str(dt)


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN COLLECTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_admin_by_username(username: str):
    """
    Find an admin by username.
    
    Args:
        username: Admin's username
        
    Returns:
        dict: Admin data with 'admin_id' field, or None if not found
    """
    admins_ref = db.collection('admins')
    query = admins_ref.where('username', '==', username).limit(1)
    docs = list(query.stream())
    
    if not docs:
        return None
    
    data = docs[0].to_dict()
    data['admin_id'] = docs[0].id
    return data


def get_admin_by_id(admin_id: str):
    """
    Get an admin by their document ID.
    
    Args:
        admin_id: Firestore document ID
        
    Returns:
        dict: Admin data or None if not found
    """
    doc = db.collection('admins').document(admin_id).get()
    if not doc.exists:
        return None
    
    data = doc.to_dict()
    data['admin_id'] = doc.id
    return data


def create_admin(username: str, password_hash: str):
    """
    Create a new admin user.
    
    Args:
        username: Admin's username
        password_hash: Hashed password (use werkzeug.security.generate_password_hash)
        
    Returns:
        str: Document ID of the created admin
    """
    doc_ref = db.collection('admins').add({
        'username': username,
        'password_hash': password_hash,
    })
    return doc_ref[1].id


def admin_exists(username: str) -> bool:
    """Check if an admin with the given username exists."""
    return get_admin_by_username(username) is not None


# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOMER COLLECTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_customer_by_email(email: str):
    """
    Find a customer by email.
    
    Args:
        email: Customer's email (case-insensitive)
        
    Returns:
        dict: Customer data with 'customer_id' field, or None if not found
    """
    customers_ref = db.collection('customers')
    query = customers_ref.where('email', '==', email.lower()).limit(1)
    docs = list(query.stream())
    
    if not docs:
        return None
    
    data = docs[0].to_dict()
    data['customer_id'] = docs[0].id
    return data


def get_customer_by_id(customer_id: str):
    """
    Get a customer by their document ID.
    
    Args:
        customer_id: Firestore document ID
        
    Returns:
        dict: Customer data or None if not found
    """
    doc = db.collection('customers').document(customer_id).get()
    if not doc.exists:
        return None
    
    data = doc.to_dict()
    data['customer_id'] = doc.id
    return data


def create_customer(name: str, email: str, password_hash: str, phone: str = None):
    """
    Create a new customer account.
    
    Args:
        name: Customer's display name
        email: Customer's email (will be lowercased)
        password_hash: Hashed password
        phone: Optional phone number
        
    Returns:
        dict: Created customer data with customer_id
    """
    customer_data = {
        'name': name,
        'email': email.lower(),
        'password_hash': password_hash,
        'phone': phone,
        'created_at': datetime.now(timezone.utc),
    }
    
    doc_ref = db.collection('customers').add(customer_data)
    customer_data['customer_id'] = doc_ref[1].id
    return customer_data


def customer_to_dict(customer: dict):
    """
    Convert customer data to safe dictionary (excludes password_hash).
    
    Args:
        customer: Customer data dictionary
        
    Returns:
        dict: Safe customer data for API responses
    """
    return {
        'customer_id': customer.get('customer_id'),
        'name': customer.get('name'),
        'email': customer.get('email'),
        'phone': customer.get('phone'),
        'created_at': datetime_to_iso(customer.get('created_at')),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# CAR COLLECTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_all_cars(budget: float = None, min_range: int = None):
    """
    Get all cars with optional filtering.
    
    Args:
        budget: Maximum price filter (optional)
        min_range: Minimum range in km filter (optional)
        
    Returns:
        list: List of car dictionaries sorted by price ascending
    """
    cars_ref = db.collection('cars')
    query = cars_ref
    
    # Note: Firestore has limitations on compound queries
    # For complex filtering, we may need to filter in Python
    cars = []
    for doc in query.stream():
        car = doc.to_dict()
        car['car_id'] = doc.id
        
        # Apply filters in Python (Firestore compound query limitations)
        if budget is not None and car.get('price', 0) > budget:
            continue
        if min_range is not None and car.get('range_km', 0) < min_range:
            continue
        
        cars.append(car)
    
    # Sort by price ascending
    cars.sort(key=lambda x: x.get('price', 0))
    return cars


def get_available_cars():
    """
    Get all available (not sold) cars.
    
    Returns:
        list: List of available car dictionaries
    """
    cars_ref = db.collection('cars')
    query = cars_ref.where('status', '==', 'available')
    
    cars = []
    for doc in query.stream():
        car = doc.to_dict()
        car['car_id'] = doc.id
        cars.append(car)
    
    return cars


def get_featured_cars(limit: int = 6):
    """
    Get featured cars (cheapest available cars).
    
    Args:
        limit: Maximum number of cars to return
        
    Returns:
        list: List of car dictionaries
    """
    cars = get_all_cars()
    return cars[:limit]


def get_car_by_id(car_id: str):
    """
    Get a car by its document ID.
    
    Args:
        car_id: Firestore document ID
        
    Returns:
        dict: Car data or None if not found
    """
    doc = db.collection('cars').document(car_id).get()
    if not doc.exists:
        return None
    
    data = doc.to_dict()
    data['car_id'] = doc.id
    return data


def create_car(model: str, year: int, price: float, range_km: int, 
               charge_time_min: int, description: str, image_url: str):
    """
    Create a new car listing.
    
    Args:
        model: Car model name
        year: Manufacturing year
        price: Price in AED
        range_km: Battery range in kilometers
        charge_time_min: Fast charging time in minutes
        description: Vehicle description
        image_url: URL or path to car image
        
    Returns:
        dict: Created car data with car_id
    """
    car_data = {
        'model': model,
        'year': year,
        'price': price,
        'range_km': range_km,
        'charge_time_min': charge_time_min,
        'description': description,
        'image_url': image_url,
        'status': 'available',
        'sale_price': None,
        'sold_date': None,
    }
    
    doc_ref = db.collection('cars').add(car_data)
    car_data['car_id'] = doc_ref[1].id
    return car_data


def update_car(car_id: str, **kwargs):
    """
    Update a car's fields.
    
    Args:
        car_id: Firestore document ID
        **kwargs: Fields to update
        
    Returns:
        dict: Updated car data or None if not found
    """
    doc_ref = db.collection('cars').document(car_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return None
    
    doc_ref.update(kwargs)
    return get_car_by_id(car_id)


def delete_car(car_id: str):
    """
    Delete a car and its related records (leads, appointments, saved_cars).
    
    Args:
        car_id: Firestore document ID
        
    Returns:
        bool: True if deleted, False if not found
    """
    doc_ref = db.collection('cars').document(car_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return False
    
    # Delete related leads
    leads = db.collection('leads').where('car_id', '==', car_id).stream()
    for lead in leads:
        lead.reference.delete()
    
    # Delete related appointments
    appointments = db.collection('appointments').where('car_id', '==', car_id).stream()
    for apt in appointments:
        apt.reference.delete()
    
    # Delete related saved_cars
    saved = db.collection('saved_cars').where('car_id', '==', car_id).stream()
    for s in saved:
        s.reference.delete()
    
    # Delete the car
    doc_ref.delete()
    return True


def sell_car(car_id: str, sale_price: float):
    """
    Mark a car as sold.
    
    Args:
        car_id: Firestore document ID
        sale_price: Final sale price
        
    Returns:
        dict: Updated car data or None if not found
    """
    return update_car(car_id, 
                      status='sold', 
                      sale_price=sale_price, 
                      sold_date=datetime.now(timezone.utc))


def car_to_dict(car: dict):
    """
    Convert car data to dictionary for API responses.
    
    Args:
        car: Car data dictionary
        
    Returns:
        dict: Car data formatted for JSON response
    """
    return {
        'car_id': car.get('car_id'),
        'model': car.get('model'),
        'year': car.get('year'),
        'price': car.get('price'),
        'range_km': car.get('range_km'),
        'charge_time_min': car.get('charge_time_min'),
        'description': car.get('description'),
        'image_url': car.get('image_url'),
        'status': car.get('status', 'available'),
        'sale_price': car.get('sale_price'),
        'sold_date': datetime_to_iso(car.get('sold_date')),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LEAD COLLECTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def create_lead(name: str, email: str, car_id: str, message: str = None):
    """
    Create a new lead (customer interest).
    
    Args:
        name: Customer's name
        email: Customer's email
        car_id: ID of the car they're interested in
        message: Optional message
        
    Returns:
        dict: Created lead data with lead_id
    """
    # Get car info for denormalization
    car = get_car_by_id(car_id)
    car_model = car.get('model') if car else None
    
    lead_data = {
        'name': name,
        'email': email,
        'message': message,
        'car_id': car_id,
        'car_model': car_model,  # Denormalized for easy access
        'created_at': datetime.now(timezone.utc),
    }
    
    doc_ref = db.collection('leads').add(lead_data)
    lead_data['lead_id'] = doc_ref[1].id
    return lead_data


def get_all_leads():
    """
    Get all leads sorted by creation date (newest first).
    
    Returns:
        list: List of lead dictionaries
    """
    leads_ref = db.collection('leads').order_by('created_at', direction=firestore.Query.DESCENDING)
    
    leads = []
    for doc in leads_ref.stream():
        lead = doc.to_dict()
        lead['lead_id'] = doc.id
        leads.append(lead)
    
    return leads


def get_lead_by_id(lead_id: str):
    """
    Get a lead by its document ID.
    
    Args:
        lead_id: Firestore document ID
        
    Returns:
        dict: Lead data or None if not found
    """
    doc = db.collection('leads').document(lead_id).get()
    if not doc.exists:
        return None
    
    data = doc.to_dict()
    data['lead_id'] = doc.id
    return data


def delete_lead(lead_id: str):
    """
    Delete a lead.
    
    Args:
        lead_id: Firestore document ID
        
    Returns:
        bool: True if deleted, False if not found
    """
    doc_ref = db.collection('leads').document(lead_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return False
    
    doc_ref.delete()
    return True


def lead_to_dict(lead: dict):
    """Convert lead data to dictionary for API responses."""
    return {
        'lead_id': lead.get('lead_id'),
        'name': lead.get('name'),
        'email': lead.get('email'),
        'message': lead.get('message'),
        'car_id': lead.get('car_id'),
        'car_model': lead.get('car_model'),
        'created_at': datetime_to_iso(lead.get('created_at')),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# APPOINTMENT COLLECTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def create_appointment(customer_name: str, customer_email: str, car_id: str,
                       appointment_date: str, appointment_time: str, 
                       customer_phone: str = None):
    """
    Create a new appointment (test drive booking).
    
    Args:
        customer_name: Customer's name
        customer_email: Customer's email
        car_id: ID of the car for test drive
        appointment_date: Date string (YYYY-MM-DD)
        appointment_time: Time string (HH:MM)
        customer_phone: Optional phone number
        
    Returns:
        dict: Created appointment data with appointment_id
    """
    # Get car info for denormalization
    car = get_car_by_id(car_id)
    car_model = car.get('model') if car else None
    
    appointment_data = {
        'customer_name': customer_name,
        'customer_email': customer_email,
        'customer_phone': customer_phone,
        'car_id': car_id,
        'car_model': car_model,  # Denormalized for easy access
        'appointment_date': appointment_date,  # Store as string for easy querying
        'appointment_time': appointment_time,  # Store as string for easy querying
        'status': 'scheduled',
        'created_at': datetime.now(timezone.utc),
    }
    
    doc_ref = db.collection('appointments').add(appointment_data)
    appointment_data['appointment_id'] = doc_ref[1].id
    return appointment_data


def get_all_appointments():
    """
    Get all appointments sorted by date and time.
    
    Returns:
        list: List of appointment dictionaries
    """
    # Fetch all appointments without compound ordering (avoids index requirement)
    appointments_ref = db.collection('appointments')
    
    appointments = []
    for doc in appointments_ref.stream():
        apt = doc.to_dict()
        apt['appointment_id'] = doc.id
        appointments.append(apt)
    
    # Sort in Python by date and time
    appointments.sort(key=lambda x: (x.get('appointment_date', ''), x.get('appointment_time', '')))
    
    return appointments


def get_appointment_by_id(appointment_id: str):
    """
    Get an appointment by its document ID.
    
    Args:
        appointment_id: Firestore document ID
        
    Returns:
        dict: Appointment data or None if not found
    """
    doc = db.collection('appointments').document(appointment_id).get()
    if not doc.exists:
        return None
    
    data = doc.to_dict()
    data['appointment_id'] = doc.id
    return data


def get_booked_slots(date_str: str):
    """
    Get all booked time slots for a given date.
    
    Args:
        date_str: Date string (YYYY-MM-DD)
        
    Returns:
        set: Set of booked time strings (e.g., {"09:00", "10:00"})
    """
    appointments_ref = db.collection('appointments')
    query = appointments_ref.where('appointment_date', '==', date_str).where('status', '==', 'scheduled')
    
    booked_times = set()
    for doc in query.stream():
        apt = doc.to_dict()
        booked_times.add(apt.get('appointment_time'))
    
    return booked_times


def is_slot_available(date_str: str, time_str: str) -> bool:
    """
    Check if a time slot is available.
    
    Args:
        date_str: Date string (YYYY-MM-DD)
        time_str: Time string (HH:MM)
        
    Returns:
        bool: True if slot is available
    """
    appointments_ref = db.collection('appointments')
    query = appointments_ref.where('appointment_date', '==', date_str)\
                           .where('appointment_time', '==', time_str)\
                           .where('status', '==', 'scheduled')\
                           .limit(1)
    
    docs = list(query.stream())
    return len(docs) == 0


def update_appointment_status(appointment_id: str, status: str):
    """
    Update an appointment's status.
    
    Args:
        appointment_id: Firestore document ID
        status: New status ('scheduled', 'completed', 'cancelled')
        
    Returns:
        dict: Updated appointment data or None if not found
    """
    doc_ref = db.collection('appointments').document(appointment_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return None
    
    doc_ref.update({'status': status})
    return get_appointment_by_id(appointment_id)


def appointment_to_dict(apt: dict):
    """Convert appointment data to dictionary for API responses."""
    return {
        'appointment_id': apt.get('appointment_id'),
        'customer_name': apt.get('customer_name'),
        'customer_email': apt.get('customer_email'),
        'customer_phone': apt.get('customer_phone'),
        'car_id': apt.get('car_id'),
        'car_model': apt.get('car_model'),
        'appointment_date': apt.get('appointment_date'),
        'appointment_time': apt.get('appointment_time'),
        'status': apt.get('status'),
        'created_at': datetime_to_iso(apt.get('created_at')),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# SAVED CAR (GARAGE) COLLECTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_customer_garage(customer_id: str):
    """
    Get all cars saved to a customer's garage.
    
    Args:
        customer_id: Customer's document ID
        
    Returns:
        list: List of saved car dictionaries with full car data
    """
    saved_ref = db.collection('saved_cars').where('customer_id', '==', customer_id)
    
    saved_cars = []
    for doc in saved_ref.stream():
        saved = doc.to_dict()
        saved['id'] = doc.id
        
        # Get full car data
        car = get_car_by_id(saved.get('car_id'))
        if car:
            saved['car'] = car_to_dict(car)
        
        saved_cars.append(saved)
    
    return saved_cars


def add_to_garage(customer_id: str, car_id: str):
    """
    Add a car to customer's garage.
    
    Args:
        customer_id: Customer's document ID
        car_id: Car's document ID
        
    Returns:
        dict: Saved car data, or existing record if already saved
    """
    # Check if already saved
    saved_ref = db.collection('saved_cars')
    query = saved_ref.where('customer_id', '==', customer_id).where('car_id', '==', car_id).limit(1)
    existing = list(query.stream())
    
    if existing:
        data = existing[0].to_dict()
        data['id'] = existing[0].id
        return data
    
    # Create new saved car
    saved_data = {
        'customer_id': customer_id,
        'car_id': car_id,
        'saved_at': datetime.now(timezone.utc),
    }
    
    doc_ref = db.collection('saved_cars').add(saved_data)
    saved_data['id'] = doc_ref[1].id
    
    # Get full car data
    car = get_car_by_id(car_id)
    if car:
        saved_data['car'] = car_to_dict(car)
    
    return saved_data


def remove_from_garage(customer_id: str, car_id: str):
    """
    Remove a car from customer's garage.
    
    Args:
        customer_id: Customer's document ID
        car_id: Car's document ID
        
    Returns:
        bool: True if removed, False if not found
    """
    saved_ref = db.collection('saved_cars')
    query = saved_ref.where('customer_id', '==', customer_id).where('car_id', '==', car_id).limit(1)
    docs = list(query.stream())
    
    if not docs:
        return False
    
    docs[0].reference.delete()
    return True


def saved_car_to_dict(saved: dict):
    """Convert saved car data to dictionary for API responses."""
    return {
        'id': saved.get('id'),
        'customer_id': saved.get('customer_id'),
        'car_id': saved.get('car_id'),
        'car': saved.get('car'),
        'saved_at': datetime_to_iso(saved.get('saved_at')),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_sold_cars():
    """
    Get all sold cars.
    
    Returns:
        list: List of sold car dictionaries
    """
    cars_ref = db.collection('cars').where('status', '==', 'sold')
    
    cars = []
    for doc in cars_ref.stream():
        car = doc.to_dict()
        car['car_id'] = doc.id
        cars.append(car)
    
    return cars


def get_analytics_summary():
    """
    Get summary analytics for the admin dashboard.
    
    Returns:
        dict: Analytics summary with revenue, counts, and averages
    """
    sold_cars = get_sold_cars()
    available_count = len([c for c in get_all_cars() if c.get('status') == 'available'])
    
    total_revenue = sum(car.get('sale_price', 0) or 0 for car in sold_cars)
    cars_sold = len(sold_cars)
    avg_sale_price = total_revenue / cars_sold if cars_sold > 0 else 0
    
    return {
        'total_revenue': total_revenue,
        'cars_sold': cars_sold,
        'average_sale_price': round(avg_sale_price, 2),
        'available_cars': available_count,
    }


def get_sales_by_model():
    """
    Get sales count grouped by car model.
    
    Returns:
        list: Array of {model, count} objects sorted by count descending
    """
    sold_cars = get_sold_cars()
    
    model_counts = {}
    for car in sold_cars:
        model_name = car.get('model', 'Unknown')
        model_counts[model_name] = model_counts.get(model_name, 0) + 1
    
    result = [{'model': model, 'count': count} for model, count in model_counts.items()]
    result.sort(key=lambda x: x['count'], reverse=True)
    
    return result


def get_revenue_over_time():
    """
    Get monthly revenue data.
    
    Returns:
        list: Array of {month, revenue} objects sorted by month
    """
    sold_cars = get_sold_cars()
    
    monthly_revenue = {}
    for car in sold_cars:
        sold_date = car.get('sold_date')
        if sold_date:
            # Handle both datetime objects and Firestore timestamps
            if hasattr(sold_date, 'strftime'):
                month_key = sold_date.strftime('%Y-%m')
            else:
                month_key = str(sold_date)[:7]  # Extract YYYY-MM from ISO string
            
            monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + (car.get('sale_price') or 0)
    
    result = [{'month': month, 'revenue': revenue} for month, revenue in monthly_revenue.items()]
    result.sort(key=lambda x: x['month'])
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# SETTINGS COLLECTION FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_setting(key: str, default=None):
    """
    Get a setting value by key.
    
    Args:
        key: Setting key
        default: Default value if not found
        
    Returns:
        Setting value or default
    """
    doc = db.collection('settings').document(key).get()
    if not doc.exists:
        return default
    
    return doc.to_dict().get('value', default)


def set_setting(key: str, value):
    """
    Set a setting value.
    
    Args:
        key: Setting key
        value: Setting value
    """
    db.collection('settings').document(key).set({'value': value})
