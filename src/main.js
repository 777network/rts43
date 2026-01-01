import Phaser from "phaser";
import MainScene from "./MainScene.js";

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
        mode: Phaser.Scale.RESIZE, // Viktigt för att synka musen
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%'
    },
  pixelArt: true,
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

const game = new Phaser.Game(config);

// Detta lyssnar på om du ändrar storlek på webbläsarfönstret manuellt
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
