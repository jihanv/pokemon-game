// server.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("✅ client connected");

  // camera offset starts where your client starts
  let x = -735;
  let y = -640;

  // store the *current* input state
  const input = { up: false, down: false, left: false, right: false };

  // send initial state once
  ws.send(JSON.stringify({ type: "state", x, y }));

  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (msg.type !== "input") return;

    input.up = !!msg.up;
    input.down = !!msg.down;
    input.left = !!msg.left;
    input.right = !!msg.right;
  });

  const speed = 9; // per tick

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const tick = setInterval(() => {
    let moved = false;

    // IMPORTANT: these are reversed because you move the world/camera
    if (input.up) {
      y += speed;
      moved = true;
    }
    if (input.down) {
      y -= speed;
      moved = true;
    }
    if (input.left) {
      x += speed;
      moved = true;
    }
    if (input.right) {
      x -= speed;
      moved = true;
    }

    // --- clamp limits (temporary numbers you can tweak) ---
    const MIN_X = -2000;
    const MAX_X = 0;
    const MIN_Y = -2000;
    const MAX_Y = 0;

    x = clamp(x, MIN_X, MAX_X);
    y = clamp(y, MIN_Y, MAX_Y);

    if (moved && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "state", x, y }));
    }
  }, 50); // 20 times/sec

  ws.on("close", () => {
    clearInterval(tick);
    console.log("👋 client disconnected");
  });
});

console.log("🚀 WebSocket server running on ws://localhost:8080");
