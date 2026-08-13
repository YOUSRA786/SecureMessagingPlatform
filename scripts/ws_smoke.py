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
    # send auth handshake
    await ws.send(json.dumps({"type": "auth", "data": {"token": token}}))
    return ws

async def main():
    async with httpx.AsyncClient() as client:
        name_a = "test_a_" + secrets.token_hex(4)
        name_b = "test_b_" + secrets.token_hex(4)
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

        # open websockets
        print("Opening websockets")
        ws_a = await open_ws(token_a)
        ws_b = await open_ws(token_b)

        async def recv(ws, name, timeout=5):
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=timeout)
                print(f"{name} recv:", msg)
                return json.loads(msg)
            except asyncio.TimeoutError:
                return None

        # send message via REST as A
        r = await client.post(f"{API}/conversations/{conv_id}/messages", json={"content": "Hello from A", "content_type": "text"}, headers={"Authorization": f"Bearer {token_a}"})
        r.raise_for_status()
        sent = r.json()
        print("A sent via REST ->", sent["id"])

        # B should receive message.created via ws; drain interim events until found
        ev_b = None
        start = time.time()
        while time.time() - start < 5:
            ev = await recv(ws_b, "B", timeout=0.5)
            if not ev:
                continue
            if ev.get("type") == "message.created":
                ev_b = ev
                break
        assert ev_b and ev_b.get("type") == "message.created", "B did not receive message.created"
        msg = ev_b["data"]
        assert msg["content"] == "Hello from A"
        print("B received message.created ok")

        # B sends message.delivered
        await ws_b.send(json.dumps({"type": "message.delivered", "data": {"message_id": msg["id"]}}))
        print("B sent delivered")

        # A should receive message.status_update (allow interim presence events)
        ev_a = None
        start = time.time()
        while time.time() - start < 5:
            ev = await recv(ws_a, "A", timeout=0.5)
            if not ev:
                continue
            if ev.get("type") == "message.status_update":
                ev_a = ev
                break
        assert ev_a and ev_a.get("type") == "message.status_update", "A did not receive status_update"
        print("A received status_update ok")

        # B sends message.read
        await ws_b.send(json.dumps({"type": "message.read", "data": {"conversation_id": conv_id, "last_read_message_id": msg["id"]}}))
        print("B sent read")
        ev_a2 = None
        start = time.time()
        while time.time() - start < 5:
            ev = await recv(ws_a, "A", timeout=0.5)
            if not ev:
                continue
            if ev.get("type") == "message.status_update":
                ev_a2 = ev
                break
        assert ev_a2 and ev_a2.get("type") == "message.status_update", "A did not receive read status_update"
        print("A received read status_update ok")

        # Typing start
        await ws_b.send(json.dumps({"type": "typing.start", "data": {"conversation_id": conv_id}}))
        ev_a3 = None
        start = time.time()
        while time.time() - start < 5:
            ev = await recv(ws_a, "A", timeout=0.5)
            if not ev:
                continue
            if ev.get("type") == "typing.start":
                ev_a3 = ev
                break
        assert ev_a3 and ev_a3.get("type") == "typing.start", "A did not receive typing.start"
        print("A received typing.start ok")

        # Typing stop
        await ws_b.send(json.dumps({"type": "typing.stop", "data": {"conversation_id": conv_id}}))
        ev_a4 = None
        start = time.time()
        while time.time() - start < 5:
            ev = await recv(ws_a, "A", timeout=0.5)
            if not ev:
                continue
            if ev.get("type") == "typing.stop":
                ev_a4 = ev
                break
        assert ev_a4 and ev_a4.get("type") == "typing.stop", "A did not receive typing.stop"
        print("A received typing.stop ok")

        # Presence: close B ws -> A should see presence.update offline
        await ws_b.close()
        ev_a5 = await recv(ws_a, "A")
        assert ev_a5 and ev_a5.get("type") == "presence.update", "A did not receive presence.update on B disconnect"
        print("A received presence.update offline ok")

        # Reconnect B
        ws_b2 = await open_ws(token_b)
        ev_a6 = await recv(ws_a, "A")
        assert ev_a6 and ev_a6.get("type") == "presence.update", "A did not receive presence.update on B reconnect"
        print("A received presence.update online ok")

        await ws_a.close()
        await ws_b2.close()

        print("Smoke test PASSED")

if __name__ == '__main__':
    asyncio.run(main())
