import Phaser from "phaser";

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: "UIScene", active: true });
  }

  preload() {
    this.load.image("ui_recdisplay", "assets/UI/ui_recdisplay.png");
  }

create() {
    const width = this.scale.width;
    this.bg = this.add.image(width / 2, 0, "ui_recdisplay").setOrigin(0.5, 0).setScale(0.5);

    const style = { 
        fontSize: '15px', 
        fill: '#ffffff', 
        fontWeight: 'bold', 
        fontFamily: 'monospace', // Monospace gör att siffror inte hoppar när de ändras
        align: 'center'
    };
    
    // Y=32 brukar vara "sweet spot" för den här grafiken i 0.5 skala
    const yPos = 28; 

    // Finjusterade X-koordinater för att pricka mitten av de grå boxarna
    this.foodText = this.add.text(width / 2 - 178, yPos, "200", style).setOrigin(0.5);
    this.stoneText = this.add.text(width / 2 - 59, yPos, "150", style).setOrigin(0.5);
    this.goldText = this.add.text(width / 2 + 62, yPos, "100", style).setOrigin(0.5);
    this.woodText = this.add.text(width / 2 + 197, yPos, "200", style).setOrigin(0.5);

    const gameScene = this.scene.get("MainScene");
    gameScene.events.on("updateResources", (resources) => {
      this.foodText.setText(Math.floor(resources.food));
      this.stoneText.setText(Math.floor(resources.stone));
      this.goldText.setText(Math.floor(resources.gold));
      this.woodText.setText(Math.floor(resources.wood));
    });
  }
}