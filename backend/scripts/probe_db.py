
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def probe():
    url = os.getenv("DATABASE_URL")
    print(f"Testing connection to: {url}")
    try:
        conn = psycopg2.connect(url)
        print("Success! Connection established.")
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
        tables = cur.fetchall()
        print(f"Tables found: {[t[0] for t in tables]}")
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    probe()
