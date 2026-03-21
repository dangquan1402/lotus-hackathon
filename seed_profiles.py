"""Seed demo user profiles from profiles.json into the Lotus API."""

import json
import httpx

API = "http://localhost:8989/api"


def main():
    profiles = json.loads(open("profiles.json").read())
    client = httpx.Client(timeout=30)

    for profile in profiles:
        # Check if user already exists by name
        try:
            resp = client.post(f"{API}/users/login", json={"name": profile["name"]})
            if resp.status_code == 200:
                user = resp.json()
                # Update existing user
                resp = client.put(f"{API}/users/{user['id']}", json=profile)
                if resp.status_code == 200:
                    u = resp.json()
                    print(f"  Updated: {u['name']} (id={u['id']}, style={u.get('image_style')})")
                else:
                    print(f"  Failed to update {profile['name']}: {resp.text}")
                continue
        except Exception:
            pass

        # Create new user
        resp = client.post(f"{API}/users", json=profile)
        if resp.status_code == 201:
            u = resp.json()
            print(f"  Created: {u['name']} (id={u['id']}, style={u.get('image_style')})")
        else:
            print(f"  Failed to create {profile['name']}: {resp.status_code} {resp.text}")

    print("\nDone. All profiles seeded.")


if __name__ == "__main__":
    main()
