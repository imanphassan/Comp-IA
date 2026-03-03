# SQLite Database Query Guide

This guide explains how to query the SQLite database used in this EV Cars application.

## Database Location

The database file is `ev_cars.db` located in the `backend/` directory.

## Connecting to the Database

### Using Command Line (sqlite3)

Run the following command to go to the database directory:
```bash
cd backend/instance
```

Run the following command to open the database:
```bash
sqlite3 ev_site.db
```

### Common SQLite Commands

| Command | Description |
|---------|-------------|
| `.tables` | List all tables |
| `.schema <table>` | Show table structure |
| `.headers on` | Display column headers |
| `.mode column` | Format output in columns |
| `.quit` | Exit sqlite3 |

## Database Tables

| Table | Description |
|-------|-------------|
| `admin` | Administrator accounts |
| `customer` | Customer accounts |
| `car` | Electric vehicle listings |
| `lead` | Customer interest inquiries |
| `appointment` | Test drive appointments |
| `saved_car` | Customer's saved/garage cars |
| `setting` | Application settings (key-value) |

## Example Queries

### View All Cars

```sql
SELECT * FROM car;
```

### View Available Cars Only

```sql
SELECT car_id, model, year, price, range_km FROM car WHERE status = 'available';
```

### View Sold Cars with Revenue

```sql
SELECT model, price, sale_price, sold_date FROM car WHERE status = 'sold';
```

### View All Leads with Car Info

```sql
SELECT l.lead_id, l.name, l.email, c.model AS car_model, l.created_at
FROM lead l
JOIN car c ON l.car_id = c.car_id;
```

### View Upcoming Appointments

```sql
SELECT a.appointment_id, a.customer_name, a.appointment_date, a.appointment_time, c.model
FROM appointment a
JOIN car c ON a.car_id = c.car_id
WHERE a.status = 'scheduled'
ORDER BY a.appointment_date, a.appointment_time;
```

### View All Customers

```sql
SELECT customer_id, name, email, phone, created_at FROM customer;
```

### View Saved Cars for a Customer

```sql
SELECT c.model, c.price, sc.saved_at
FROM saved_car sc
JOIN car c ON sc.car_id = c.car_id
WHERE sc.customer_id = 1;
```

### Count Cars by Status

```sql
SELECT status, COUNT(*) as count FROM car GROUP BY status;
```

### Total Revenue from Sold Cars

```sql
SELECT SUM(sale_price) as total_revenue FROM car WHERE status = 'sold';
```

## Table Schemas

### admin
- `admin_id` (INTEGER, PRIMARY KEY)
- `username` (VARCHAR(80), UNIQUE)
- `password_hash` (VARCHAR(255))

### customer
- `customer_id` (INTEGER, PRIMARY KEY)
- `name` (VARCHAR(100))
- `email` (VARCHAR(120), UNIQUE)
- `password_hash` (VARCHAR(255))
- `phone` (VARCHAR(20))
- `created_at` (DATETIME)

### car
- `car_id` (INTEGER, PRIMARY KEY)
- `model` (VARCHAR(120))
- `year` (INTEGER)
- `price` (FLOAT)
- `range_km` (INTEGER)
- `charge_time_min` (INTEGER)
- `description` (TEXT)
- `image_url` (TEXT)
- `status` (VARCHAR(20)) — 'available' or 'sold'
- `sale_price` (FLOAT)
- `sold_date` (DATETIME)

### lead
- `lead_id` (INTEGER, PRIMARY KEY)
- `name` (VARCHAR(100))
- `email` (VARCHAR(120))
- `message` (TEXT)
- `car_id` (INTEGER, FOREIGN KEY → car.car_id)
- `created_at` (DATETIME)

### appointment
- `appointment_id` (INTEGER, PRIMARY KEY)
- `customer_name` (VARCHAR(100))
- `customer_email` (VARCHAR(120))
- `customer_phone` (VARCHAR(20))
- `car_id` (INTEGER, FOREIGN KEY → car.car_id)
- `appointment_date` (DATE)
- `appointment_time` (TIME)
- `status` (VARCHAR(20)) — 'scheduled', 'completed', 'cancelled'
- `created_at` (DATETIME)

### saved_car
- `id` (INTEGER, PRIMARY KEY)
- `customer_id` (INTEGER, FOREIGN KEY → customer.customer_id)
- `car_id` (INTEGER, FOREIGN KEY → car.car_id)
- `saved_at` (DATETIME)

### setting
- `key` (VARCHAR(50), PRIMARY KEY)
- `value` (TEXT)
