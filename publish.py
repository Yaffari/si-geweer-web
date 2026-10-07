"""Publish the iPhone web app to GitHub Pages:  python publish.py "What changed"

Stamps a new VERSION into app.js and sw.js (installed iPhones pick the update up the next time they are online),
runs the logic tests (which also check the Android file format), commits and pushes to
github.com/Yaffari/si-geweer-web; GitHub Pages serves the main branch at https://yaffari.github.io/si-geweer-web/
Only this folder is published: the app's code, never any names or ratings.
"""
import re
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
URL = "https://yaffari.github.io/si-geweer-web/"


def run(*args):
    r = subprocess.run(args, cwd=HERE, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        sys.exit(f"FAILED: {' '.join(args)}\n{r.stdout}{r.stderr}")
    return r.stdout


def main():
    message = sys.argv[1] if len(sys.argv) > 1 else "Update"
    version = time.strftime("%Y.%m.%d-%H%M")
    for name in ("app.js", "sw.js"):
        p = HERE / name
        text, n = re.subn(r"const VERSION = '[^']*';", f"const VERSION = '{version}';", p.read_text(encoding="utf-8"), count=1)
        if n != 1:
            sys.exit(f"no VERSION line in {name}")
        p.write_text(text, encoding="utf-8")
    run("node", "--test", "test/logic.test.mjs")
    run("git", "add", "-A")
    run("git", "commit", "-m", message)
    run("git", "push", "origin", "main")
    print(f"published {version} -> {URL}")


if __name__ == "__main__":
    main()
