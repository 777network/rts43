import Phaser from "phaser";
import MainScene from "./MainScene.js";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game",
  backgroundColor: "#000000",
  scene: [MainScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
};

new Phaser.Game(config);
