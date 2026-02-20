# EV Cars - Used Electric Vehicle Marketplace

A web application for browsing and managing used electric vehicle listings in the UAE, featuring an interactive charging station map and an EV advisor chatbot.

## Features

- **Browse Listings** – Search, filter, and sort electric vehicles by model, price, range, and year
- **Car Details** – View detailed information about each vehicle
- **Charging Station Map** – Interactive map showing EV charging stations across Dubai/UAE
- **EV Advisor Chatbot** – Get answers to common EV questions about range, charging, battery health, and pricing
- **Admin Dashboard** – Add, edit, and delete car listings (protected by authentication)
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

4. Run the backend server:
   ```bash
   python api.py
   ```

   The API will be available at `http://127.0.0.1:5001` (or whatever link is shown in the terminal)

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

   The app will be available at `http://localhost:3000` (or whatever link is shown in the terminal)

## Default Admin Credentials

- **Username:** `admin`
- **Password:** `admin123`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/cars` | List all cars (with optional filters) |
| GET | `/api/cars/:id` | Get car details |
| POST | `/api/cars` | Create car (auth required) |
| PUT | `/api/cars/:id` | Update car (auth required) |
| DELETE | `/api/cars/:id` | Delete car (auth required) |
| POST | `/api/upload` | Upload image (auth required) |
| POST | `/api/chatbot` | Send message to chatbot |

## License

This project was created for educational purposes.
