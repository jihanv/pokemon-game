//3:40
const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 576;
let serverCam = { x: null, y: null };
//
const socket = new WebSocket("ws://localhost:8080");

socket.addEventListener("open", () => {
  console.log("✅ connected to websocket server");

  // Send input 20 times/second (every 50ms)
  setInterval(() => {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(
      JSON.stringify({
        type: "input",
        up: keys.ArrowUp.pressed,
        down: keys.ArrowDown.pressed,
        left: keys.ArrowLeft.pressed,
        right: keys.ArrowRight.pressed,
        lastKey, // optional but helpful for debugging
      }),
    );
  }, 50);
});

socket.addEventListener("message", (event) => {
  console.log("from server:", event.data);
});

socket.addEventListener("close", () => {
  console.log("disconnected from server");
});

socket.addEventListener("error", (err) => {
  console.log("websocket error", err);
});

socket.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type !== "state") return;

  serverCam.x = msg.x;
  serverCam.y = msg.y;

  targetCam.x = msg.x;
  targetCam.y = msg.y;
});
//

const collisionsMap = [];
for (let i = 0; i < collisions.length; i += 70) {
  collisionsMap.push(collisions.slice(i, i + 70));
}

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

  // how quickly you chase the server target (0.1–0.3 is a good start)
  const t = 0.2;

  const nextX = lerp(background.position.x, targetCam.x, t);
  const nextY = lerp(background.position.y, targetCam.y, t);

  const dx = nextX - background.position.x;
  const dy = nextY - background.position.y;

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
  if (keys.ArrowUp.pressed && lastKey === "ArrowUp") {
    player.moving = true;
    player.image = player.sprites.up;
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      if (
        rectangularyCollision({
          rectangle1: player,
          rectangle2: {
            ...boundary,
            position: {
              x: boundary.position.x,
              y: boundary.position.y + 3,
            },
          },
        })
      ) {
        moving = false;
        break;
      }
    }
    if (moving)
      // movables.forEach((moveable) => {
      //   moveable.position.y += 3;
      // });
      console.log("hi");
  } else if (keys.ArrowDown.pressed && lastKey === "ArrowDown") {
    player.moving = true;
    player.image = player.sprites.down;
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      if (
        rectangularyCollision({
          rectangle1: player,
          rectangle2: {
            ...boundary,
            position: {
              x: boundary.position.x,
              y: boundary.position.y - 3,
            },
          },
        })
      ) {
        moving = false;
        break;
      }
    }
    if (moving)
      // movables.forEach((moveable) => {
      //   moveable.position.y -= 3;
      // });
      console.log("hi");
  } else if (keys.ArrowLeft.pressed && lastKey === "ArrowLeft") {
    player.moving = true;
    player.image = player.sprites.left;
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      if (
        rectangularyCollision({
          rectangle1: player,
          rectangle2: {
            ...boundary,
            position: {
              x: boundary.position.x + 3,
              y: boundary.position.y,
            },
          },
        })
      ) {
        moving = false;
        break;
      }
    }
    if (moving)
      // movables.forEach((moveable) => {
      //   moveable.position.x += 3;
      // });
      console.log("hi");
  } else if (keys.ArrowRight.pressed && lastKey === "ArrowRight") {
    player.image = player.sprites.right;
    player.moving = true;
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      if (
        rectangularyCollision({
          rectangle1: player,
          rectangle2: {
            ...boundary,
            position: {
              x: boundary.position.x - 3,
              y: boundary.position.y,
            },
          },
        })
      ) {
        moving = false;
        break;
      }
    }
    if (moving)
      // movables.forEach((moveable) => {
      //   moveable.position.x -= 3;
      // });
      console.log("hi");
  }
  // debug overlay (put this at the bottom of animate())
  c.save();
  c.font = "16px monospace";
  c.fillStyle = "white";
  c.fillText(
    `clientCam: ${background.position.x}, ${background.position.y}`,
    10,
    20,
  );
  c.fillText(`serverCam: ${serverCam.x}, ${serverCam.y}`, 10, 40);

  if (serverCam.x !== null) {
    c.fillText(
      `diff: ${background.position.x - serverCam.x}, ${background.position.y - serverCam.y}`,
      10,
      60,
    );
  }
  c.restore();
}

animate();

let lastKey = "";

window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      keys.ArrowUp.pressed = true;
      lastKey = "ArrowUp";
      break;
    case "ArrowLeft":
      keys.ArrowLeft.pressed = true;
      lastKey = "ArrowLeft";
      break;
    case "ArrowDown":
      keys.ArrowDown.pressed = true;
      lastKey = "ArrowDown";
      break;
    case "ArrowRight":
      keys.ArrowRight.pressed = true;
      lastKey = "ArrowRight";
      break;
  }
});

window.addEventListener("keyup", (e) => {
  switch (e.key) {
    case "ArrowUp":
      keys.ArrowUp.pressed = false;
      break;
    case "ArrowLeft":
      keys.ArrowLeft.pressed = false;
      break;
    case "ArrowDown":
      keys.ArrowDown.pressed = false;
      break;
    case "ArrowRight":
      keys.ArrowRight.pressed = false;
      break;
  }
});
