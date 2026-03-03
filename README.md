# EV Cars - Used Electric Vehicle Marketplace

A web application for browsing and managing used electric vehicle listings in the UAE, featuring an interactive charging station map and an EV advisor chatbot.

## Features

### Customer Features
- **Browse Listings** – Search, filter, and sort electric vehicles by model, price, range, and year
- **Car Details** – View detailed information about each vehicle
- **My Garage** – Save cars for later (syncs across devices when logged in)
- **Show Interest** – Submit interest forms for cars you like
- **Book Test Drives** – Schedule appointments with available time slots
- **Charging Station Map** – Interactive map showing EV charging stations across Dubai/UAE
- **EV Advisor Chatbot** – Get answers to common EV questions about range, charging, battery health, and pricing

### Admin Features
- **Admin Dashboard** – Add, edit, and delete car listings (protected by authentication)
- **Mark Cars as Sold** – Track sales with final sale price
- **Revenue Analytics** – View sales charts and revenue over time
- **Lead Management** – View and manage customer interest submissions
- **Appointment Management** – View and manage scheduled test drives
- **Image Upload** – Upload car images directly instead of using URLs

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Leaflet
- **Backend:** Python, Flask, SQLAlchemy, SQLite
- **Authentication:** JWT (JSON Web Tokens)

## Project Structure

```
Comp-IA/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/ # Reusable components (Navbar)
│   │   ├── context/    # Auth context
│   │   ├── pages/      # Page components
│   │   └── api.js      # API client
│   └── package.json
├── backend/            # Flask API backend
│   ├── api.py          # Main API routes
│   ├── models.py       # Database models
│   ├── chatbot.py      # Chatbot logic
│   └── uploads/        # Uploaded images
└── README.md
```

## Running Locally

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. **(First time or after model changes)** Delete the old database to apply schema changes:
   ```bash
   rm instance/ev_site.db
   ```
   > **Note:** This will delete all existing data. The database will be recreated automatically when you start the server.

5. **(Optional)** Configure email for confirmation emails:
   ```bash
   export MAIL_USERNAME="your-email@gmail.com"
   export MAIL_PASSWORD="your-app-password"
   ```
   > **Note:** For Gmail, enable 2FA and create an App Password at https://myaccount.google.com/apppasswords. The system works without email configured - it just won't send confirmations.

6. Run the backend server:
   ```bash
   python api.py
   ```

   The API will be available at `http://127.0.0.1:5001`
   (or whatever link is shown in the terminal)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`
   (or whatever link is shown in the terminal)

## Default Credentials

### Admin
- **Username:** `admin`
- **Password:** `admin123`
- **Access:** Navigate to `/admin/login` or click "Admin Login" on the customer login page

### Customer
Customers can register their own accounts via the Register page (`/register`).

## Accessing the Admin Panel

1. Go to `http://localhost:3000/admin/login`
2. Enter the default credentials:
   - Username: `admin`
   - Password: `admin123`
3. You will be redirected to the Admin Dashboard where you can:
   - View and manage car listings
   - Add new cars
   - Mark cars as sold
   - Access Analytics, Leads, and Appointments pages

> **Note:** Admin and customer experiences are completely separate. Admins cannot access customer features (browsing, garage, etc.) and customers cannot access admin features.

## API Endpoints

### Admin Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/me` | Get current admin |
| GET | `/api/cars` | List all cars (with optional filters) |
| POST | `/api/cars` | Create car (admin auth) |
| PUT | `/api/cars/:id` | Update car (admin auth) |
| DELETE | `/api/cars/:id` | Delete car (admin auth) |
| POST | `/api/cars/:id/sell` | Mark car as sold (admin auth) |
| POST | `/api/upload` | Upload image (admin auth) |
| GET | `/api/analytics/summary` | Get sales summary (admin auth) |
| GET | `/api/analytics/sales-by-model` | Get sales by model (admin auth) |
| GET | `/api/analytics/revenue-over-time` | Get revenue trends (admin auth) |
| GET | `/api/leads` | List all leads (admin auth) |
| DELETE | `/api/leads/:id` | Delete lead (admin auth) |
| GET | `/api/appointments` | List all appointments (admin auth) |
| PUT | `/api/appointments/:id/status` | Update appointment status (admin auth) |

### Customer Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/customer/register` | Register new customer |
| POST | `/api/customer/login` | Customer login |
| GET | `/api/customer/me` | Get current customer |
| GET | `/api/customer/garage` | Get saved cars (customer auth) |
| POST | `/api/customer/garage/:car_id` | Save car to garage (customer auth) |
| DELETE | `/api/customer/garage/:car_id` | Remove car from garage (customer auth) |

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cars` | List all cars |
| GET | `/api/cars/:id` | Get car details |
| POST | `/api/leads` | Submit interest form |
| GET | `/api/appointments/available-slots` | Get available time slots |
| POST | `/api/appointments` | Book appointment |
| POST | `/api/chatbot` | Send message to chatbot |

## License

This project was created for educational purposes.
