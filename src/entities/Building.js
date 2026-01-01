export default class Building {
  constructor(scene, x, y, spriteKey) {
    this.scene = scene;
    this.x = x;
    this.y = y;

    // Vi sätter origin till 0.5 på X och 0.8 på Y för en bra 2.5D-känsla
    this.sprite = scene.add.image(x, y, spriteKey).setOrigin(0.5, 0.8);
    
    // Viktigt för att byggnaden ska ligga ovanpå gräset
    this.sprite.setDepth(y);
  }
}