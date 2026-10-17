import asyncio
import json
import websockets
import sys

TOKEN = "090667263a8b9c359421bf376a670c63c8378f54c8a4538c13dae85ac1e1c0be"
WS_URL = f"ws://127.0.0.1:4096/ws?token={TOKEN}"

class RpcClient:
    def __init__(self, ws):
        self.ws = ws
        self.msg_id = 0
        self.pending = {}
        self.running = True
        self.events = asyncio.Queue()

    async def read_loop(self):
        while self.running:
            try:
                raw = await self.ws.recv()
                msg = json.loads(raw)
                if "id" in msg and msg["id"] in self.pending:
                    future = self.pending.pop(msg["id"])
                    if "error" in msg:
                        future.set_exception(Exception(json.dumps(msg["error"])))
                    else:
                        future.set_result(msg.get("result"))
                else:
                    await self.events.put(msg)
            except websockets.ConnectionClosed:
                break
            except Exception as e:
                break

    async def call(self, method, params=None):
        self.msg_id += 1
        req_id = self.msg_id
        fut = asyncio.get_event_loop().create_future()
        self.pending[req_id] = fut
        req = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params or {}
        }
        await self.ws.send(json.dumps(req))
        return await fut

async def test_agent_browser_capabilities():
    print("=" * 60)
    print("Testing Agent Browser Viewport, DevTools Metrics & Console Logs...")
    print("=" * 60)
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    async with websockets.connect(WS_URL, additional_headers=headers) as ws:
        rpc = RpcClient(ws)
        read_task = asyncio.create_task(rpc.read_loop())
        
        try:
            # 1. Initialize
            await rpc.call("initialize", {
                "clientInfo": {"name": "browser-qa", "version": "2.0.0", "client": "cli"},
                "capabilities": {"experimentalApi": True}
            })
            
            # 2. Start Thread
            thread_res = await rpc.call("thread/start", {
                "cwd": "/var/www/ava-code",
                "sandbox": "danger-full-access"
            })
            thread_id = thread_res.get("thread", {}).get("id") or thread_res.get("id")
            
            # 3. Start Turn: Viewport and Devtools test
            prompt = (
                "Call the 'browser' tool with action='open' and url='https://example.com'. "
                "Then resize viewport using action='viewport' with profile='mobile'. "
                "Finally inspect performance using action='devtools_metrics' and check console with action='console_logs'."
            )
            print(f"Prompt: {prompt}\n")
            turn_res = await rpc.call("turn/start", {
                "threadId": thread_id,
                "input": [{"type": "text", "text": prompt}]
            })
            
            turn_done = False
            tools_used = []
            while not turn_done:
                event = await asyncio.wait_for(rpc.events.get(), timeout=120.0)
                method = event.get("method", "")
                params = event.get("params", {})
                
                if method == "item/started":
                    item = params.get("item", {})
                    itype = item.get("type")
                    if itype in ["toolCall", "mcpToolCall"]:
                        tool_name = item.get("tool") or item.get("server") or item.get("name")
                        args = item.get("arguments") or item.get("argumentsJson")
                        print(f"👉 Tool Call Started: {tool_name} (args: {args})")
                        tools_used.append({"name": tool_name, "args": args})
                
                elif method == "item/completed":
                    item = params.get("item", {})
                    itype = item.get("type")
                    if itype in ["toolCall", "mcpToolCall"]:
                        res = item.get("result") or item.get("output")
                        res_str = str(res)[:160] + "..." if res and len(str(res)) > 160 else str(res)
                        print(f"✅ Tool Result: {res_str}")
                
                elif method == "item/agentMessage/delta":
                    delta = params.get("delta", "")
                    sys.stdout.write(delta)
                    sys.stdout.flush()
                
                elif method == "turn/completed":
                    print("\n\n🎉 Turn Completed Successfully!")
                    turn_done = True
                    break
                
                elif method == "error":
                    print(f"❌ Error: {json.dumps(params)}")
                    
            print(f"\nTotal tools successfully executed by agent: {len(tools_used)}")
            
        finally:
            rpc.running = False
            read_task.cancel()

if __name__ == "__main__":
    asyncio.run(test_agent_browser_capabilities())
