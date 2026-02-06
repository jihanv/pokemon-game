// server.js

//npx nodemon server.js
const collisions = require("./data/collisions.server.js");
console.log("server loaded collisions:", collisions.length);

const MAP_COLS = 70; // same number you use in the client slice(i, i+70)
const TILE_SIZE = 48; // same as Boundary.width/height

const solidTiles = [];
for (let i = 0; i < collisions.length; i++) {
  if (collisions[i] === 1025) solidTiles.push(i);
}
const solidSet = new Set(solidTiles);

console.log("🧱 solid tiles:", solidTiles.length);
console.log("🧱 first 10 solid tile indices:", solidTiles.slice(0, 10));

const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("client connected");

  // camera offset starts where your client starts
  let x = -735;
  let y = -640;

  const playerRect = {
    x: 1024 / 2 - 192 / 8, // same math you used for player.position.x
    y: 576 / 2 - 68 / 2, // same math you used for player.position.y
    w: 48, // player sprite width in world collisions (good approximation)
    h: 68, // player sprite height
  };

  function hitsWall(camX, camY) {
    // convert screen rect -> world rect using camera offset
    const worldX = playerRect.x - camX;
    const worldY = playerRect.y - camY;

    const left = Math.floor(worldX / TILE_SIZE);
    const right = Math.floor((worldX + playerRect.w - 1) / TILE_SIZE);
    const top = Math.floor(worldY / TILE_SIZE);
    const bottom = Math.floor((worldY + playerRect.h - 1) / TILE_SIZE);

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        const idx = r * MAP_COLS + c;
        if (solidSet.has(idx)) return true;
      }
    }
    return false;
  }

  console.log("🧪 hitsWall at start?", hitsWall(x, y));
  // store the *current* input state
  const input = { up: false, down: false, left: false, right: false };

  // send initial state once
  ws.send(JSON.stringify({ type: "state", x, y }));

  let mapInfo = null;
  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());

    // ✅ put mapInfo handling here
    if (msg.type === "mapInfo") {
      mapInfo = msg;

      const MIN_X = mapInfo.viewWidth - mapInfo.mapWidth;
      const MAX_X = 0;
      const MIN_Y = mapInfo.viewHeight - mapInfo.mapHeight;
      const MAX_Y = 0;

      console.log("mapInfo:", mapInfo);
      console.log("limits:", { MIN_X, MAX_X, MIN_Y, MAX_Y });

      return;
    }

    // then handle inputs
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

    let nextX = x;
    let nextY = y;

    // try X move first
    if (input.left) {
      nextX += speed;
      moved = true;
    }
    if (input.right) {
      nextX -= speed;
      moved = true;
    }

    // clamp X to map edges (same as before)
    if (mapInfo) {
      const MIN_X = mapInfo.viewWidth - mapInfo.mapWidth;
      const MAX_X = 0;
      nextX = clamp(nextX, MIN_X, MAX_X);
    }

    // if X move hits a wall, cancel X move
    if (hitsWall(nextX, y)) nextX = x;

    // try Y move
    if (input.up) {
      nextY += speed;
      moved = true;
    }
    if (input.down) {
      nextY -= speed;
      moved = true;
    }

    // clamp Y to map edges
    if (mapInfo) {
      const MIN_Y = mapInfo.viewHeight - mapInfo.mapHeight;
      const MAX_Y = 0;
      nextY = clamp(nextY, MIN_Y, MAX_Y);
    }

    // if Y move hits a wall, cancel Y move
    if (hitsWall(nextX, nextY)) nextY = y;

    // commit
    x = nextX;
    y = nextY;

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
