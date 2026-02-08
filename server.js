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

const PORT = process.env.PORT || 8080;
// const PORT = 8080;

// Some hosts want you listening on all interfaces (0.0.0.0)
const wss = new WebSocket.Server({ port: PORT, host: "0.0.0.0" });

// NEW: global player registry
let nextPlayerId = 1;
const players = new Map(); // id -> ws

const playerData = new Map(); // id -> { worldX, worldY }

function broadcastPlayers() {
  const list = Array.from(playerData.entries()).map(([id, p]) => ({
    id,
    worldX: p.worldX,
    worldY: p.worldY,
    dir: p.dir,
    moving: p.moving,
  }));

  const payload = JSON.stringify({ type: "players", players: list });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}
setInterval(broadcastPlayers, 50);
const SPAWN_POINTS = [
  { worldX: -800, worldY: -800 }, // player 2
  { worldX: 580, worldY: 500 }, // player 3
  { worldX: 420, worldY: 500 }, // player 4
];
wss.on("connection", (ws) => {
  console.log("client connected");

  const id = String(nextPlayerId++);
  players.set(id, ws);

  console.log("client connected:", id, "total:", players.size);

  let seq = 0;
  ws.send(JSON.stringify({ type: "init", id })); // NEW: tell client its id

  // camera offset starts where your client starts

  // let x = -735;
  // let y = -640;

  let mapInfo = {
    mapWidth: MAP_COLS * TILE_SIZE,
    mapHeight: (collisions.length / MAP_COLS) * TILE_SIZE,
    viewWidth: 1024,
    viewHeight: 576,
  };
  console.log("🗺️ server mapInfo:", mapInfo);

  const playerRect = {
    x: 0,
    y: 0,
    w: 48,
    h: 68,
  };

  function updatePlayerRect() {
    // matches your client: x = canvas.width/2 - 192/8, y = canvas.height/2 - 68/2
    playerRect.x = mapInfo.viewWidth / 2 - 192 / 8;
    playerRect.y = mapInfo.viewHeight / 2 - 68 / 2;
  }

  function hitsPlayer(camX, camY) {
    // my candidate world rect if camera were at (camX, camY)
    const myWorldX = playerRect.x - camX;
    const myWorldY = playerRect.y - camY;

    const myLeft = myWorldX;
    const myRight = myWorldX + playerRect.w;
    const myTop = myWorldY;
    const myBottom = myWorldY + playerRect.h;

    for (const [otherId, p] of playerData.entries()) {
      if (otherId === id) continue; // don't collide with myself
      if (!p) continue;

      const otherLeft = p.worldX;
      const otherRight = p.worldX + playerRect.w;
      const otherTop = p.worldY;
      const otherBottom = p.worldY + playerRect.h;

      const overlaps =
        myLeft < otherRight &&
        myRight > otherLeft &&
        myTop < otherBottom &&
        myBottom > otherTop;

      if (overlaps) return true;
    }

    return false;
  }

  // call once using current mapInfo defaults
  updatePlayerRect();
  // camera offset starts where your client starts
  // BUT: each player gets a different spawn world position to avoid overlapping

  let x, y;

  if (id === "1") {
    // Player 1: fixed, legacy spawn
    x = -735;
    y = -640;
  } else {
    // Player 2+: independent spawn points
    const spawnIndex = (Number(id) - 2) % SPAWN_POINTS.length;
    const spawn = SPAWN_POINTS[spawnIndex];

    // convert world position → camera offset
    x = playerRect.x - spawn.worldX;
    y = playerRect.y - spawn.worldY;
  }
  //

  //
  const MIN_X = mapInfo.viewWidth - mapInfo.mapWidth;
  const MAX_X = 0;
  const MIN_Y = mapInfo.viewHeight - mapInfo.mapHeight;
  const MAX_Y = 0;
  console.log("limits after viewInfo:", { MIN_X, MAX_X, MIN_Y, MAX_Y });
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

  let lastKey = "ArrowDown";
  let dir = "down";

  // send initial state once
  const worldX = playerRect.x - x;
  const worldY = playerRect.y - y;
  ws.send(
    JSON.stringify({ type: "state", id, x, y, worldX, worldY, seq: ++seq }),
  );

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === "viewInfo") {
      mapInfo.viewWidth = msg.viewWidth;
      mapInfo.viewHeight = msg.viewHeight;

      updatePlayerRect();
      console.log("🖥️ updated view:", mapInfo.viewWidth, mapInfo.viewHeight);
      console.log("🧍 playerRect:", playerRect);
      const MIN_X = mapInfo.viewWidth - mapInfo.mapWidth;
      const MAX_X = 0;
      const MIN_Y = mapInfo.viewHeight - mapInfo.mapHeight;
      const MAX_Y = 0;
      console.log("limits after viewInfo:", { MIN_X, MAX_X, MIN_Y, MAX_Y });
      return;
    }

    // then handle inputs
    if (msg.type !== "input") return;

    input.up = !!msg.up;
    input.down = !!msg.down;
    input.left = !!msg.left;
    input.right = !!msg.right;

    // NEW: keep lastKey if the client sent it
    if (msg.lastKey) lastKey = msg.lastKey;
  });

  const SPEED_PX_PER_SEC = 180; // same as 9px per 50ms (9 * 20 = 180)
  let lastTime = Date.now();

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const tick = setInterval(() => {
    const now = Date.now();
    let dt = (now - lastTime) / 1000; // seconds
    lastTime = now;

    // cap dt so a lag spike doesn't jump too far
    dt = Math.min(dt, 0.1);

    const step = SPEED_PX_PER_SEC * dt;

    // --- NEW: substeps ---
    const MAX_SUBSTEP = 3; // pixels per mini-step
    const steps = Math.ceil(step / MAX_SUBSTEP);
    const subStep = step / steps;

    let moved = false;

    for (let i = 0; i < steps; i++) {
      // try X
      let nextX = x;
      if (input.left) {
        nextX += subStep;
        moved = true;
      }
      if (input.right) {
        nextX -= subStep;
        moved = true;
      }

      // clamp X
      if (mapInfo) {
        const MIN_X = mapInfo.viewWidth - mapInfo.mapWidth;
        const MAX_X = 0;
        nextX = clamp(nextX, MIN_X, MAX_X);
      }

      // commit X only if not hitting wall
      if (!hitsWall(nextX, y) && !hitsPlayer(nextX, y)) x = nextX;

      // try Y
      let nextY = y;
      if (input.up) {
        nextY += subStep;
        moved = true;
      }
      if (input.down) {
        nextY -= subStep;
        moved = true;
      }

      // clamp Y
      if (mapInfo) {
        const MIN_Y = mapInfo.viewHeight - mapInfo.mapHeight;
        const MAX_Y = 0;
        nextY = clamp(nextY, MIN_Y, MAX_Y);
      }

      // commit Y only if not hitting wall (use updated x)
      if (!hitsWall(x, nextY) && !hitsPlayer(x, nextY)) y = nextY;
    }

    // compute world position every tick
    const worldX = playerRect.x - x;
    const worldY = playerRect.y - y;

    // keep your existing direction logic (same as you already have)
    if (lastKey === "ArrowUp") dir = "up";
    else if (lastKey === "ArrowDown") dir = "down";
    else if (lastKey === "ArrowLeft") dir = "left";
    else if (lastKey === "ArrowRight") dir = "right";

    // update shared player data every tick (so others learn when you stop)
    playerData.set(id, { worldX, worldY, dir, moving: moved });

    if (ws.readyState === ws.OPEN) {
      // keep your bandwidth-saving idea: only send personal state when moved
      if (moved) {
        ws.send(
          JSON.stringify({
            type: "state",
            id,
            x,
            y,
            worldX,
            worldY,
            seq: ++seq,
          }),
        );
      }

      // but broadcast players every tick so "moving: false" gets sent too
    }
  }, 50);

  ws.on("close", () => {
    clearInterval(tick);

    players.delete(id);

    // NEW:
    playerData.delete(id);
    broadcastPlayers();

    console.log("👋 client disconnected:", id, "total:", players.size);
  });
});

console.log("🚀 WebSocket server running on ws://localhost:8080");
