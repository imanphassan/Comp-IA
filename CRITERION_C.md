# Criterion C – Development

## Complexities Used in Developing the Website

1. [Connection to SQLite Database](#1-connection-to-sqlite-database)
2. [JWT Authentication System](#2-jwt-authentication-system)
3. [Password Hashing and Security](#3-password-hashing-and-security)
4. [Admin Login Page](#4-admin-login-page)
5. [Car Listings CRUD Operations](#5-car-listings-crud-operations)
6. [Image Upload System](#6-image-upload-system)
7. [Client-Side Filtering and Sorting](#7-client-side-filtering-and-sorting)
8. [EV Advisor Chatbot](#8-ev-advisor-chatbot)
9. [React Context for State Management](#9-react-context-for-state-management)
10. [Interactive Charging Station Map](#10-interactive-charging-station-map)
11. [Revenue & Analytics Dashboard](#11-revenue--analytics-dashboard)
12. [Customer Lead Management](#12-customer-lead-management)
13. [Appointment Scheduling System](#13-appointment-scheduling-system)
14. [My Garage (Saved Cars)](#14-my-garage-saved-cars)
15. [Customer Authentication System](#15-customer-authentication-system)

---

## 1. Connection to SQLite Database

The application uses SQLAlchemy ORM (Object-Relational Mapping) to interact with a SQLite database. This allows us to work with Python classes instead of raw SQL queries.

### Database Models (`backend/models.py`)

```python
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Admin(db.Model):
    __tablename__ = "admin"
    admin_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

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
```

| Component | Explanation |
|-----------|-------------|
| `db = SQLAlchemy()` | Initializes the ORM instance that will be connected to Flask |
| `__tablename__` | Explicitly sets the table name in the database |
| `db.Column()` | Defines a column with type, constraints (primary_key, unique, nullable) |
| `db.Integer`, `db.String`, `db.Text`, `db.Float` | SQLAlchemy data types mapping to SQLite types |

### Database Initialization (`backend/api.py`)

```python
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///ev_site.db"
db.init_app(app)

with app.app_context():
    db.create_all()
    seed_admin_if_missing()
```

| Line | Explanation |
|------|-------------|
| `SQLALCHEMY_DATABASE_URI` | Connection string pointing to SQLite file |
| `db.init_app(app)` | Connects SQLAlchemy to the Flask application |
| `app.app_context()` | Creates application context for database operations |
| `db.create_all()` | Creates all tables defined in models if they don't exist |

---

## 2. JWT Authentication System

JSON Web Tokens (JWT) provide stateless authentication. When a user logs in, they receive a token that proves their identity in subsequent requests.

### Token Generation (`backend/api.py`)

```python
JWT_SECRET = "change_this_in_production"
JWT_ALGORITHM = "HS256"
JWT_EXP_HOURS = 24

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
```

| Component | Explanation |
|-----------|-------------|
| `JWT_SECRET` | Secret key used to sign tokens (ensures tokens can't be forged) |
| `JWT_ALGORITHM` | HS256 uses HMAC with SHA-256 for signing |
| `jwt.encode()` | Creates a signed token containing admin_id and expiration |
| `exp` | Token expires after 24 hours for security |

### Token Verification Decorator

```python
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
```

| Step | Explanation |
|------|-------------|
| Extract header | Gets "Authorization: Bearer <token>" header |
| Validate format | Ensures header starts with "Bearer " |
| Decode token | `jwt.decode()` verifies signature and expiration |
| Attach admin_id | Makes user ID available to the protected route |
| Handle errors | Returns 401 for expired or invalid tokens |

---

## 3. Password Hashing and Security

Passwords are never stored in plain text. Werkzeug's password hashing uses PBKDF2 with SHA-256 and automatic salting.

### Password Hashing (`backend/api.py`)

```python
from werkzeug.security import generate_password_hash, check_password_hash

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
```

| Function | Explanation |
|----------|-------------|
| `generate_password_hash()` | Creates a salted hash of the password |
| `check_password_hash()` | Securely compares password against stored hash |
| Salting | Random salt prevents rainbow table attacks |
| PBKDF2 | Key derivation function makes brute-force attacks slow |

---

## 4. Admin Login Page

The frontend login page collects credentials and stores the JWT token for authenticated requests.

### Login Component (`frontend/src/pages/AdminLogin.jsx`)

```jsx
const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }
```

| Step | Explanation |
|------|-------------|
| `e.preventDefault()` | Prevents form from refreshing the page |
| `login(username, password)` | Calls AuthContext login function |
| `navigate('/admin')` | Redirects to dashboard on success |
| Error handling | Displays error message from API response |

### Auth Context Login (`frontend/src/context/AuthContext.jsx`)

```jsx
const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    localStorage.setItem('token', res.data.token)
    setUser({ username: res.data.username })
    return res.data
  }
```

| Line | Explanation |
|------|-------------|
| `api.post('/auth/login', ...)` | Sends credentials to backend |
| `localStorage.setItem('token', ...)` | Stores token for persistence across page refreshes |
| `setUser(...)` | Updates React state to trigger UI updates |

---

## 5. Car Listings CRUD Operations

The application implements full Create, Read, Update, Delete operations for car listings.

### Create Car (`backend/api.py`)

```python
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
```

| Component | Explanation |
|-----------|-------------|
| `@token_required` | Ensures only authenticated admins can create cars |
| `validate_car_data()` | Server-side validation returns error dictionary |
| `Car(...)` | Creates new model instance with form data |
| `db.session.add()` | Stages the new car for insertion |
| `db.session.commit()` | Executes the INSERT query |
| `car.to_dict()` | Converts model to JSON-serializable dictionary |

### Form Validation

```python
def validate_car_data(data: dict) -> dict:
    errors = {}
    model = (data.get("model") or "").strip()
    year = parse_int(str(data.get("year", "")))
    
    if not model:
        errors["model"] = "Model is required."
    if year is None or year < 1990 or year > 2035:
        errors["year"] = "Year must be a realistic number."
    # ... additional validations
    
    return errors
```

| Validation | Explanation |
|------------|-------------|
| Required fields | Checks that essential fields are not empty |
| Year range | Ensures year is realistic (1990-2035) |
| Positive numbers | Price, range, charge time must be > 0 |
| Return errors dict | Empty dict means validation passed |

---

## 6. Image Upload System

The application allows admins to upload car images directly instead of using external URLs.

### File Upload Endpoint (`backend/api.py`)

```python
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.post("/api/upload")
@token_required
def api_upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400
    
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)
    
    image_url = f"/api/uploads/{filename}"
    return jsonify({"image_url": image_url})
```

| Security Measure | Explanation |
|------------------|-------------|
| Extension whitelist | Only allows safe image formats |
| UUID filename | Prevents path traversal and filename collisions |
| `@token_required` | Only authenticated users can upload |
| `MAX_CONTENT_LENGTH` | Limits file size to 16MB |

### Frontend Upload (`frontend/src/pages/CarForm.jsx`)

```jsx
const uploadImage = async () => {
    if (!imageFile) return formData.image_url
    
    setUploading(true)
    try {
      const uploadData = new FormData()
      uploadData.append('file', imageFile)
      const res = await api.post('/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return res.data.image_url
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }
```

| Step | Explanation |
|------|-------------|
| `FormData()` | Creates multipart form data for file upload |
| `append('file', imageFile)` | Attaches the selected file |
| `multipart/form-data` | Required header for file uploads |
| Return `image_url` | Backend returns the path to access the uploaded image |

---

## 7. Client-Side Filtering and Sorting

The home page implements real-time filtering without additional API calls.

### Filter Implementation (`frontend/src/pages/Home.jsx`)

```jsx
useEffect(() => {
    let filtered = [...allCars]

    // SEARCH FILTER: Match model name (case-insensitive)
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(car => 
        car.model.toLowerCase().includes(searchLower)
      )
    }

    // BUDGET FILTER: Only show cars at or below budget
    if (budget) {
      filtered = filtered.filter(car => car.price <= parseFloat(budget))
    }

    // RANGE FILTER: Only show cars with at least this range
    if (minRange) {
      filtered = filtered.filter(car => car.range_km >= parseInt(minRange))
    }

    // SORTING
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price)
        break
      // ... more sort options
    }

    setCars(filtered)
  }, [allCars, search, budget, minRange, year, sortBy])
```

| Technique | Explanation |
|-----------|-------------|
| Spread operator `[...allCars]` | Creates a copy to avoid mutating original array |
| `filter()` | Returns new array with elements matching condition |
| `sort()` | Sorts array in place using comparison function |
| `useEffect` dependencies | Re-runs filter when any filter value changes |
| Case-insensitive search | `toLowerCase()` ensures "Tesla" matches "tesla" |

---

## 8. EV Advisor Chatbot

The chatbot uses keyword matching to identify user intent and return relevant responses.

### Intent Matching Algorithm (`backend/chatbot.py`)

```python
INTENTS = {
    "range": {
        "keywords": ["range", "km", "kilometre", "kilometer", "distance"],
        "responses": [
            "Range depends on battery size, driving style and temperature...",
        ],
    },
    "charging": {
        "keywords": ["charge", "charging", "charger", "fast", "dc", "ac"],
        "responses": [
            "Charging time depends on charger type and the car charging curve...",
        ],
    },
    # ... more intents
}

def normalise(text: str) -> str:
    return " ".join(text.lower().strip().split())

def match_intent(message: str) -> Tuple[str, str]:
    msg = normalise(message)
    for intent, data in INTENTS.items():
        for kw in data["keywords"]:
            if kw in msg:
                return intent, data["responses"][0]
    
    fallback = "I did not understand that. You can ask about range, charging, battery health."
    return "fallback", fallback
```

| Component | Explanation |
|-----------|-------------|
| `INTENTS` dictionary | Maps intent names to keywords and responses |
| `normalise()` | Converts to lowercase, removes extra whitespace |
| Keyword matching | Checks if any keyword appears in the message |
| First match wins | Returns immediately when a keyword is found |
| Fallback response | Guides user when no intent matches |

---

## 9. React Context for State Management

React Context provides global authentication state without prop drilling.

### Context Provider (`frontend/src/context/AuthContext.jsx`)

```jsx
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
```

| Concept | Explanation |
|---------|-------------|
| `createContext()` | Creates a context object for sharing state |
| `Provider` | Wraps app and provides values to all children |
| `useContext()` | Hook to access context values in any component |
| Token validation | On load, validates stored token with `/auth/me` |
| `loading` state | Prevents flash of unauthenticated content |

---

## 10. Interactive Charging Station Map

The map page displays EV charging stations using Leaflet.

### Map Implementation (`frontend/src/pages/Map.jsx`)

```jsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

const stations = [
  { id: 1, name: "DEWA Charging - Dubai Mall", lat: 25.1972, lng: 55.2796, type: "fast", power: "50 kW DC" },
  // ... more stations
]

const createIcon = (color) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function Map() {
  return (
    <MapContainer center={[25.2048, 55.2708]} zoom={11}>
      <TileLayer
        url="https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png"
      />
      {stations.map((station) => (
        <Marker
          key={station.id}
          position={[station.lat, station.lng]}
          icon={icons[station.type]}
        >
          <Popup>
            <strong>{station.name}</strong><br />
            Type: {typeLabels[station.type]}<br />
            Power: {station.power}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
```

| Component | Explanation |
|-----------|-------------|
| `MapContainer` | Main map wrapper with center coordinates and zoom |
| `TileLayer` | Loads map tiles from OpenStreetMap/Stadia |
| `Marker` | Places a marker at specified latitude/longitude |
| `Popup` | Shows information when marker is clicked |
| `L.divIcon()` | Creates custom colored circle markers |
| `stations.map()` | Iterates over data to create markers dynamically |

---

## 11. Revenue & Analytics Dashboard

This feature provides data-driven insights into sales performance, solving the problem of Mr. X having no visibility into which cars sell best or how revenue changes over time.

### Mark Car as Sold (`backend/api.py`)

```python
@app.post("/api/cars/<int:car_id>/sell")
@token_required
def api_car_sell(car_id: int):
    car = Car.query.get(car_id)
    if not car:
        return jsonify({"error": "Car not found"}), 404
    
    data = request.get_json() or {}
    sale_price = data.get("sale_price")
    
    # Update car with sale information
    car.status = "sold"
    car.sale_price = sale_price
    car.sold_date = datetime.now(timezone.utc)
    
    db.session.commit()
    return jsonify(car.to_dict())
```

### Sales Aggregation Algorithm

```python
@app.get("/api/analytics/sales-by-model")
@token_required
def api_analytics_sales_by_model():
    sold_cars = Car.query.filter_by(status="sold").all()
    
    # Aggregate sales by model using dictionary (map-reduce pattern)
    model_counts = {}
    for car in sold_cars:
        model_name = car.model
        model_counts[model_name] = model_counts.get(model_name, 0) + 1
    
    # Convert to array format for Chart.js
    result = [{"model": model, "count": count} for model, count in model_counts.items()]
    result.sort(key=lambda x: x["count"], reverse=True)
    
    return jsonify(result)
```

| Algorithmic Thinking | Explanation |
|---------------------|-------------|
| **Decomposition** | Dashboard split into summary metrics, bar chart, and line chart components |
| **Data Aggregation** | Map-reduce pattern: iterate through sold cars, sum prices, count by model |
| **Data Structures** | Dictionary for O(1) lookup when counting model occurrences |
| **Abstraction** | Chart.js library abstracts complex visualization logic |

---

## 12. Customer Lead Management

This feature captures potential customer interest, solving the problem of losing sales opportunities when customers aren't ready to visit immediately.

### Lead Model (`backend/models.py`)

```python
class Lead(db.Model):
    __tablename__ = "lead"
    lead_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=True)
    car_id = db.Column(db.Integer, db.ForeignKey('car.car_id'), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    car = db.relationship('Car', backref=db.backref('leads', lazy=True))
```

### Email Validation with Regex (`backend/api.py`)

```python
@app.post("/api/leads")
def api_lead_create():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    
    # Email validation using regular expression
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        errors["email"] = "Invalid email format"
    
    # Create and save lead
    lead = Lead(name=name, email=email, message=message, car_id=car_id)
    db.session.add(lead)
    db.session.commit()
    
    return jsonify(lead.to_dict()), 201
```

| Algorithmic Thinking | Explanation |
|---------------------|-------------|
| **Abstraction** | Lead class encapsulates customer information |
| **Data Structures** | New `leads` table with foreign key relationship to cars |
| **Pattern Matching** | Regular expression validates email format before storage |
| **Validation** | Server-side validation ensures data integrity |

---

## 13. Appointment Scheduling System

This feature allows customers to book test drives, solving the problem of informal scheduling that led to double-bookings and missed appointments.

### Time Slot Generation Algorithm (`backend/api.py`)

```python
@app.get("/api/appointments/available-slots")
def api_available_slots():
    date_str = request.args.get("date", "").strip()
    appointment_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    
    # Generate all possible time slots (9 AM to 5 PM)
    all_slots = []
    for hour in range(9, 17):  # 9:00 to 16:00
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
```

### Double-Booking Prevention

```python
@app.post("/api/appointments")
def api_appointment_create():
    # Check for double-booking before creating
    existing = Appointment.query.filter_by(
        appointment_date=appointment_date,
        appointment_time=appointment_time,
        status="scheduled"
    ).first()
    
    if existing:
        return jsonify({"error": "This time slot is already booked"}), 409
    
    # Create appointment only if slot is available
    appointment = Appointment(
        customer_name=customer_name,
        customer_email=customer_email,
        car_id=car_id,
        appointment_date=appointment_date,
        appointment_time=appointment_time,
    )
    db.session.add(appointment)
    db.session.commit()
```

| Algorithmic Thinking | Explanation |
|---------------------|-------------|
| **Time Slot Generation** | Loop through working hours (9-17), create DateTime objects |
| **Set Operations** | Use set for O(1) lookup when checking booked times |
| **Conflict Detection** | Query database before insert to prevent double-booking |
| **Data Structures** | `appointments` table stores booking details with date/time |

---

## 14. My Garage (Saved Cars)

This feature allows customers to save cars for later comparison, using localStorage instead of a database-backed cart since there are no user accounts.

### localStorage Session Management (`frontend/src/pages/CarDetail.jsx`)

```jsx
// Check if car is in garage on mount
useEffect(() => {
  const savedIds = JSON.parse(localStorage.getItem('myGarage') || '[]')
  setInGarage(savedIds.includes(parseInt(carId)))
}, [carId])

// Toggle car in/out of garage
const toggleGarage = () => {
  const savedIds = JSON.parse(localStorage.getItem('myGarage') || '[]')
  const carIdInt = parseInt(carId)
  
  if (inGarage) {
    // Remove from garage
    const updatedIds = savedIds.filter(id => id !== carIdInt)
    localStorage.setItem('myGarage', JSON.stringify(updatedIds))
    setInGarage(false)
  } else {
    // Add to garage
    savedIds.push(carIdInt)
    localStorage.setItem('myGarage', JSON.stringify(savedIds))
    setInGarage(true)
  }
}
```

### Retrieving Saved Cars (`frontend/src/pages/MyGarage.jsx`)

```jsx
useEffect(() => {
  const fetchSavedCars = async () => {
    // Get saved car IDs from localStorage
    const savedIds = JSON.parse(localStorage.getItem('myGarage') || '[]')
    
    if (savedIds.length === 0) {
      setCars([])
      return
    }

    // Fetch all cars and filter to only saved ones
    const res = await api.get('/cars')
    const allCars = res.data
    
    // Filter to only cars in the garage
    const savedCars = allCars.filter(car => savedIds.includes(car.car_id))
    setCars(savedCars)
  }

  fetchSavedCars()
}, [])
```

| Algorithmic Thinking | Explanation |
|---------------------|-------------|
| **Evaluation** | Chose localStorage over database cart - simpler for anonymous users |
| **Session Management** | Store array of car IDs in browser's localStorage |
| **Data Structures** | Array of integers stored as JSON string |
| **Persistence** | Data survives browser close/reopen without server storage |

---

## Technologies Summary

| Category | Technologies |
|----------|--------------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, Axios, Leaflet, Chart.js |
| **Backend** | Python 3, Flask, SQLAlchemy, SQLite, PyJWT |
| **Authentication** | JWT tokens, Werkzeug password hashing |
| **Development** | npm, pip, Git |

---

## Techniques Used

- **RESTful API Design** – Structured endpoints for CRUD operations
- **Token-based Authentication** – JWT for secure admin access
- **Client-side Filtering** – Real-time search without server requests
- **File Upload Handling** – Image uploads with validation and secure storage
- **Responsive Design** – Mobile-friendly layouts using Tailwind
- **Component-based Architecture** – Reusable React components
- **State Management** – React hooks (useState, useEffect, useContext)
- **Form Validation** – Both client-side and server-side validation
- **Data Aggregation** – Map-reduce pattern for analytics calculations
- **Regular Expressions** – Email validation pattern matching
- **Time Slot Algorithm** – Generate and filter available appointment times
- **localStorage Persistence** – Client-side data storage for saved cars
- **Dual Authentication System** – Separate JWT tokens for admin and customer roles

---

## 15. Customer Authentication System

This feature allows customers to create accounts and login, enabling personalized features like saving cars to their garage across devices. It separates customer and admin experiences with distinct routes and navigation.

### Customer Model (`backend/models.py`)

```python
class Customer(db.Model):
    __tablename__ = "customer"
    customer_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

class SavedCar(db.Model):
    __tablename__ = "saved_car"
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.customer_id'), nullable=False)
    car_id = db.Column(db.Integer, db.ForeignKey('car.car_id'), nullable=False)
    saved_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Relationships
    customer = db.relationship('Customer', backref=db.backref('saved_cars', lazy=True))
    car = db.relationship('Car', backref=db.backref('saved_by', lazy=True))
```

### Customer Registration with Duplicate Check (`backend/api.py`)

```python
@app.post("/api/customer/register")
def api_customer_register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    
    # Check for existing customer with same email
    existing = Customer.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "Email already registered"}), 409
    
    # Create customer with hashed password
    customer = Customer(
        name=name,
        email=email,
        password_hash=generate_password_hash(password),
        phone=phone
    )
    db.session.add(customer)
    db.session.commit()
    
    # Generate JWT token with customer type
    token = jwt.encode(
        {"customer_id": customer.customer_id, "type": "customer", "exp": exp},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
    return jsonify({"token": token, "customer": customer.to_dict()}), 201
```

### Dual Token System - Admin vs Customer

```python
def get_customer_from_token():
    """Helper to extract customer from JWT token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # Check token type to distinguish customer from admin
        if payload.get("type") != "customer":
            return None
        return Customer.query.get(payload["customer_id"])
    except:
        return None
```

### Customer Context Provider (`frontend/src/context/CustomerAuthContext.jsx`)

```jsx
export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check for existing token on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('customerToken')
    if (storedToken) {
      api.get('/customer/me', {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
        .then((res) => {
          setCustomer(res.data)
          setToken(storedToken)
        })
        .catch(() => {
          localStorage.removeItem('customerToken')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  // Login stores token in both localStorage and React state
  const login = async (email, password) => {
    const res = await api.post('/customer/login', { email, password })
    const newToken = res.data.token
    localStorage.setItem('customerToken', newToken)
    setToken(newToken)
    setCustomer(res.data.customer)
  }

  // isAuthenticated requires both customer AND token
  const isAuthenticated = !!customer && !!token

  return (
    <CustomerAuthContext.Provider value={{ 
      customer, isAuthenticated, loading, login, logout, register, getToken 
    }}>
      {children}
    </CustomerAuthContext.Provider>
  )
}
```

### Axios Interceptor for Dual Auth (`frontend/src/api.js`)

```jsx
api.interceptors.request.use((config) => {
  // Skip if Authorization header is already set (customer API calls)
  if (config.headers.Authorization) {
    return config
  }
  
  // Otherwise, attach admin token if available
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

| Algorithmic Thinking | Explanation |
|---------------------|-------------|
| **Dual Authentication** | Separate token types (`admin_id` vs `customer_id` + `type`) distinguish user roles |
| **Token Synchronization** | Store token in React state alongside localStorage to prevent race conditions |
| **Interceptor Pattern** | Axios interceptor auto-attaches admin token, but respects manually-set customer tokens |
| **Database Relationships** | SavedCar links customers to cars with foreign keys for data integrity |
