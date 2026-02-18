from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, flash
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, Admin, Car
from chatbot import match_intent

def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = "change_this_in_production"
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///ev_site.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()
        seed_admin_if_missing()

    def login_required(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            if not session.get("admin_logged_in"):
                return redirect(url_for("admin_login"))
            return fn(*args, **kwargs)
        return wrapper

    def parse_int(value: str):
        try:
            return int(value)
        except Exception:
            return None

    def parse_float(value: str):
        try:
            return float(value)
        except Exception:
            return None

    def validate_car_form(form) -> dict:
        errors = {}

        model = form.get("model", "").strip()
        year = parse_int(form.get("year", "").strip())
        price = parse_float(form.get("price", "").strip())
        range_km = parse_int(form.get("range_km", "").strip())
        charge_time_min = parse_int(form.get("charge_time_min", "").strip())
        description = form.get("description", "").strip()
        image_url = form.get("image_url", "").strip()

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

    @app.get("/")
    def home():
        cars = Car.query.order_by(Car.price.asc()).limit(6).all()
        return render_template("home.html", cars=cars)

    @app.get("/listings")
    def listings():
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
        return render_template(
            "listings.html",
            cars=cars,
            budget=budget,
            min_range=min_range
        )

    @app.get("/car/<int:car_id>")
    def car_detail(car_id: int):
        car = Car.query.get_or_404(car_id)
        return render_template("detail.html", car=car)

    @app.get("/map")
    def map_page():
        return render_template("map.html")

    @app.get("/chatbot")
    def chatbot_page():
        return render_template("chatbot.html", reply=None, message="")

    @app.post("/chatbot")
    def chatbot_reply():
        message = request.form.get("message", "")
        _, reply = match_intent(message)
        return render_template("chatbot.html", reply=reply, message=message)

    @app.get("/admin/login")
    def admin_login():
        return render_template("admin_login.html")

    @app.post("/admin/login")
    def admin_login_post():
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        admin = Admin.query.filter_by(username=username).first()
        if not admin:
            flash("Invalid credentials.")
            return redirect(url_for("admin_login"))

        if not check_password_hash(admin.password_hash, password):
            flash("Invalid credentials.")
            return redirect(url_for("admin_login"))

        session["admin_logged_in"] = True
        return redirect(url_for("admin_dashboard"))

    @app.get("/admin/logout")
    def admin_logout():
        session.clear()
        return redirect(url_for("home"))

    @app.get("/admin")
    @login_required
    def admin_dashboard():
        cars = Car.query.order_by(Car.car_id.desc()).all()
        return render_template("admin_dashboard.html", cars=cars)

    @app.get("/admin/car/new")
    @login_required
    def admin_car_new():
        return render_template("car_form.html", car=None, errors={})

    @app.post("/admin/car/new")
    @login_required
    def admin_car_new_post():
        errors = validate_car_form(request.form)
        if errors:
            return render_template("car_form.html", car=None, errors=errors)

        car = Car(
            model=request.form["model"].strip(),
            year=int(request.form["year"].strip()),
            price=float(request.form["price"].strip()),
            range_km=int(request.form["range_km"].strip()),
            charge_time_min=int(request.form["charge_time_min"].strip()),
            description=request.form["description"].strip(),
            image_url=request.form["image_url"].strip(),
        )
        db.session.add(car)
        db.session.commit()
        return redirect(url_for("admin_dashboard"))

    @app.get("/admin/car/<int:car_id>/edit")
    @login_required
    def admin_car_edit(car_id: int):
        car = Car.query.get_or_404(car_id)
        return render_template("car_form.html", car=car, errors={})

    @app.post("/admin/car/<int:car_id>/edit")
    @login_required
    def admin_car_edit_post(car_id: int):
        car = Car.query.get_or_404(car_id)
        errors = validate_car_form(request.form)
        if errors:
            return render_template("car_form.html", car=car, errors=errors)

        car.model = request.form["model"].strip()
        car.year = int(request.form["year"].strip())
        car.price = float(request.form["price"].strip())
        car.range_km = int(request.form["range_km"].strip())
        car.charge_time_min = int(request.form["charge_time_min"].strip())
        car.description = request.form["description"].strip()
        car.image_url = request.form["image_url"].strip()

        db.session.commit()
        return redirect(url_for("admin_dashboard"))

    @app.post("/admin/car/<int:car_id>/delete")
    @login_required
    def admin_car_delete(car_id: int):
        car = Car.query.get_or_404(car_id)
        db.session.delete(car)
        db.session.commit()
        return redirect(url_for("admin_dashboard"))

    return app

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
    app.run(debug=False)
