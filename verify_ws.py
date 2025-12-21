import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://127.0.0.1:8000/api/ws/chat/test-session"
    try:
        async with websockets.connect(uri) as websocket:
            # Wait for init message
            response = await websocket.recv()
            print(f"Received: {response}")
            data = json.loads(response)
            if data.get("type") == "init":
                print("SUCCESS: Connected and received init")
            elif data.get("type") == "error":
                print(f"FAILURE: Received error: {data.get('message')}")
            else:
                print(f"UNKNOWN: {data}")
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws())
