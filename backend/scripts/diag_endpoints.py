"""Diagnostico: testa endpoints de historias (publica, mine, admin por status)."""
import requests
import sys

base = "https://casos-backend-01.onrender.com"
username = "Odesile"
password = sys.argv[1] if len(sys.argv) > 1 else None

# publica
try:
    r = requests.get(f"{base}/api/stories", params={"limit": 50}, timeout=30)
    print(f"GET /api/stories (publica): HTTP {r.status_code}, {len(r.json())} historias")
except requests.RequestException as e:
    print(f"GET /api/stories FALHOU: {e}")

if not password:
    print("\nPara testar /mine e /admin, rode: python diag_endpoints.py <senha_admin>")
    raise SystemExit(0)

login = requests.post(f"{base}/api/admin/login", json={"username": username, "password": password}, timeout=30)
if login.status_code != 200:
    print(f"\nLOGIN admin FALHOU: HTTP {login.status_code} {login.text[:200]}")
    raise SystemExit(1)

token = login.json()["access_token"]
H = {"Authorization": f"Bearer {token}"}

# mine
r = requests.get(f"{base}/api/stories/mine", headers=H, timeout=30)
print(f"\nGET /api/stories/mine: HTTP {r.status_code}")
if r.status_code == 200:
    print(f"  -> {len(r.json())} historias do autor")
else:
    print(f"  -> ERRO: {r.text[:300]}")

# admin por status
for st in ["pending", "needs_revision", "approved", "deleted"]:
    r = requests.get(f"{base}/api/admin/stories", params={"status_filter": st, "limit": 50}, headers=H, timeout=30)
    if r.status_code == 200:
        stories = r.json()
        print(f"GET /api/admin/stories?status={st}: HTTP 200, {len(stories)} historias")
        for s in stories:
            print(f"     id={s['id']} titulo={s['title'][:40]!r}")
    else:
        print(f"GET /api/admin/stories?status={st}: HTTP {r.status_code} -> {r.text[:300]}")
