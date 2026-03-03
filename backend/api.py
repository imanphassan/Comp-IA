# ═══════════════════════════════════════════════════════════════════════════════
# Flask REST API for EV Cars Application
# ═══════════════════════════════════════════════════════════════════════════════
# This file contains the main backend API for the EV Cars marketplace.
# It handles:
#   - User authentication using JWT (JSON Web Tokens)
#   - CRUD operations for car listings
#   - Image file uploads for car photos
#   - Chatbot integration for EV-related questions
# ═══════════════════════════════════════════════════════════════════════════════

import os
import uuid
from functools import wraps
from datetime import datetime, timedelta, timezone

# PyJWT library for creating and verifying JSON Web Tokens
import jwt

# Flask framework imports for building the REST API
from flask import Flask, request, jsonify, send_from_directory

# CORS (Cross-Origin Resource Sharing) to allow frontend requests from different origins
from flask_cors import CORS

# Werkzeug utilities for secure password hashing
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# Regular expressions for email validation
import re

# SendGrid for sending emails
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail as SendGridMail, Email, To, Content

# Local imports - database models and chatbot logic
from models import db, Admin, Customer, Car, Lead, Appointment, SavedCar
from chatbot import match_intent

# ─────────────────────────────────────────────────────────────────────────────
# FILE UPLOAD CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
# Define allowed image file extensions for car photo uploads.
# This prevents users from uploading potentially dangerous file types.
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    """
    Check if the uploaded file has an allowed extension.
    
    This function performs two checks:
    1. Ensures the filename contains a dot (has an extension)
    2. Extracts the extension and checks if it's in the allowed list
    
    Args:
        filename: The name of the uploaded file
        
    Returns:
        bool: True if file extension is allowed, False otherwise
    """
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# ─────────────────────────────────────────────────────────────────────────────
# JWT (JSON Web Token) CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
# JWT is used for stateless authentication. When a user logs in, they receive
# a token that they include in subsequent requests to prove their identity.
#
# JWT_SECRET: The secret key used to sign tokens (should be environment variable in production)
# JWT_ALGORITHM: HS256 is a symmetric algorithm using HMAC with SHA-256
# JWT_EXP_HOURS: Tokens expire after 24 hours for security
JWT_SECRET = "change_this_in_production"
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 24


# ═══════════════════════════════════════════════════════════════════════════════
# APPLICATION FACTORY
# ═══════════════════════════════════════════════════════════════════════════════
def create_app() -> Flask:
    """
    Application factory function that creates and configures the Flask app.
    
    This pattern allows for:
    - Multiple app instances for testing
    - Delayed configuration
    - Clean separation of concerns
    
    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__)
    
    # ─────────────────────────────────────────────────────────────────────────
    # DATABASE CONFIGURATION
    # ─────────────────────────────────────────────────────────────────────────
    # SQLite is used as the database - a lightweight, file-based database
    # that doesn't require a separate server process.
    app.config["SECRET_KEY"] = JWT_SECRET
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///ev_site.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False  # Disable event system for performance
    
    # ─────────────────────────────────────────────────────────────────────────
    # FILE UPLOAD CONFIGURATION
    # ─────────────────────────────────────────────────────────────────────────
    # Create uploads directory if it doesn't exist.
    # os.path.dirname(__file__) gets the directory containing this script,
    # ensuring uploads are stored relative to the backend folder.
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # exist_ok=True prevents error if folder exists
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # Limit uploads to 16MB

    # ─────────────────────────────────────────────────────────────────────────
    # CORS AND DATABASE INITIALIZATION
    # ─────────────────────────────────────────────────────────────────────────
    # CORS allows the React frontend (running on a different port) to make
    # requests to this API. supports_credentials=True allows cookies/auth headers.
    CORS(app, supports_credentials=True)
    
    # Initialize SQLAlchemy with this Flask app instance
    db.init_app(app)

    # ─────────────────────────────────────────────────────────────────────────
    # DATABASE INITIALIZATION
    # ─────────────────────────────────────────────────────────────────────────
    # app.app_context() creates an application context, which is required
    # for database operations outside of a request.
    # db.create_all() creates all tables defined in models.py if they don't exist.
    # seed_admin_if_missing() creates a default admin user for initial access.
    with app.app_context():
        db.create_all()
        seed_admin_if_missing()

    # ─────────────────────────────────────────────────────────────────────────
    # EMAIL CONFIGURATION (SendGrid)
    # ─────────────────────────────────────────────────────────────────────────
    # To enable email sending:
    # 1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
    # 2. Create an API key with "Mail Send" permission
    # 3. Verify your sender email in Sender Authentication
    # 4. Replace the values below with your credentials
    SENDGRID_API_KEY = ""  # Your SendGrid API key (starts with SG.)
    SENDGRID_FROM_EMAIL = ""  # Your verified sender email
    
    def send_email(to_email, subject, body):
        """
        Send an email using SendGrid.
        Returns True if successful, False otherwise.
        """
        if not SENDGRID_API_KEY or not SENDGRID_FROM_EMAIL:
            print("[EMAIL] Skipping email - SendGrid not configured")
            return False
        
        try:
            message = SendGridMail(
                from_email=Email(SENDGRID_FROM_EMAIL),
                to_emails=To(to_email),
                subject=subject,
                plain_text_content=Content("text/plain", body)
            )
            
            sg = SendGridAPIClient(SENDGRID_API_KEY)
            response = sg.send(message)
            print(f"[EMAIL] Sent to {to_email} - Status: {response.status_code}")
            return response.status_code in [200, 201, 202]
        except Exception as e:
            print(f"[EMAIL] Failed to send email: {e}")
            return False

    def send_lead_confirmation_email(lead, car):
        """
        Send confirmation email to customer after submitting interest form.
        Silently fails if email is not configured.
        """
        subject = f"Thank you for your interest in {car.model}"
        body = f"""Dear {lead.name},

