import os
import socket
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file
load_dotenv()

def is_backend_online(db_url):
    """Reliably check if the Postgres DB is reachable before committing to the URI."""
    if not db_url or 'localhost' in db_url:
        return False
    try:
        # Simple extraction of host and port
        host_port = db_url.split('@')[1].split('/')[0]
        if ':' in host_port:
            host, port = host_port.split(':')
            port = int(port)
        else:
            host = host_port
            port = 5432
        
        # 2 second timeout for "premium" responsiveness
        socket.create_connection((host, port), timeout=2)
        return True
    except Exception:
        return False

class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'fyp-secret-key')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', os.getenv('SECRET_KEY', 'fyp-jwt-secret-key'))
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # Smart Database Selector
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    # Explicitly check connectivity for Supabase
    if DATABASE_URL and is_backend_online(DATABASE_URL):
        SQLALCHEMY_DATABASE_URI = DATABASE_URL
        print(">>> DATABASE: Connected to Supabase Cloud")
    else:
        # Absolute path for instance folder to avoid confusion
        basedir = os.path.abspath(os.path.dirname(__file__))
        SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'instance', 'smart_classroom.db')
        print(">>> DATABASE: Using Local SQLite Cache (Offline/Lag Mode)")
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Environment
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = FLASK_ENV == 'development'
    
    # CORS
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    
    # Uploads
    UPLOAD_FOLDER = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB limit

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

# Mapping for factory pattern
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig
}
