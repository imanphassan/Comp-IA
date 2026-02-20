# Database models for the EV Cars application
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Admin user model for authentication
class Admin(db.Model):
    __tablename__ = "admin"
    admin_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

# Car listing model
class Car(db.Model):
    __tablename__ = "car"
    car_id = db.Column(db.Integer, primary_key=True)
    model = db.Column(db.String(120), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    range_km = db.Column(db.Integer, nullable=False)
    charge_time_min = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.Text, nullable=False)

    # Convert model to dictionary for JSON response
    def to_dict(self):
        return {
            "car_id": self.car_id,
            "model": self.model,
            "year": self.year,
            "price": self.price,
            "range_km": self.range_km,
            "charge_time_min": self.charge_time_min,
            "description": self.description,
            "image_url": self.image_url,
        }
