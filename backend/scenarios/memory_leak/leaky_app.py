"""
Deliberately leaks memory by continuously appending large chunks of data
to a list that's never cleared. With the container's memory limit set low
(see trigger.sh, --memory=100m), this will hit the limit and get OOMKilled
by Docker within a short time - a realistic "memory leak" failure signature.
"""

import time

leak = []

print("Starting leaky app... will consume memory until OOM killed.")

i = 0
while True:
    chunk = bytearray(5 * 1024 * 1024)
    leak.append(chunk)
    i += 1
    print(f"Iteration {i}: allocated ~{i * 5}MB total")
    time.sleep(0.5)