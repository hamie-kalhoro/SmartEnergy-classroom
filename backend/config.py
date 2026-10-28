import os
import socket
from datetime import timedelta
from dotenv import load_dotenv

# Load .env file
load_dotenv()

def is_backend_online(db_url):
    """Reliably check if the Postgres DB is authenticated and reachable before committing to the URI."""
    if not db_url or 'localhost' in db_url or 'sqlite' in db_url:
        return False
    try:
        from sqlalchemy import create_engine, text
        test_engine = create_engine(db_url, connect_args={"connect_timeout": 3})
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        test_engine.dispose()
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
    
    # Engine options to prevent database connection drops
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
    
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

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    DEBUG = False

# Mapping for factory pattern
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}
