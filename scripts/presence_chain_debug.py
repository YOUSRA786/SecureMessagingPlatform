#!/usr/bin/env python3
import asyncio
import json
import secrets
import time
import sqlite3
from pathlib import Path

import httpx
import websockets

API = "http://127.0.0.1:8000"
WS = "ws://127.0.0.1:8000/ws"
DB_PATH = Path("backend/signal_clone.db")

async def register_and_login(client: httpx.AsyncClient, username: str):
    pw = "password123"
    register_payload = {
        "username": username,
        "password": pw,
        "otp": "123456",
        "display_name": username,
    }
    r = await client.post(f"{API}/auth/register", json=register_payload)
    r.raise_for_status()
    token = r.json()["access_token"]
    user = r.json()["user"]
    return token, user

async def open_ws(token):
    ws = await websockets.connect(WS)
    await ws.send(json.dumps({"type": "auth", "data": {"token": token}}))
    return ws

def query_db_user(user_id: int):
    if not DB_PATH.exists():
        return None
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT id, username, is_online, last_seen_at FROM users WHERE id=?", (user_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

async def main():
    async with httpx.AsyncClient() as client:
        name_a = "chain_a_" + secrets.token_hex(3)
        name_b = "chain_b_" + secrets.token_hex(3)
        print("Registering", name_a, name_b)
        token_a, user_a = await register_and_login(client, name_a)
        token_b, user_b = await register_and_login(client, name_b)
        print("users", user_a["id"], user_b["id"])

        r = await client.post(f"{API}/conversations/direct", json={"user_id": user_b["id"]}, headers={"Authorization": f"Bearer {token_a}"})
        r.raise_for_status()
        conv = r.json()
        conv_id = conv["id"]
        print("conversation", conv_id)

        ws_a = await open_ws(token_a)
        ws_b = await open_ws(token_b)

        async def recv(ws, name, timeout=5):
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
                print(f"{name} recv:", msg)
                return json.loads(msg)
            except asyncio.TimeoutError:
                return None

        # drain any initial events
        await asyncio.sleep(0.2)

        # Close B to set offline
        print("Closing B websocket to trigger offline presence")
        await ws_b.close()

        # Wait for A to receive presence.update for B
        start = time.time()
        got = None
        while time.time() - start < 6:
            ev = await recv(ws_a, "A", timeout=1)
            if not ev:
                continue
            if ev.get("type") == "presence.update" and ev.get("data", {}).get("user_id") == user_b["id"]:
                got = ev
                break
        if not got:
            print("A did not receive presence.update for B")
        else:
            print("A received presence.update for B:", got)

        # Query DB directly for user B
        db_val = query_db_user(user_b["id"])
        print("DATABASE VALUE for user B:", db_val)

        # Query backend API /users as A (will list other users)
        r2 = await client.get(f"{API}/users", headers={"Authorization": f"Bearer {token_a}"})
        r2.raise_for_status()
        users_list = r2.json()
        user_b_api = next((u for u in users_list if u["id"] == user_b["id"]), None)
        print("BACKEND /users response for B:", user_b_api)

        # Query backend API /conversations as A
        r3 = await client.get(f"{API}/conversations", headers={"Authorization": f"Bearer {token_a}"})
        r3.raise_for_status()
        convs = r3.json()
        conv_entry = next((c for c in convs if c["id"] == conv_id), None)
        print("BACKEND /conversations response for conv:", conv_entry)

        # Simulate frontend conversation state (initially API result), then simulate WS update applying to state
        frontend_state = convs
        # find the conversation and member user object for B
        conv_members = conv_entry.get("members", []) if conv_entry else []
        member_user_obj = next((m.get("user") for m in conv_members if m.get("user", {}).get("id") == user_b["id"]), None)
        print("FRONTEND CONVERSATION STATE (member user object for B):", member_user_obj)

        # isUserOnline check (replicate JS helper logic)
        def is_user_online(val):
            if val is True:
                return True
            if val is False:
                return False
            if isinstance(val, str):
                v = val.strip().lower()
                return v == "true" or v == "1"
            if isinstance(val, (int, float)):
                return val == 1
            return False

        print("isUserOnline(member_user_obj.is_online):", is_user_online(member_user_obj.get("is_online") if member_user_obj else None))

        # Also report what conversation-sidebar would receive: it takes conversations prop and finds otherMember = conv.members.find(...)
        # So the conversation-sidebar user object equals member_user_obj above.

        await ws_a.close()

if __name__ == '__main__':
    asyncio.run(main())
