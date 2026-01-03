const canvas = document.querySelector("canvas");

const c = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 576;

c.fillStyle = "white";
c.fillRect(0, 0, canvas.width, canvas.height);

const image = new Image();
image.src = "./images/Pellet Town.png";

const playerImage = new Image();
playerImage.src = "./images/playerDown.png";

class Sprite {
  constructor({ position, velocity }) {
    this.position = position;
  }
}

function animate() {
  window.requestAnimationFrame(animate);

  image.onload = () => {
    c.drawImage(image, -735, -600);

    c.drawImage(
      playerImage,
      0,
      0,
      playerImage.width / 4,
      playerImage.height,
      canvas.width / 2 - playerImage.width / 8,
      canvas.height / 2 - playerImage.height / 2,
      playerImage.width / 4,
      playerImage.height
    );
  };
}

animate();
window.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "w":
    case "ArrowUp":
      console.log("Pressed w");
      break;
    case "a":
    case "ArrowLeft":
      console.log("Pressed a");
      break;
    case "s":
    case "ArrowDown":
      console.log("Pressed s");
      break;
    case "d":
    case "ArrowRight":
      console.log("Pressed d");
      break;
  }
});
