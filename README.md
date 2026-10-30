# SmartEnergy Classroom

A final year project that predicts classroom occupancy from timetable and attendance data, then recommends how to run each room's lights, fans and ACs to save energy.

The system supports decisions and does not control devices. The optional hardware portal only displays what the classroom rig reports.

## Features

- **Occupancy prediction:** a Random Forest model places each class in one of five levels: Empty, Trace, Light, Balanced or Maximum.
- **Energy recommendations:** predictions are combined with climate rules to suggest device settings and estimate kWh savings.
- **Campus map:** rooms are linked to an interactive map of the department.
- **Management pages:** classrooms, timetables, users and training datasets, with CSV bulk import.
- **Accounts:** JWT login, email activation with a resend option, and admin approval for admin signups.
- **Hardware portal:** an admin-only live view of the classroom ESP32 over USB, with a separate advisory load forecast.

## Tech stack

| Area | Technology |
|---|---|
| Backend | Flask, SQLAlchemy, Flask-JWT-Extended |
| Frontend | React, Vite, Bootstrap, Chart.js, Three.js |
| Machine learning | scikit-learn, pandas, joblib |
| Database | PostgreSQL (Supabase) or local SQLite |
| Hardware | ESP32 connected over USB serial, read with pyserial |

## Project structure

```text
backend/
  app.py               App setup, database seeding and development entry point
  wsgi.py              Gunicorn entry point
  config.py            Environment and database selection
  data_paths.py        Dataset locations
  secure_data/         Datasets and uploads; not in git, shared separately
  models.py            Database models
  services.py          Authentication and email services
  email_templates.py   Activation email
  ml_engine.py         Occupancy model
  climate_service.py   Climate rules
  hardware_bridge.py   USB serial reader for the ESP32
  hardware_ml.py       Hardware load forecast
  routes/              API endpoints, grouped by feature
  tests/               Unit tests
frontend/
  src/pages/           One component per page
  src/api.js           API client, which attaches the JWT to requests
docker-compose.yml     Runs both services in containers
```

## Run locally

You need Python 3 and Node.js. The current setup has been run with Python 3.14.

### 1. Configure the backend

Copy the example settings, then fill in the values:

```bash
cp backend/.env.example backend/.env
```

| Settings | Purpose |
|---|---|
| `SECRET_KEY`, `JWT_SECRET_KEY` | Signing keys; use long random values |
| `DATABASE_URL` | PostgreSQL connection; leave empty to use local SQLite |
| `FRONTEND_URL`, `BACKEND_URL` | Used for CORS and for links in emails |
| `MAIL_*` | SMTP account that sends activation emails |
| `OPENWEATHER_API_KEY`, `UNIVERSITY_*` | Optional live weather; without them, the season is worked out from the date |
| `HARDWARE_SERIAL_PORT` | Optional USB port for the ESP32, such as `COM6` |

> [!WARNING]
> If `DATABASE_URL` is set and reachable, the app and any database scripts use that database, including its live data. If it can't be reached within 3 seconds, the app silently falls back to SQLite, so check the `>>> DATABASE:` line at startup to see which one is in use.

### 2. Start the backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API runs at `http://localhost:5000`. On first run, this creates the database tables and a default admin account, defined in `seed_database` in `backend/app.py`. Change that password on any shared database.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite forwards `/api` requests to the backend.

## Datasets

Datasets are kept in `backend/secure_data/`, which isn't in git or Docker images. After a fresh clone, get a copy of this folder from a team member or rebuild the main files with `python generate_academic_data.py`, which also retrains the model.

| Location | Contents |
|---|---|
| `secure_data/` | Training history, attendance data, timetable and training log |
| `secure_data/samples/` | Small sample and import files |
| `secure_data/archive/` | Older versions, kept for reference |
| `secure_data/uploads/` | Temporary location for uploaded CSV files |

## Run the tests

From `backend/`:

```bash
python -m unittest tests.test_activation_email tests.test_hardware
```

The tests don't send real email or need the ESP32. Send a real signup email to confirm mail settings work.

## Hardware portal

The portal is at `/hardware` and is only available to admins. It reads the entry and exit counts and load level that the ESP32 sends over USB at 115200 baud.

- **One-way only:** the firmware switches the relays by itself, and the portal can't send it commands.
- **`python app.py` only:** the USB reader doesn't start under Gunicorn, and it holds the serial port while running.
- **Separate forecast:** the load forecast doesn't use the occupancy model or the main database. It is currently trained on simulated sessions, so its accuracy doesn't represent real-world performance.

## Docker

```bash
docker-compose up --build
```

The frontend is served at `http://localhost` and the backend at `http://localhost:5000`. Docker runs the backend with Gunicorn, which has the limitations listed below.

## Known limitations

This is a prototype and isn't ready for production use.

- **Database setup under Gunicorn:** tables and seed data are only created by `python app.py`, so a new database must be set up that way first.
- **HTTPS:** outside development, the backend redirects all requests to HTTPS, so it needs an HTTPS proxy in front of it.
- **Access control:** many admin actions only check that a user is logged in, not their role. `/api/predict` needs no login, and signup accepts a role from the client. These need tightening before any public deployment.
- **Energy savings:** estimates use fixed values for each energy mode and don't yet account for each room's actual devices.
- **Room capacity:** capacity is stored but isn't used in predictions.
