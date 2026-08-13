#!/usr/bin/env python3
import asyncio
import json
import secrets
import time

import httpx
import websockets

API = "http://127.0.0.1:8000"
WS = "ws://127.0.0.1:8000/ws"

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

async def main():
    async with httpx.AsyncClient() as client:
        name_a = "check_a_" + secrets.token_hex(3)
        name_b = "check_b_" + secrets.token_hex(3)
        print("Registering", name_a, name_b)
        token_a, user_a = await register_and_login(client, name_a)
        token_b, user_b = await register_and_login(client, name_b)
        print("users", user_a["id"], user_b["id"])

        # create direct conversation from A to B
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

        # drain initial presence events for both
        await asyncio.sleep(0.2)
        # close B and wait for A to receive presence.update
        print("Closing B websocket to trigger offline presence")
        await ws_b.close()

        # wait specifically for presence.update about user_b
        start = time.time()
        target_uid = user_b["id"]
        got = None
        while time.time() - start < 6:
            ev = await recv(ws_a, "A", timeout=1)
            if not ev:
                continue
            if ev.get("type") == "presence.update" and ev.get("data", {}).get("user_id") == target_uid:
                got = ev
                break
        if not got:
            print(f"A did not receive presence.update for user {target_uid}")
            return
        print("A got presence event for B:", got)
        uid = got.get("data", {}).get("user_id")
        is_online = got.get("data", {}).get("is_online")

        # Now poll the conversations API as A and inspect the member's is_online
        print("Polling /conversations as A to compare API state...")
        r = await client.get(f"{API}/conversations", headers={"Authorization": f"Bearer {token_a}"})
        r.raise_for_status()
        convs = r.json()
        matches = []
        for c in convs:
            for m in c.get("members", []):
                if m.get("user", {}).get("id") == uid:
                    matches.append({"conversation_id": c.get("id"), "api_is_online": m.get("user", {}).get("is_online")})
        print("API conversation member presence for user:", matches)

        # Reconnect B and poll again
        ws_b2 = await open_ws(token_b)
        # wait for presence.update about user_b after reconnect
        start = time.time()
        got2 = None
        while time.time() - start < 6:
            ev = await recv(ws_a, "A", timeout=1)
            if not ev:
                continue
            if ev.get("type") == "presence.update" and ev.get("data", {}).get("user_id") == target_uid:
                got2 = ev
                break
        print("A received after reconnect:", got2)
        r2 = await client.get(f"{API}/conversations", headers={"Authorization": f"Bearer {token_a}"})
        r2.raise_for_status()
        convs2 = r2.json()
        matches2 = []
        for c in convs2:
            for m in c.get("members", []):
                if m.get("user", {}).get("id") == uid:
                    matches2.append({"conversation_id": c.get("id"), "api_is_online": m.get("user", {}).get("is_online")})
        print("API conversation member presence after reconnect:", matches2)

        await ws_a.close()
        await ws_b2.close()

if __name__ == '__main__':
    asyncio.run(main())
