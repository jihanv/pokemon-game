//3:40
const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 576;
let serverCam = { x: null, y: null };
let lastSeq = null;
let myId = null; // put this near the top of your file once
let playersFromServer = []; // [{id, worldX, worldY}, ...]
let lastMovingById = new Map(); // id -> true/false
const otherRender = new Map();
const SPEED_PX_PER_SEC = 180; // must match server SPEED_PX_PER_SEC :contentReference[oaicite:3]{index=3}
let lastFrameTime = performance.now();
//

function fitCanvasToWindow() {
  let scale = Math.min(
    window.innerWidth / canvas.width,
    window.innerHeight / canvas.height,
  );

  if (scale >= 1) scale = Math.floor(scale);

  // ✅ THIS is the missing part:
  canvas.style.width = `${canvas.width * scale}px`;
  canvas.style.height = `${canvas.height * scale}px`;

  canvas.style.position = "absolute";
  canvas.style.left = "50%";
  canvas.style.top = "50%";
  canvas.style.transform = "translate(-50%, -50%)";

  console.log("fitCanvasToWindow", {
    scale,
    cssW: canvas.style.width,
    cssH: canvas.style.height,
  });
}
fitCanvasToWindow();

// const socket = new WebSocket("ws://localhost:8080");

const socket = new WebSocket("wss://pokemon-game-production.up.railway.app");
const collisionsMap = [];
for (let i = 0; i < collisions.length; i += 70) {
  collisionsMap.push(collisions.slice(i, i + 70));
}
// compute map size
const mapWidth = collisionsMap[0].length * Boundary.width;
const mapHeight = collisionsMap.length * Boundary.height;

socket.addEventListener("open", () => {
  console.log("connected to websocket server");

  sendViewInfo();
  // socket.send(
  //   JSON.stringify({
  //     type: "viewInfo",
  //     viewWidth: canvas.width,
  //     viewHeight: canvas.height,
  //   }),
  // );

  // Send mapsize
  // socket.send(
  //   JSON.stringify({
  //     type: "mapInfo",
  //     mapWidth,
  //     mapHeight,
  //     viewWidth: canvas.width, // 1024 :contentReference[oaicite:2]{index=2}
  //     viewHeight: canvas.height, // 576  :contentReference[oaicite:3]{index=3}
  //   }),
  // );
});

socket.addEventListener("close", () => {
  console.log("disconnected from server");
});

socket.addEventListener("error", (err) => {
  console.log("websocket error", err);
});

socket.addEventListener("message", (event) => {
  let msg;
  try {
    msg = JSON.parse(event.data);
  } catch {
    console.log("non-json from server:", event.data);
    return;
  }

  if (msg.type === "init") {
    myId = msg.id;
    console.log("CONNECTED as id:", myId);
    return;
  }

  if (msg.type === "players") {
    playersFromServer = msg.players;

    // Update "targets" for smoothing
    const seen = new Set();

    msg.players.forEach((p) => {
      seen.add(p.id);

      // keep your debug log (optional)
      const prevMoving = lastMovingById.get(p.id);
      if (prevMoving !== p.moving) {
        console.log("moving changed:", p.id, "=>", p.moving);
        lastMovingById.set(p.id, p.moving);
      }

      // ignore myself
      if (p.id === myId) return;

      const s = otherRender.get(p.id);
      if (!s) {
        // first time seeing this player: start render position at target
        otherRender.set(p.id, {
          x: p.worldX,
          y: p.worldY,
          tx: p.worldX,
          ty: p.worldY,
          dir: p.dir,
          moving: p.moving,
        });
      } else {
        // update targets; render (x,y) will ease toward them each frame
        s.tx = p.worldX;
        s.ty = p.worldY;
        s.dir = p.dir;
        s.moving = p.moving;
      }
    });

    // Remove players that disappeared (disconnected)
    for (const id of otherRender.keys()) {
      if (!seen.has(id)) {
        otherRender.delete(id);
        lastMovingById.delete(id); // clean up movement state
        console.log("🧹 removed player", id);
      }
    }

    return;
  }

  if (msg.type === "state") {
    // authoritative camera from server (truth)
    serverCam.x = msg.x;
    serverCam.y = msg.y;

    // sequence bookkeeping (optional)
    if (msg.seq != null) {
      if (lastSeq != null && msg.seq !== lastSeq + 1) {
        console.log("⚠️ missed/out-of-order state?", { lastSeq, got: msg.seq });
      }
      lastSeq = msg.seq;
    }

    // ✅ reconciliation: only correct if we drifted noticeably
    // (small drift is normal due to timing differences)
    const DRIFT_SNAP_PX = 10; // tune 6–16
    const dx = serverCam.x - targetCam.x;
    const dy = serverCam.y - targetCam.y;

    if (Math.abs(dx) > DRIFT_SNAP_PX || Math.abs(dy) > DRIFT_SNAP_PX) {
      // snap to server
      targetCam.x = serverCam.x;
      targetCam.y = serverCam.y;
    }
  }
});
//

