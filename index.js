//2:41
const canvas = document.querySelector("canvas");

const c = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 576;

const collisionsMap = [];
for (let i = 0; i < collisions.length; i += 70) {
  collisionsMap.push(collisions.slice(i, i + 70));
}

class Boundary {
  static width = 48;
  static height = 48;
  constructor({ position }) {
    this.position = position;
    this.width = 48;
    this.height = 48;
  }

  draw() {
    c.fillStyle = "red";
    c.fillRect(this.position.x, this.position.y, this.width, this.height);
  }
}
const offset = {
  x: -735,
  y: -600,
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
        })
      );
    }
  });
});

const image = new Image();
image.src = "./images/Pellet Town.png";

const playerImage = new Image();
playerImage.src = "./images/playerDown.png";

class Sprite {
  constructor({ position, image, frames = { max: 1 } }) {
    this.position = position;
    this.image = image;
    this.frames = frames;
  }

  draw() {
    c.drawImage(
      this.image,
      0,
      0,
      this.image.width / this.frames.max,
      this.image.height,
      this.position.x,
      this.position.y,
      // canvas.width / 2 - this.image.width / 8,
      // canvas.height / 2 - this.image.height / 2,
      // this.image.width / 4,
      this.image.width / this.frames.max,
      this.image.height
    );
  }
}

const player = new Sprite({
  position: {
    x: canvas.width / 2 - 192 / 8,
    y: canvas.height / 2 - 68 / 2,
  },
  image: playerImage,
  frames: {
    max: 4,
  },
});

const background = new Sprite({
  position: {
    x: offset.x,
    y: offset.y,
  },
  image: image,
});

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
const testBoundary = new Boundary({
  position: {
    x: 400,
    y: 400,
  },
});

const movables = [background, testBoundary];
function animate() {
  window.requestAnimationFrame(animate);
  background.draw();
  // boundaries.forEach((boundary) => {
  //   boundary.draw();
  // });
  testBoundary.draw();
  player.draw();

  if (player.position.x + player.width) {
  }
  if (keys.ArrowUp.pressed && lastKey === "ArrowUp") {
    movables.forEach((moveable) => {
      moveable.position.y += 3;
    });
  } else if (keys.ArrowDown.pressed && lastKey === "ArrowDown") {
    movables.forEach((moveable) => {
      moveable.position.y -= 3;
    });
  } else if (keys.ArrowLeft.pressed && lastKey === "ArrowLeft") {
    movables.forEach((moveable) => {
      moveable.position.x += 3;
    });
  } else if (keys.ArrowRight.pressed && lastKey === "ArrowRight") {
    movables.forEach((moveable) => {
      moveable.position.x -= 3;
    });
  }
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