Thank you for expressing interest in the {car.year} {car.model}!

We have received your inquiry and our team will contact you shortly.

Car Details:
- Model: {car.model}
- Year: {car.year}
- Price: AED {car.price:,.0f}
- Range: {car.range_km} km

Your Message: {lead.message or 'No message provided'}

Best regards,
EV Cars Team
"""
        return send_email(lead.email, subject, body)

    def send_appointment_confirmation_email(appointment, car):
        """
        Send confirmation email to customer after booking a test drive.
        Silently fails if email is not configured.
        """
        subject = f"Test Drive Confirmed - {car.model}"
        body = f"""Dear {appointment.customer_name},

Your test drive has been confirmed!

Appointment Details:
- Car: {car.year} {car.model}
- Date: {appointment.appointment_date.strftime('%A, %B %d, %Y')}
- Time: {appointment.appointment_time.strftime('%I:%M %p')}

Please arrive 10 minutes before your scheduled time. Don't forget to bring your valid driver's license.

If you need to reschedule or cancel, please contact us.

Best regards,
EV Cars Team
"""
        return send_email(appointment.customer_email, subject, body)

    # ─────────────────────────────────────────────────────────────────────────
    # AUTHENTICATION DECORATOR
    # ─────────────────────────────────────────────────────────────────────────
    def token_required(fn):
        """
        Decorator that protects routes requiring authentication.
        
        This decorator:
        1. Extracts the JWT token from the Authorization header
        2. Verifies the token signature and expiration
        3. Attaches the admin_id to the request for use in the route
        
        Usage:
            @app.route('/protected')
            @token_required
            def protected_route():
                # request.admin_id is now available
                pass
        """
        @wraps(fn)  # Preserves the original function's metadata
        def wrapper(*args, **kwargs):
            # Extract Authorization header (format: "Bearer <token>")
            auth_header = request.headers.get("Authorization", "")
            
            # Validate header format
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid token"}), 401
            
            # Extract the token part (everything after "Bearer ")
            token = auth_header.split(" ", 1)[1]
            
            try:
                # Decode and verify the JWT token
                # This checks: signature validity, expiration, and algorithm
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                
                # Attach admin_id to request object for use in protected routes
                request.admin_id = payload.get("admin_id")
                
            except jwt.ExpiredSignatureError:
                # Token was valid but has expired
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                # Token is malformed or signature doesn't match
                return jsonify({"error": "Invalid token"}), 401
            
            # Token is valid - proceed to the protected route
            return fn(*args, **kwargs)
        return wrapper

    # ─────────────────────────────────────────────────────────────────────────
    # INPUT PARSING UTILITIES
    # ─────────────────────────────────────────────────────────────────────────
    def parse_int(value: str):
        """
        Safely parse a string to integer, returning None on failure.
        This prevents crashes when users enter invalid numeric data.
        """
        try:
            return int(value)
        except Exception:
            return None

    def parse_float(value: str):
        """
        Safely parse a string to float, returning None on failure.
        Used for price values which may contain decimals.
        """
        try:
            return float(value)
        except Exception:
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # FORM VALIDATION
    # ─────────────────────────────────────────────────────────────────────────
    def validate_car_data(data: dict) -> dict:
        """
        Validate car listing form data and return a dictionary of errors.
        
        This function performs server-side validation to ensure data integrity,
        even if client-side validation is bypassed. Each field is checked for:
        - Required fields: model, description, image_url
        - Numeric ranges: year (1990-2035), price/range/charge_time (> 0)
        
        Args:
            data: Dictionary containing form field values
            
        Returns:
            dict: Field names mapped to error messages (empty if valid)
        """
        errors = {}
        
        # Extract and sanitize all fields
        # .strip() removes leading/trailing whitespace
        # "or ''" handles None values
        model = (data.get("model") or "").strip()
        year = parse_int(str(data.get("year", "")))
        price = parse_float(str(data.get("price", "")))
        range_km = parse_int(str(data.get("range_km", "")))
        charge_time_min = parse_int(str(data.get("charge_time_min", "")))
        description = (data.get("description") or "").strip()
        image_url = (data.get("image_url") or "").strip()

        # Validate each field and collect errors
        if not model:
            errors["model"] = "Model is required."
        
        # Year must be realistic for used EVs (1990 onwards, not too far in future)
        if year is None or year < 1990 or year > 2035:
            errors["year"] = "Year must be a realistic number."
        
        # Price must be positive
        if price is None or price <= 0:
            errors["price"] = "Price must be greater than 0."
        
        # Range in kilometers must be positive
        if range_km is None or range_km <= 0:
            errors["range_km"] = "Range must be greater than 0."
        
        # Charging time in minutes must be positive
        if charge_time_min is None or charge_time_min <= 0:
            errors["charge_time_min"] = "Charging time must be greater than 0."
        
        if not description:
            errors["description"] = "Description is required."
        
        if not image_url:
            errors["image_url"] = "Image URL is required."
        
        return errors

    # ─────────────────────────────────────────────────────────────
    # AUTH ENDPOINTS
    # ─────────────────────────────────────────────────────────────

    @app.post("/api/auth/login")
    def api_login():
        """
        Authenticate admin user and return JWT token.
        
        Process:
        1. Extract username and password from JSON request body
        2. Query database for matching admin user
        3. Verify password using secure hash comparison
        4. Generate JWT token with admin_id and expiration
        5. Return token to client for use in subsequent requests
        
        Returns:
            JSON: {token: string, username: string} on success
            JSON: {error: string} with 401 status on failure
        """
        # Parse JSON request body (default to empty dict if no body)
        data = request.get_json() or {}
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()

        # Query database for admin with matching username
        admin = Admin.query.filter_by(username=username).first()
        
        # Check if admin exists AND password matches
        # check_password_hash securely compares the provided password
        # against the stored hash without exposing the actual password
        if not admin or not check_password_hash(admin.password_hash, password):
            return jsonify({"error": "Invalid credentials"}), 401

        # Generate JWT token with expiration time
        # The token contains the admin_id which identifies the user
        exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)
        token = jwt.encode(
            {"admin_id": admin.admin_id, "exp": exp},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM,
        )
        
        # Return token and username for client-side storage
        return jsonify({"token": token, "username": admin.username})

    @app.get("/api/auth/me")
    @token_required
    def api_me():
        """
        Get current authenticated admin's information.
        
        This endpoint is used by the frontend to:
        - Verify if a stored token is still valid
        - Retrieve the current user's details on page load
        
        The @token_required decorator ensures only authenticated
        users can access this endpoint and provides request.admin_id.
        """
        # Retrieve admin using the ID from the JWT token
        admin = Admin.query.get(request.admin_id)
        
        if not admin:
            return jsonify({"error": "Admin not found"}), 404
        
        return jsonify({"admin_id": admin.admin_id, "username": admin.username})

    # ═══════════════════════════════════════════════════════════════════════════
    # CUSTOMER AUTHENTICATION ENDPOINTS
    # ═══════════════════════════════════════════════════════════════════════════
    # Separate authentication system for customers (vs admins)
    # Customers can register, login, and access their personalized features

    @app.post("/api/customer/register")
    def api_customer_register():
        """
        Register a new customer account.
        
        Validates email format and uniqueness, then creates account
        with securely hashed password.
        
        Args (JSON body):
            name: Customer's display name
            email: Email address (used for login)
            password: Plain text password (will be hashed)
            phone: Optional phone number
            
        Returns:
            JSON: {token, customer} on success
        """
        data = request.get_json() or {}
        
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = (data.get("password") or "")
        phone = (data.get("phone") or "").strip()
        
        errors = {}
        
        if not name:
            errors["name"] = "Name is required"
        
        # Email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not email:
            errors["email"] = "Email is required"
        elif not re.match(email_pattern, email):
            errors["email"] = "Invalid email format"
        elif Customer.query.filter_by(email=email).first():
            errors["email"] = "Email already registered"
        
        if not password:
            errors["password"] = "Password is required"
        elif len(password) < 6:
            errors["password"] = "Password must be at least 6 characters"
        
        if errors:
            return jsonify({"errors": errors}), 400
        
        # Create customer with hashed password
        customer = Customer(
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            phone=phone if phone else None,
        )
        db.session.add(customer)
        db.session.commit()
        
        # Generate token for immediate login
        exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)
        token = jwt.encode(
            {"customer_id": customer.customer_id, "type": "customer", "exp": exp},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM,
        )
        
        return jsonify({"token": token, "customer": customer.to_dict()}), 201

    @app.post("/api/customer/login")
    def api_customer_login():
        """
        Authenticate customer and return JWT token.
        
        Args (JSON body):
            email: Customer's email
            password: Customer's password
            
        Returns:
            JSON: {token, customer} on success
        """
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        password = (data.get("password") or "")
        
        customer = Customer.query.filter_by(email=email).first()
        
        if not customer or not check_password_hash(customer.password_hash, password):
            return jsonify({"error": "Invalid email or password"}), 401
        
        # Generate JWT token
        exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)
        token = jwt.encode(
            {"customer_id": customer.customer_id, "type": "customer", "exp": exp},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM,
        )
        
        return jsonify({"token": token, "customer": customer.to_dict()})

    @app.get("/api/customer/me")
    def api_customer_me():
        """
        Get current authenticated customer's information.
        Verifies customer token and returns customer data.
        """
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "No token provided"}), 401
        
        token = auth_header.split(" ", 1)[1]
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") != "customer":
                return jsonify({"error": "Invalid token type"}), 401
            
            customer = Customer.query.get(payload["customer_id"])
            if not customer:
                return jsonify({"error": "Customer not found"}), 404
            
            return jsonify({"customer": customer.to_dict()})
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

    # ─────────────────────────────────────────────────────────────
    # CUSTOMER GARAGE ENDPOINTS (Saved Cars)
    # ─────────────────────────────────────────────────────────────

    def get_customer_from_token():
        """Helper to extract customer from JWT token."""
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("type") != "customer":
                return None
            return Customer.query.get(payload["customer_id"])
        except:
            return None

    @app.get("/api/customer/garage")
    def api_customer_garage():
        """
        Get all cars saved to customer's garage.
        """
        customer = get_customer_from_token()
        if not customer:
            return jsonify({"error": "Authentication required"}), 401
        
        saved = SavedCar.query.filter_by(customer_id=customer.customer_id).all()
        return jsonify([s.to_dict() for s in saved])

    @app.post("/api/customer/garage/<int:car_id>")
    def api_customer_garage_add(car_id: int):
        """
        Add a car to customer's garage.
        """
        customer = get_customer_from_token()
        if not customer:
            return jsonify({"error": "Authentication required"}), 401
        
        car = Car.query.get(car_id)
        if not car:
            return jsonify({"error": "Car not found"}), 404
        
        # Check if already saved
        existing = SavedCar.query.filter_by(
            customer_id=customer.customer_id,
            car_id=car_id
        ).first()
        
        if existing:
            return jsonify({"message": "Car already in garage"}), 200
        
        saved = SavedCar(customer_id=customer.customer_id, car_id=car_id)
        db.session.add(saved)
        db.session.commit()
        
        return jsonify(saved.to_dict()), 201

    @app.delete("/api/customer/garage/<int:car_id>")
    def api_customer_garage_remove(car_id: int):
        """
        Remove a car from customer's garage.
        """
        customer = get_customer_from_token()
        if not customer:
            return jsonify({"error": "Authentication required"}), 401
        
        saved = SavedCar.query.filter_by(
            customer_id=customer.customer_id,
            car_id=car_id
        ).first()
        
        if not saved:
            return jsonify({"error": "Car not in garage"}), 404
        
        db.session.delete(saved)
        db.session.commit()
        
        return jsonify({"message": "Car removed from garage"})

    # ─────────────────────────────────────────────────────────────
    # CAR ENDPOINTS
    # ─────────────────────────────────────────────────────────────

    @app.get("/api/cars")
    def api_cars_list():
        """
        List all cars with optional filtering.
        
        Query Parameters:
            budget: Maximum price filter (optional)
            min_range: Minimum range in km filter (optional)
        
        The filtering is done server-side using SQLAlchemy query building.
        Results are always sorted by price ascending (cheapest first).
        
        Returns:
            JSON: Array of car objects
        """
        # Extract optional filter parameters from query string
        budget = request.args.get("budget", "").strip()
        min_range = request.args.get("min_range", "").strip()

        # Start building the query
        q = Car.query
        
        # Parse filter values (returns None if invalid/empty)
        budget_value = parse_float(budget) if budget else None
        min_range_value = parse_int(min_range) if min_range else None

        # Apply filters conditionally
        # Only add filter if a valid value was provided
        if budget_value is not None:
            q = q.filter(Car.price <= budget_value)
        if min_range_value is not None:
            q = q.filter(Car.range_km >= min_range_value)

        # Execute query with sorting and convert to list of dictionaries
        cars = q.order_by(Car.price.asc()).all()
        return jsonify([c.to_dict() for c in cars])

    @app.get("/api/cars/featured")
    def api_cars_featured():
        cars = Car.query.order_by(Car.price.asc()).limit(6).all()
        return jsonify([c.to_dict() for c in cars])

    @app.get("/api/cars/<int:car_id>")
    def api_car_detail(car_id: int):
        car = Car.query.get(car_id)
        if not car:
            return jsonify({"error": "Car not found"}), 404
        return jsonify(car.to_dict())

    @app.post("/api/cars")
    @token_required
    def api_car_create():
        data = request.get_json() or {}
        errors = validate_car_data(data)
        if errors:
            return jsonify({"errors": errors}), 400

        car = Car(
            model=data["model"].strip(),
            year=int(data["year"]),
            price=float(data["price"]),
            range_km=int(data["range_km"]),
            charge_time_min=int(data["charge_time_min"]),
            description=data["description"].strip(),
            image_url=data["image_url"].strip(),
        )
        db.session.add(car)
        db.session.commit()
        return jsonify(car.to_dict()), 201

    @app.put("/api/cars/<int:car_id>")
    @token_required
    def api_car_update(car_id: int):
        car = Car.query.get(car_id)
        if not car:
            return jsonify({"error": "Car not found"}), 404

        data = request.get_json() or {}
        errors = validate_car_data(data)
        if errors:
            return jsonify({"errors": errors}), 400

        car.model = data["model"].strip()
        car.year = int(data["year"])
        car.price = float(data["price"])
        car.range_km = int(data["range_km"])
        car.charge_time_min = int(data["charge_time_min"])
        car.description = data["description"].strip()
        car.image_url = data["image_url"].strip()

        db.session.commit()
        return jsonify(car.to_dict())

    @app.delete("/api/cars/<int:car_id>")
    @token_required
    def api_car_delete(car_id: int):
        car = Car.query.get(car_id)
        if not car:
            return jsonify({"error": "Car not found"}), 404
        
        # Delete related records first to avoid foreign key constraint errors
        # Use synchronize_session=False for bulk deletes
        Lead.query.filter_by(car_id=car_id).delete(synchronize_session=False)
        Appointment.query.filter_by(car_id=car_id).delete(synchronize_session=False)
        SavedCar.query.filter_by(car_id=car_id).delete(synchronize_session=False)
        db.session.commit()
        
        # Now delete the car
        db.session.delete(car)
        db.session.commit()
        return jsonify({"message": "Car deleted"})

    # ─────────────────────────────────────────────────────────────
    # FILE UPLOAD ENDPOINT
    # ─────────────────────────────────────────────────────────────

    @app.post("/api/upload")
    @token_required
    def api_upload():
        """
        Handle image file uploads for car listings.
        
        Process:
        1. Validate that a file was included in the request
        2. Check that the file has an allowed extension
        3. Generate a unique filename using UUID to prevent collisions
        4. Save the file to the uploads directory
        5. Return the URL path for accessing the uploaded image
        
        Security measures:
        - @token_required ensures only authenticated admins can upload
        - File extension whitelist prevents malicious file uploads
        - UUID filenames prevent path traversal and overwrites
        - MAX_CONTENT_LENGTH limits file size to 16MB
        
        Returns:
            JSON: {image_url: string} - Path to access the uploaded image
        """
        # Check if file was included in the request
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        
        # Check if a file was actually selected (empty filename = no selection)
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file extension against whitelist
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed. Use: png, jpg, jpeg, gif, webp"}), 400
        
        # Generate unique filename:
        # - Extract original extension
        # - Create UUID-based name to prevent collisions and path traversal
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        
        # Save file to uploads directory
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        
        # Return the URL path (not full filesystem path) for the frontend
        image_url = f"/api/uploads/{filename}"
        return jsonify({"image_url": image_url})

    @app.get("/api/uploads/<filename>")
    def api_serve_upload(filename):
        """
        Serve uploaded images from the uploads directory.
        
        send_from_directory is used instead of send_file for security:
        it prevents path traversal attacks by validating the filename.
        """
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # ─────────────────────────────────────────────────────────────
    # CHATBOT ENDPOINT
    # ─────────────────────────────────────────────────────────────

    @app.post("/api/chatbot")
    def api_chatbot():
        """
        Process user message and return chatbot response.
        
        The chatbot uses keyword matching to identify user intent
        and returns pre-defined responses about EV topics:
        - Range and distance
        - Charging times and types
        - Battery health and degradation
        - Pricing and budgets
        
        Args (JSON body):
            message: User's question or message
            
        Returns:
            JSON: {intent: string, reply: string}
        """
        data = request.get_json() or {}
        message = (data.get("message") or "").strip()
        
        # match_intent analyzes the message and returns the detected
        # intent category along with an appropriate response
        intent, reply = match_intent(message)
        
        return jsonify({"intent": intent, "reply": reply})

    # ═══════════════════════════════════════════════════════════════════════════
    # FEATURE 1: REVENUE & ANALYTICS ENDPOINTS
    # ═══════════════════════════════════════════════════════════════════════════

    @app.post("/api/cars/<int:car_id>/sell")
    @token_required
    def api_car_sell(car_id: int):
        """
        Mark a car as sold and record the sale price.
        
        This endpoint updates the car's status to 'sold', records the final
        sale price (which may differ from listing price), and timestamps the sale.
        
        Args (JSON body):
            sale_price: Final sale price in AED
            
        Returns:
            JSON: Updated car object
        """
        car = Car.query.get(car_id)
        if not car:
            return jsonify({"error": "Car not found"}), 404
        
        data = request.get_json() or {}
        sale_price = data.get("sale_price")
        
        if sale_price is None:
            return jsonify({"error": "Sale price is required"}), 400
        
        try:
            sale_price = float(sale_price)
            if sale_price <= 0:
                return jsonify({"error": "Sale price must be greater than 0"}), 400
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid sale price"}), 400
        
        # Update car with sale information
        car.status = "sold"
        car.sale_price = sale_price
        car.sold_date = datetime.now(timezone.utc)
        
        db.session.commit()
        return jsonify(car.to_dict())

    @app.get("/api/analytics/summary")
    @token_required
    def api_analytics_summary():
        """
        Get summary analytics for the admin dashboard.
        
        Aggregates sales data to provide:
        - Total revenue from all sold cars
        - Number of cars sold
        - Average sale price
        - Number of available cars
        
        Returns:
            JSON: Analytics summary object
        """
        # Query all sold cars
        sold_cars = Car.query.filter_by(status="sold").all()
        available_cars = Car.query.filter_by(status="available").count()
        
        # Calculate aggregates
        total_revenue = sum(car.sale_price or 0 for car in sold_cars)
        cars_sold = len(sold_cars)
        avg_sale_price = total_revenue / cars_sold if cars_sold > 0 else 0
        
        return jsonify({
            "total_revenue": total_revenue,
            "cars_sold": cars_sold,
            "average_sale_price": round(avg_sale_price, 2),
            "available_cars": available_cars,
        })

    @app.get("/api/analytics/sales-by-model")
    @token_required
    def api_analytics_sales_by_model():
        """
        Get sales count grouped by car model for bar chart visualization.
        
        Uses a dictionary to count occurrences of each model name,
        demonstrating map-reduce style aggregation.
        
        Returns:
            JSON: Array of {model, count} objects
        """
        sold_cars = Car.query.filter_by(status="sold").all()
        
        # Aggregate sales by model using dictionary
        model_counts = {}
        for car in sold_cars:
            # Extract base model name (e.g., "Tesla Model 3" from "Tesla Model 3 Long Range")
            model_name = car.model
            model_counts[model_name] = model_counts.get(model_name, 0) + 1
        
        # Convert to array format for Chart.js
        result = [{"model": model, "count": count} for model, count in model_counts.items()]
        result.sort(key=lambda x: x["count"], reverse=True)
        
        return jsonify(result)

    @app.get("/api/analytics/revenue-over-time")
    @token_required
    def api_analytics_revenue_over_time():
        """
        Get monthly revenue data for line chart visualization.
        
        Groups sold cars by month and sums their sale prices.
        
        Returns:
            JSON: Array of {month, revenue} objects
        """
        sold_cars = Car.query.filter_by(status="sold").filter(Car.sold_date.isnot(None)).all()
        
        # Aggregate revenue by month
        monthly_revenue = {}
        for car in sold_cars:
            # Format: "2024-01" for January 2024
            month_key = car.sold_date.strftime("%Y-%m")
            monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + (car.sale_price or 0)
        
        # Convert to sorted array
        result = [{"month": month, "revenue": revenue} for month, revenue in monthly_revenue.items()]
        result.sort(key=lambda x: x["month"])
        
        return jsonify(result)

    # ═══════════════════════════════════════════════════════════════════════════
    # FEATURE 2: LEAD MANAGEMENT ENDPOINTS
    # ═══════════════════════════════════════════════════════════════════════════

    @app.post("/api/leads")
    def api_lead_create():
        """
        Create a new lead (customer interest submission).
        
        This is a public endpoint - no authentication required.
        Validates email format using regex before storing.
        
        Args (JSON body):
            name: Customer's name
            email: Customer's email (validated)
            message: Optional message
            car_id: ID of the car they're interested in
            
        Returns:
            JSON: Created lead object
        """
        data = request.get_json() or {}
        
        # Extract and validate fields
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip()
        message = (data.get("message") or "").strip()
        car_id = data.get("car_id")
        
        errors = {}
        
        if not name:
            errors["name"] = "Name is required"
        
        # Email validation using regex
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not email:
            errors["email"] = "Email is required"
        elif not re.match(email_pattern, email):
            errors["email"] = "Invalid email format"
        
        if not car_id:
            errors["car_id"] = "Car ID is required"
        else:
            car = Car.query.get(car_id)
            if not car:
                errors["car_id"] = "Car not found"
        
        if errors:
            return jsonify({"errors": errors}), 400
        
        # Create and save lead
        lead = Lead(
            name=name,
            email=email,
            message=message if message else None,
            car_id=car_id,
        )
        db.session.add(lead)
        db.session.commit()
        
        # Send confirmation email (non-blocking - doesn't fail if email fails)
        send_lead_confirmation_email(lead, car)
        
        return jsonify(lead.to_dict()), 201

    @app.get("/api/leads")
    @token_required
    def api_leads_list():
        """
        Get all leads for admin dashboard.
        
        Returns leads sorted by creation date (newest first).
        
        Returns:
            JSON: Array of lead objects
        """
        leads = Lead.query.order_by(Lead.created_at.desc()).all()
        return jsonify([lead.to_dict() for lead in leads])

    @app.delete("/api/leads/<int:lead_id>")
    @token_required
    def api_lead_delete(lead_id: int):
        """
        Delete a lead (after follow-up is complete).
        
        Returns:
            JSON: Success message
        """
        lead = Lead.query.get(lead_id)
        if not lead:
            return jsonify({"error": "Lead not found"}), 404
        
        db.session.delete(lead)
        db.session.commit()
        return jsonify({"message": "Lead deleted"})

    # ═══════════════════════════════════════════════════════════════════════════
    # FEATURE 3: APPOINTMENT SCHEDULING ENDPOINTS
    # ═══════════════════════════════════════════════════════════════════════════

    @app.get("/api/appointments/available-slots")
    def api_available_slots():
        """
        Get available time slots for a given date.
        
        Generates 1-hour slots from 9 AM to 5 PM, excluding already booked slots.
        This algorithm iterates through working hours and checks against
        existing appointments to prevent double-booking.
        
        Query params:
            date: Date in YYYY-MM-DD format
            
        Returns:
            JSON: Array of available time strings (e.g., ["09:00", "10:00", ...])
        """
        date_str = request.args.get("date", "").strip()
        
        if not date_str:
            return jsonify({"error": "Date is required"}), 400
        
        try:
            from datetime import date as date_type
            appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        # Generate all possible time slots (9 AM to 5 PM)
        all_slots = []
        for hour in range(9, 17):  # 9:00 to 16:00 (last slot starts at 4 PM)
            all_slots.append(f"{hour:02d}:00")
        
        # Get booked slots for this date
        booked_appointments = Appointment.query.filter_by(
            appointment_date=appointment_date,
            status="scheduled"
        ).all()
        
        booked_times = set()
        for apt in booked_appointments:
            booked_times.add(apt.appointment_time.strftime("%H:%M"))
        
        # Filter out booked slots
        available_slots = [slot for slot in all_slots if slot not in booked_times]
        
        return jsonify(available_slots)

    @app.post("/api/appointments")
    def api_appointment_create():
        """
        Create a new appointment (test drive booking).
        
        Validates that the selected time slot is available to prevent
        double-booking. This is a public endpoint.
        
        Args (JSON body):
            customer_name: Customer's name
            customer_email: Customer's email
            customer_phone: Optional phone number
            car_id: ID of the car for test drive
            date: Appointment date (YYYY-MM-DD)
            time: Appointment time (HH:MM)
            
        Returns:
            JSON: Created appointment object
        """
        data = request.get_json() or {}
        
        # Extract fields
        customer_name = (data.get("customer_name") or "").strip()
        customer_email = (data.get("customer_email") or "").strip()
        customer_phone = (data.get("customer_phone") or "").strip()
        car_id = data.get("car_id")
        date_str = (data.get("date") or "").strip()
        time_str = (data.get("time") or "").strip()
        
        errors = {}
        
        if not customer_name:
            errors["customer_name"] = "Name is required"
        
        # Email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not customer_email:
            errors["customer_email"] = "Email is required"
        elif not re.match(email_pattern, customer_email):
            errors["customer_email"] = "Invalid email format"
        
        if not car_id:
            errors["car_id"] = "Car ID is required"
        else:
            car = Car.query.get(car_id)
            if not car:
                errors["car_id"] = "Car not found"
        
        # Parse and validate date
        appointment_date = None
        if not date_str:
            errors["date"] = "Date is required"
        else:
            try:
                appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                errors["date"] = "Invalid date format. Use YYYY-MM-DD"
        
        # Parse and validate time
        appointment_time = None
        if not time_str:
            errors["time"] = "Time is required"
        else:
            try:
                appointment_time = datetime.strptime(time_str, "%H:%M").time()
            except ValueError:
                errors["time"] = "Invalid time format. Use HH:MM"
        
        if errors:
            return jsonify({"errors": errors}), 400
        
        # Check for double-booking
        existing = Appointment.query.filter_by(
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            status="scheduled"
        ).first()
        
        if existing:
            return jsonify({"error": "This time slot is already booked"}), 409
        
        # Create appointment
        appointment = Appointment(
            customer_name=customer_name,
            customer_email=customer_email,
            customer_phone=customer_phone if customer_phone else None,
            car_id=car_id,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
        )
        db.session.add(appointment)
        db.session.commit()
        
        # Send confirmation email (non-blocking - doesn't fail if email fails)
        car = Car.query.get(car_id)
        send_appointment_confirmation_email(appointment, car)
        
        return jsonify(appointment.to_dict()), 201

    @app.get("/api/appointments")
    @token_required
    def api_appointments_list():
        """
        Get all appointments for admin dashboard.
        
        Returns appointments sorted by date and time (upcoming first).
        
        Returns:
            JSON: Array of appointment objects
        """
        appointments = Appointment.query.order_by(
            Appointment.appointment_date.asc(),
            Appointment.appointment_time.asc()
        ).all()
        return jsonify([apt.to_dict() for apt in appointments])

    @app.put("/api/appointments/<int:appointment_id>/status")
    @token_required
    def api_appointment_update_status(appointment_id: int):
        """
        Update appointment status (complete or cancel).
        
        Args (JSON body):
            status: New status ('completed' or 'cancelled')
            
        Returns:
            JSON: Updated appointment object
        """
        appointment = Appointment.query.get(appointment_id)
        if not appointment:
            return jsonify({"error": "Appointment not found"}), 404
        
        data = request.get_json() or {}
        new_status = data.get("status", "").strip()
        
        if new_status not in ["scheduled", "completed", "cancelled"]:
            return jsonify({"error": "Invalid status"}), 400
        
        appointment.status = new_status
        db.session.commit()
        
        return jsonify(appointment.to_dict())

    return app


# ═══════════════════════════════════════════════════════════════════════════════
# DATABASE SEEDING
# ═══════════════════════════════════════════════════════════════════════════════
def seed_admin_if_missing():
    """
    Create a default admin user if none exists in the database.
    
    This function is called during app initialization to ensure
    there's always an admin account available for initial access.
    
    Default credentials:
        Username: admin
        Password: admin123
    
    The password is hashed using Werkzeug's generate_password_hash,
    which uses PBKDF2 with SHA-256 by default - a secure hashing algorithm
    that includes salting to prevent rainbow table attacks.
    """
    # Check if admin already exists to avoid duplicates
    existing = Admin.query.filter_by(username="admin").first()
    if existing:
        return
    
    # Create new admin with hashed password
    admin = Admin(
        username="admin",
        password_hash=generate_password_hash("admin123")
    )
    
    # Add to session and commit to database
    db.session.add(admin)
    db.session.commit()


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
