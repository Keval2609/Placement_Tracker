"""Generate a persistent VAPID keypair for Web Push notifications.

Usage:
    python backend/scripts/generate_vapid_keys.py
"""

import base64

from cryptography.hazmat.primitives import serialization
from pywebpush import Vapid


def main() -> None:
    v = Vapid()
    v.generate_keys()
    raw_pub = v.public_key.public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )
    pub_b64 = base64.urlsafe_b64encode(raw_pub).decode().rstrip("=")
    priv_pem = v.private_pem().decode()

    print("=" * 60)
    print("Placement Tracker — VAPID Keypair Generated Successfully")
    print("=" * 60)
    print(f"VAPID_PUBLIC_KEY={pub_b64}")
    print(f"VAPID_PRIVATE_KEY={priv_pem.strip()}")
    print("VAPID_CLAIM_EMAIL=mailto:admin@placementtracker.app")
    print("=" * 60)
    print("Copy these values into your backend/.env and production environment.")


if __name__ == "__main__":
    main()
