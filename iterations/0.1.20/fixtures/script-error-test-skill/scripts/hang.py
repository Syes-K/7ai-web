#!/usr/bin/env python3
"""Sleep long enough to hit default timeout — pass timeoutMs=5000 for fast test."""

import time

print("hang_start")
time.sleep(120)
print("hang_end")
