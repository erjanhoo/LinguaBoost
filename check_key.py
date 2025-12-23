import os
import sys
from pathlib import Path

# Setup Django
sys.path.insert(0, str(Path(__file__).parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from django.conf import settings

print("=== API Key Debug ===")
print(f"Key from settings: {settings.OPENAI_API_KEY}")
print(f"Key length: {len(settings.OPENAI_API_KEY)}")
print(f"Key starts with: {settings.OPENAI_API_KEY[:20]}...")
print(f"Key ends with: ...{settings.OPENAI_API_KEY[-20:]}")

# Also check direct env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env", override=True)
direct_key = os.getenv("OPENAI_API_KEY", "")
print(f"\nKey from direct .env: {direct_key}")
print(f"Direct key length: {len(direct_key)}")
print(f"Keys match: {settings.OPENAI_API_KEY == direct_key}")
