// server.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("✅ client connected");
  let last = ""; // remember last message string
  let x = -735;
  let y = -640;
  // send a hello message so you know it works
  ws.send(JSON.stringify({ type: "welcome", msg: "hello from server" }));

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());

    // ignore anything that's not input
    if (msg.type !== "input") return;

    // move 9px per tick because you're sending inputs every 50ms (20x/sec)
    const speed = 9;

    let moved = false;

    if (msg.up) {
      y += speed;
      moved = true;
    }
    if (msg.down) {
      y -= speed;
      moved = true;
    }
    if (msg.left) {
      x += speed;
      moved = true;
    }
    if (msg.right) {
      x -= speed;
      moved = true;
    }

    if (moved) {
      ws.send(JSON.stringify({ type: "state", x, y }));
    }
  });

  ws.on("close", () => {
    console.log("👋 client disconnected");
  });
});

console.log("🚀 WebSocket server running on ws://localhost:8080");
