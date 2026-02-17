# SmartEnergy Classroom Prototype - Production Ready 🚀

This repository contains the production-optimized version of the SmartEnergy Classroom system.

## Key Improvements Made

### 1. Security & Authentication 🔒
- **JWT (JSON Web Tokens)**: Switched from session-less insecure communication to a robust JWT-based authentication system.
- **Route Protection**: All sensitive API endpoints (Users, Classrooms, Timetable, Predictions) are now protected with the `@jwt_required()` decorator.
- **Password Hashing**: Passwords are securely hashed using `bcrypt` (already implemented but verified).
- **Secure API Interceptors**: The frontend now uses an Axios interceptor to automatically attach JWT tokens to every outgoing request.

### 2. DevOps & Deployment 🐳
- **Dockerization**: Added `Dockerfile` for both Backend and Frontend.
- **Orchestration**: Created `docker-compose.yml` to run the entire stack with a single command.
- **Nginx Config**: Included a custom Nginx configuration for the frontend to handle Single Page Application (SPA) routing correctly.
- **Production WSGI**: Configured `Gunicorn` as the production server for Linux/Container environments.

### 3. Backend Robustness 🛠️
- **Global Error Handling**: Added a global exception handler to prevent the app from leaking stack traces and ensuring a clean JSON response on failures.
- **Unified Seeding**: Consolidated database initialization and seeding into a clean, repeatable function.
- **Production Logging**: Integrated rotating file logs for production monitoring.

## How to Run in Production

### Using Docker (Recommended)
1. Ensure you have Docker and Docker Compose installed.
2. Build and run:
   ```bash
   docker-compose up --build
   ```
3. Access the frontend at `http://localhost`.

### Manual Setup
1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   # Set environment variables in .env
   gunicorn --bind 0.0.0.0:5000 wsgi:app
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   # Serve the 'dist' folder using Nginx or any static file server
   ```

## Environment Variables
Ensure you create a `.env` file in the `backend` folder based on `.env.example`.

---
*Developed for the Final Year Project - Smart Energy Management System.*