const battleZonesMap = [];
for (let i = 0; i < battleZonesData.length; i += 70) {
  battleZonesMap.push(battleZonesData.slice(i, i + 70));
}
// console.log(battleZonesMap);

const offset = {
  x: -735,
  y: -640,
};

const boundaries = [];

collisionsMap.forEach((row, i) => {
  row.forEach((symbol, j) => {
    if (symbol === 1025) {
      boundaries.push(
        new Boundary({
          position: {
            x: j * Boundary.width + offset.x,
            y: i * Boundary.height + offset.y,
          },
        }),
      );
    }
  });
});

const battleZones = [];

battleZonesMap.forEach((row, i) => {
  row.forEach((symbol, j) => {
    if (symbol === 1025) {
      battleZones.push(
        new Boundary({
          position: {
            x: j * Boundary.width + offset.x,
            y: i * Boundary.height + offset.y,
          },
        }),
      );
    }
  });
});

const image = new Image();
image.src = "./images/Pellet Town.png";

const foregroundImage = new Image();
foregroundImage.src = "./images/foregroundObjects.png";

const playerUpImage = new Image();
playerUpImage.src = "./images/playerUp.png";

const playerDownImage = new Image();
playerDownImage.src = "./images/playerDown.png";

const playerLeftImage = new Image();
playerLeftImage.src = "./images/playerLeft.png";

const playerRightImage = new Image();
playerRightImage.src = "./images/playerRight.png";

const player = new Sprite({
  position: {
    x: canvas.width / 2 - 192 / 8,
    y: canvas.height / 2 - 68 / 2,
  },
  image: playerDownImage,
  frames: {
    max: 4,
  },
  sprites: {
    up: playerUpImage,
    down: playerDownImage,
    left: playerLeftImage,
    right: playerRightImage,
  },
});

// Add another player (use a NEW Image object so onload doesn't get overwritten)
// Other player images (NEW Image objects so nothing overwrites onload)
const otherUpImage = new Image();
otherUpImage.src = "./images/playerUp.png";

const otherDownImage = new Image();
otherDownImage.src = "./images/playerDown.png";

const otherLeftImage = new Image();
otherLeftImage.src = "./images/playerLeft.png";

const otherRightImage = new Image();
otherRightImage.src = "./images/playerRight.png";

// A simple lookup table: dir -> image
const otherSprites = {
  up: otherUpImage,
  down: otherDownImage,
  left: otherLeftImage,
  right: otherRightImage,
};

const otherPlayerSprite = new Sprite({
  position: { x: 0, y: 0 },
  image: otherDownImage, // default
  frames: { max: 4 },
});
//
const foreground = new Sprite({
  position: {
    x: offset.x,
    y: offset.y,
  },
  image: foregroundImage,
});

const background = new Sprite({
  position: {
    x: offset.x,
    y: offset.y,
  },
  image: image,
});
let targetCam = { x: background.position.x, y: background.position.y };
const keys = {
  ArrowUp: {
    pressed: false,
  },
  ArrowLeft: {
    pressed: false,
  },
  ArrowDown: {
    pressed: false,
  },
  ArrowRight: {
    pressed: false,
  },
};

