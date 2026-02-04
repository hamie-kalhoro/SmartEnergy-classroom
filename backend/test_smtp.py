import os
import smtplib
from dotenv import load_dotenv

load_dotenv()

def test_smtp():
    server = os.getenv('MAIL_SERVER')
    port = int(os.getenv('MAIL_PORT', 587))
    username = os.getenv('MAIL_USERNAME')
    password = os.getenv('MAIL_PASSWORD')
    sender = os.getenv('MAIL_DEFAULT_SENDER')

    print(f"Testing connection to {server}:{port}")
    print(f"Username: {username}")
    print(f"Sender: {sender}")
    
    try:
        smtp = smtplib.SMTP(server, port, timeout=10)
        smtp.starttls()
        print("STARTTLS successful")
        smtp.login(username, password)
        print("Login successful!")
        smtp.quit()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_smtp()
