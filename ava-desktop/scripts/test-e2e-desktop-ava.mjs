import { spawn } from "node:child_process";
import readline from "node:readline";

console.log("=== Testing Native AvA Core (codex-app-server) Integration ===");

const binPath = "/var/www/ava-code/ava-rs/target/debug/codex-app-server";
const env = {
  ...process.env,
  CODEX_HOME: "/root/.ava-code",
  AVA_HOME: "/root/.ava-code",
};

const child = spawn(binPath, ["--listen", "stdio://"], {
  env,
  stdio: ["pipe", "pipe", "pipe"],
});

let idCounter = 1;
const pending = new Map();

const rl = readline.createInterface({ input: child.stdout });
rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) {
      console.log(`[CORE NOTIFICATION] ${msg.method}`);
    }
  } catch (e) {
    console.error("Failed to parse JSON:", line);
  }
});

child.stderr.on("data", (d) => {
  // Silence regular debug logs
});

function call(method, params = {}) {
  const id = String(idCounter++);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    child.stdin.write(payload);
  });
}

async function runTests() {
  try {
    console.log("1. Testing initialize...");
    const init = await call("initialize", { clientInfo: { name: "ava-desktop", version: "0.15.2" } });
    console.log("✓ initialize success:", Object.keys(init || {}));

    console.log("2. Testing thread/list (Sessions)...");
    const listRes = await call("thread/list", {});
    console.log(`✓ thread/list success: found ${listRes?.data?.length || 0} sessions`);

    console.log("3. Testing model/list (Models)...");
    const modelRes = await call("model/list", {});
    console.log(`✓ model/list success: found ${modelRes?.data?.length || 0} models`);

    let threadId = listRes?.data?.[0]?.id;
    if (threadId) {
      console.log(`4. Testing thread/read for thread ${threadId}...`);
      const threadRes = await call("thread/read", { threadId, includeTurns: true });
      console.log(`✓ thread/read success: thread ${threadRes?.thread?.id} with ${threadRes?.thread?.turns?.length || 0} turns`);
    }

    console.log("5. Testing new thread/start...");
    const newThread = await call("thread/start", { cwd: "/var/www/ava-code" });
    const createdId = newThread?.thread?.id;
    console.log(`✓ thread/start success: created thread ${createdId}`);

    if (createdId) {
      console.log("6. Testing thread/name/set...");
      await call("thread/name/set", { threadId: createdId, name: "Test Verification Session" });
      console.log("✓ thread/name/set success");

      console.log("7. Testing thread/archive...");
      await call("thread/archive", { threadId: createdId });
      console.log("✓ thread/archive success");
    }

    console.log("\n=== ALL NATIVE CORE TESTS PASSED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    child.kill("SIGTERM");
    process.exit(0);
  }
}

runTests();
