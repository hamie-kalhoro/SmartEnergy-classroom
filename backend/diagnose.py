import os
import sys
import socket
import smtplib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def print_result(check_name, success, message=""):
    color = "\033[92m[OK]\033[0m" if success else "\033[91m[FAIL]\033[0m"
    print(f"{color} {check_name}: {message}")

def run_diagnostics():
    print("\n🔍 --- SmartEnergy Backend Diagnostics ---\n")

    # 1. Environment Variables
    required_vars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'SECRET_KEY', 'MAIL_SERVER']
    missing = [v for v in required_vars if not os.getenv(v)]
    print_result("Environment Variables", not missing, f"Missing: {', '.join(missing)}" if missing else "All required variables found.")

    # 2. Database Connectivity
    db_uri = f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME')}"
    print(f"   Note: Checking DB at {os.getenv('DB_HOST')}:{os.getenv('DB_PORT', '3306')}")
    
    try:
        import pymysql
        conn = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME'),
            port=int(os.getenv('DB_PORT', 3306)),
            connect_timeout=3
        )
        conn.close()
        print_result("MySQL Connection", True, "Successfully connected to MySQL.")
    except Exception as e:
        print_result("MySQL Connection", False, f"Could not connect: {str(e)}")

    # 3. SMTP Connectivity
    server = os.getenv('MAIL_SERVER')
    port = int(os.getenv('MAIL_PORT', 587))
    try:
        # Check if port is open
        with socket.create_connection((server, port), timeout=3):
            pass
        print_result("SMTP Server Reachable", True, f"{server}:{port} is open.")
        
        # Try a quick login check if credentials exist
        if os.getenv('MAIL_USERNAME') and os.getenv('MAIL_PASSWORD'):
            try:
                smtp = smtplib.SMTP(server, port, timeout=5)
                smtp.starttls()
                smtp.login(os.getenv('MAIL_USERNAME'), os.getenv('MAIL_PASSWORD'))
                smtp.quit()
                print_result("SMTP Authentication", True, "Login successful.")
            except Exception as login_err:
                print_result("SMTP Authentication", False, str(login_err))
    except Exception as e:
        print_result("SMTP Server Reachable", False, f"Could not reach {server}:{port}")

    # 4. Critical Files
    paths = ['app.py', 'models.py', 'services.py', 'ml_engine.py', 'requirements.txt']
    missing_files = [p for p in paths if not os.path.exists(p)]
    print_result("Critical Files", not missing_files, f"Missing: {', '.join(missing_files)}" if missing_files else "All source files found.")

    # 5. ML Model
    model_exists = os.path.exists('occupancy_model.pkl')
    print_result("ML Model File", model_exists, "Model found." if model_exists else "Model not found (will be trained on first run).")

    print("\n--- Diagnostics Complete ---\n")

if __name__ == "__main__":
    run_diagnostics()