const movables = [background, ...boundaries, foreground, ...battleZones];
function rectangularyCollision({ rectangle1, rectangle2 }) {
  return (
    rectangle1.position.x + rectangle1.width >= rectangle2.position.x &&
    rectangle1.position.x <= rectangle2.position.x + rectangle2.width &&
    rectangle1.position.y <= rectangle2.position.y + rectangle2.height &&
    rectangle1.position.y + rectangle1.height >= rectangle2.position.y
  );
}
function animate() {
  window.requestAnimationFrame(animate);

  //
  c.clearRect(0, 0, canvas.width, canvas.height);
  const lerp = (a, b, t) => a + (b - a) * t;

  const now = performance.now();
  let dt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  // cap dt so a tab-switch doesn't jump you
  dt = Math.min(dt, 0.05);

  const step = SPEED_PX_PER_SEC * dt;

  // Predict next camera based on input.
  // NOTE: your world uses "camera offsets" where moving left increases cam.x (same as server).
  let nextCamX = targetCam.x;
  let nextCamY = targetCam.y;

  if (keys.ArrowLeft.pressed) nextCamX += step;
  if (keys.ArrowRight.pressed) nextCamX -= step;
  if (keys.ArrowUp.pressed) nextCamY += step;
  if (keys.ArrowDown.pressed) nextCamY -= step;

  // Clamp camera exactly like the server does
  const MIN_X = canvas.width - mapWidth;
  const MAX_X = 0;
  const MIN_Y = canvas.height - mapHeight;
  const MAX_Y = 0;

  nextCamX = Math.max(MIN_X, Math.min(MAX_X, nextCamX));
  nextCamY = Math.max(MIN_Y, Math.min(MAX_Y, nextCamY));

  // Commit prediction
  targetCam.x = nextCamX;
  targetCam.y = nextCamY;

  // Apply camera delta to all movables (no smoothing for self)
  const dx = targetCam.x - background.position.x;
  const dy = targetCam.y - background.position.y;

  movables.forEach((m) => {
    m.position.x += dx;
    m.position.y += dy;
  });
  //
  background.draw();

  boundaries.forEach((boundary) => {
    boundary.draw();
  });

  battleZones.forEach((battleZone) => {
    battleZone.draw();
  });

  // NEW: draw other players as sprites (simple)

  playersFromServer.forEach((p) => {
    if (p.id === myId) return;

    const s = otherRender.get(p.id);
    if (!s) return;

    // Smooth: move render position toward the latest server target
    const smoothT = 0.25; // try 0.15 (smoother) to 0.35 (snappier)
    s.x = lerp(s.x, s.tx, smoothT);
    s.y = lerp(s.y, s.ty, smoothT);

    const screenX = s.x + background.position.x;
    const screenY = s.y + background.position.y;

    otherPlayerSprite.image = otherSprites[s.dir] || otherSprites.down;
    otherPlayerSprite.moving = !!s.moving;

    otherPlayerSprite.position.x = screenX;
    otherPlayerSprite.position.y = screenY;
    otherPlayerSprite.draw();
  });

  //
  player.draw();

  foreground.draw();

  if (
    keys.ArrowDown.pressed ||
    keys.ArrowUp.pressed ||
    keys.ArrowRight.pressed ||
    keys.ArrowLeft.pressed
  ) {
    for (let i = 0; i < battleZones.length; i++) {
      const battleZone = battleZones[i];
      if (
        rectangularyCollision({
          rectangle1: player,
          rectangle2: battleZone,
        })
      ) {
        break;
      }
    }
  }

  let moving = true;
  player.moving = false;
  // --- player animation based on input (no collisions here) ---
  player.moving = false;

  if (keys.ArrowUp.pressed) {
    player.image = player.sprites.up;
    player.moving = true;
  } else if (keys.ArrowDown.pressed) {
    player.image = player.sprites.down;
    player.moving = true;
  } else if (keys.ArrowLeft.pressed) {
    player.image = player.sprites.left;
    player.moving = true;
  } else if (keys.ArrowRight.pressed) {
    player.image = player.sprites.right;
    player.moving = true;
  }
  // debug overlay (put this at the bottom of animate())
  c.save();
  c.restore();
}

animate();
function sendInput() {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(
    JSON.stringify({
      type: "input",
      up: keys.ArrowUp.pressed,
      down: keys.ArrowDown.pressed,
      left: keys.ArrowLeft.pressed,
      right: keys.ArrowRight.pressed,
      lastKey,
    }),
  );
}

function sendViewInfo() {
  console.log("📤 sending viewInfo:", canvas.width, canvas.height); // <- add this

  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(
    JSON.stringify({
      type: "viewInfo",
      viewWidth: canvas.width,
      viewHeight: canvas.height,
    }),
  );
}

window.addEventListener("blur", () => {
  keys.ArrowUp.pressed = false;
  keys.ArrowDown.pressed = false;
  keys.ArrowLeft.pressed = false;
  keys.ArrowRight.pressed = false;

  // optional: also clear lastKey
  // lastKey = "";

  sendInput(); // tell server "all keys released"
});

let lastKey = "";

window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      keys.ArrowUp.pressed = true;
      lastKey = "ArrowUp";
      sendInput();
      break;
    case "ArrowLeft":
      keys.ArrowLeft.pressed = true;
      lastKey = "ArrowLeft";
      sendInput();
      break;
    case "ArrowDown":
      keys.ArrowDown.pressed = true;
      lastKey = "ArrowDown";
      sendInput();
      break;
    case "ArrowRight":
      keys.ArrowRight.pressed = true;
      lastKey = "ArrowRight";
      sendInput();
      break;
  }
});

window.addEventListener("keyup", (e) => {
  switch (e.key) {
    case "ArrowUp":
      keys.ArrowUp.pressed = false;
      sendInput();
      break;
    case "ArrowLeft":
      keys.ArrowLeft.pressed = false;
      sendInput();
      break;
    case "ArrowDown":
      keys.ArrowDown.pressed = false;
      sendInput();
      break;
    case "ArrowRight":
      keys.ArrowRight.pressed = false;
      sendInput();
      break;
  }
});

window.addEventListener("resize", () => {
  fitCanvasToWindow();
  sendViewInfo();
});
