"""
Minimal app that requires a DATABASE_URL environment variable to start.
If it's missing, this crashes immediately with a clear KeyError - a
realistic "missing config" failure signature.
"""

import os
import time

print("Starting app...")

database_url = os.environ["DATABASE_URL"]

print(f"Connecting to database at {database_url}...")
print("App started successfully.")

while True:
    time.sleep(10)