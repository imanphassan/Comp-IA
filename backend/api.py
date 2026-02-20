# Flask REST API for EV Cars application
import os
import uuid
from functools import wraps
from datetime import datetime, timedelta, timezone
import jwt
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from models import db, Admin, Car
from chatbot import match_intent

# Allowed image file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Check if file extension is allowed
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# JWT configuration
JWT_SECRET = "change_this_in_production"
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 24


# Create and configure Flask app
def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = JWT_SECRET
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///ev_site.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # Configure upload folder for images
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max

    CORS(app, supports_credentials=True)
    db.init_app(app)

    # Create tables and seed admin user
    with app.app_context():
        db.create_all()
        seed_admin_if_missing()

    # Decorator to require valid JWT token
    def token_required(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return jsonify({"error": "Missing or invalid token"}), 401
            token = auth_header.split(" ", 1)[1]
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                request.admin_id = payload.get("admin_id")
            except jwt.ExpiredSignatureError:
                return jsonify({"error": "Token expired"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"error": "Invalid token"}), 401
            return fn(*args, **kwargs)
        return wrapper

    # Safe integer parsing
    def parse_int(value: str):
        try:
            return int(value)
        except Exception:
            return None

    # Safe float parsing
    def parse_float(value: str):
        try:
            return float(value)
        except Exception:
            return None

    # Validate car form data and return errors dict
    def validate_car_data(data: dict) -> dict:
        errors = {}
        model = (data.get("model") or "").strip()
        year = parse_int(str(data.get("year", "")))
        price = parse_float(str(data.get("price", "")))
        range_km = parse_int(str(data.get("range_km", "")))
        charge_time_min = parse_int(str(data.get("charge_time_min", "")))
        description = (data.get("description") or "").strip()
        image_url = (data.get("image_url") or "").strip()

        if not model:
            errors["model"] = "Model is required."
        if year is None or year < 1990 or year > 2035:
            errors["year"] = "Year must be a realistic number."
        if price is None or price <= 0:
            errors["price"] = "Price must be greater than 0."
        if range_km is None or range_km <= 0:
            errors["range_km"] = "Range must be greater than 0."
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
        data = request.get_json() or {}
        username = (data.get("username") or "").strip()
        password = (data.get("password") or "").strip()

        admin = Admin.query.filter_by(username=username).first()
        if not admin or not check_password_hash(admin.password_hash, password):
            return jsonify({"error": "Invalid credentials"}), 401

        exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS)
        token = jwt.encode(
            {"admin_id": admin.admin_id, "exp": exp},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM,
        )
        return jsonify({"token": token, "username": admin.username})

    @app.get("/api/auth/me")
    @token_required
    def api_me():
        admin = Admin.query.get(request.admin_id)
        if not admin:
            return jsonify({"error": "Admin not found"}), 404
        return jsonify({"admin_id": admin.admin_id, "username": admin.username})

    # ─────────────────────────────────────────────────────────────
    # CAR ENDPOINTS
    # ─────────────────────────────────────────────────────────────

    @app.get("/api/cars")
    def api_cars_list():
        budget = request.args.get("budget", "").strip()
        min_range = request.args.get("min_range", "").strip()

        q = Car.query
        budget_value = parse_float(budget) if budget else None
        min_range_value = parse_int(min_range) if min_range else None

        if budget_value is not None:
            q = q.filter(Car.price <= budget_value)
        if min_range_value is not None:
            q = q.filter(Car.range_km >= min_range_value)

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
        db.session.delete(car)
        db.session.commit()
        return jsonify({"message": "Car deleted"})

    # ─────────────────────────────────────────────────────────────
    # FILE UPLOAD ENDPOINT
    # ─────────────────────────────────────────────────────────────

    @app.post("/api/upload")
    @token_required
    def api_upload():
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed. Use: png, jpg, jpeg, gif, webp"}), 400
        
        ext = file.filename.rsplit('.', 1)[1].lower()
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        
        image_url = f"/api/uploads/{filename}"
        return jsonify({"image_url": image_url})

    @app.get("/api/uploads/<filename>")
    def api_serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    # ─────────────────────────────────────────────────────────────
    # CHATBOT ENDPOINT
    # ─────────────────────────────────────────────────────────────

    @app.post("/api/chatbot")
    def api_chatbot():
        data = request.get_json() or {}
        message = (data.get("message") or "").strip()
        intent, reply = match_intent(message)
        return jsonify({"intent": intent, "reply": reply})

    return app


# Create default admin user if none exists
def seed_admin_if_missing():
    existing = Admin.query.filter_by(username="admin").first()
    if existing:
        return
    admin = Admin(
        username="admin",
        password_hash=generate_password_hash("admin123")
    )
    db.session.add(admin)
    db.session.commit()


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5001)
