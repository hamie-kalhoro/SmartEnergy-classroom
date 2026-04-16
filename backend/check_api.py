import requests
import json

BASE_URL = "http://localhost:5000"

def check_dashboard():
    print("Checking Dashboard APIs...")
    
    # We need a token. Let's try to login as admin.
    login_url = f"{BASE_URL}/api/login"
    login_data = {"username": "admin@smart.com", "password": "admin123"}
    
    try:
        res = requests.post(login_url, json=login_data)
        if res.status_code != 200:
            print(f"Login failed: {res.status_code} - {res.text}")
            return
        
        token = res.json().get('token')
        headers = {"Authorization": f"Bearer {token}"}
        
        apis = [
            "/api/dashboard/stats",
            "/api/decisions/recent",
            "/api/dashboard/charts"
        ]
        
        for api in apis:
            url = f"{BASE_URL}{api}"
            print(f"Calling {url}...")
            r = requests.get(url, headers=headers)
            if r.status_code == 200:
                print(f"SUCCESS: {api}")
                # print(json.dumps(r.json(), indent=2))
            else:
                print(f"FAILED: {api} - {r.status_code}")
                print(r.text)
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_dashboard()
