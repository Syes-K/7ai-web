#!/usr/bin/env python3
"""Loop test — odd rounds: args [total, round]."""

import sys


def main() -> None:
    if len(sys.argv) < 3:
        print("ERROR: usage tick.py <total> <round>", file=sys.stderr)
        sys.exit(2)

    total = sys.argv[1]
    round_num = sys.argv[2]
    try:
        t = int(total)
        r = int(round_num)
    except ValueError:
        print("ERROR: total and round must be integers", file=sys.stderr)
        sys.exit(2)

    if r < 1 or r > t:
        print(f"ERROR: round {r} out of range 1..{t}", file=sys.stderr)
        sys.exit(2)

    print(f"TICK round={r}/{t}")
    print(f"phase=tick script=tick.py")


if __name__ == "__main__":
    main()
