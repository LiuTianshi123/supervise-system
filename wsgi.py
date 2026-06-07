"""
WSGI entry point for PythonAnywhere deployment.
PythonAnywhere will call this file to get the Flask application.
"""
import sys
import os

# Project root on PythonAnywhere: /home/username/mysite
# This file is at the project root
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(PROJECT_ROOT, 'backend')

# Add backend/ to sys.path so 'import database' works in app.py
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Set environment to production
os.environ.setdefault('FLASK_ENV', 'production')

# Import the Flask app
# app.py is in backend/, and backend/ is now in sys.path
from app import app as application

# For debugging: print paths on startup
print(f"[WSGI] PROJECT_ROOT={PROJECT_ROOT}")
print(f"[WSGI] BACKEND_DIR={BACKEND_DIR}")
print(f"[WSGI] sys.path={sys.path[:3]}")
