export default class Economy {
  constructor(scene) {
    this.scene = scene;
    this.resources = { food: 200, stone: 150, gold: 100, wood: 200 };
    this.createUI();
  }

  createUI() {
    const centerX = window.innerWidth / 2;
    // UI Bakgrund - Centrerad i toppen
    this.uiBg = this.scene.add.image(centerX, 0, "ui_recdisplay")
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100000);

    const style = { fontSize: '18px', fill: '#ffffff', fontWeight: 'bold' };
    
    // Justerade koordinater för att matcha rutorna i din bild (image_48f34d.png)
    this.texts = {
      food: this.scene.add.text(centerX - 175, 38, "200", style).setOrigin(0.5).setScrollFactor(0).setDepth(100001),
      stone: this.scene.add.text(centerX - 58, 38, "150", style).setOrigin(0.5).setScrollFactor(0).setDepth(100001),
      gold: this.scene.add.text(centerX + 62, 38, "100", style).setOrigin(0.5).setScrollFactor(0).setDepth(100001),
      wood: this.scene.add.text(centerX + 185, 38, "200", style).setOrigin(0.5).setScrollFactor(0).setDepth(100001)
    };
  }

  addResource(type, amount) {
    const key = type === 'forest' ? 'wood' : type;
    if (this.resources[key] !== undefined) {
      this.resources[key] += amount;
      this.texts[key].setText(Math.floor(this.resources[key]));
    }
  }

  updateUIPosition() {
    const centerX = window.innerWidth / 2;
    this.uiBg.x = centerX;
    this.texts.food.x = centerX - 175;
    this.texts.stone.x = centerX - 58;
    this.texts.gold.x = centerX + 62;
    this.texts.wood.x = centerX + 185;
  }
}