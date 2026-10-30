"""The one place that says where datasets live. secure_data/ is kept out of git and Docker images."""
import os

SECURE_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'secure_data')
UPLOADS_DIR = os.path.join(SECURE_DATA_DIR, 'uploads')
