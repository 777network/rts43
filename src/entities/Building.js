export default class Building {
  constructor(scene, x, y, spriteKey) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    this.sprite = scene.add.image(x, y, spriteKey).setOrigin(0.5);
  }
}

