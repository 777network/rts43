export default class Unit {
  constructor(scene, x, y, baseTextureKey) {
    this.scene = scene;

    // Sprite måste vara en sprite (inte image) för animationer
    this.sprite = scene.add
      .sprite(x, y, baseTextureKey)
      .setOrigin(0.5, 0.9); // stå på “fötterna”
    this.sprite.setDepth(this.sprite.y);

    this.speed = 90; // px per sekund
    this.target = null;

    this.currentDirection = "down";
    this.currentState = "idle"; // "idle" | "walk"
    this.isSelected = false;

    // Selection ring
    this.selectionRing = scene.add.graphics();
    this.selectionRing.lineStyle(2, 0xffffff, 1);
    this.selectionRing.strokeCircle(0, 0, 24);
    this.selectionRing.setVisible(false);
    this.selectionRing.setDepth(this.sprite.depth - 1);
  }

  setSelected(selected) {
    this.isSelected = selected;
    this.selectionRing.setVisible(selected);
  }

  moveTo(x, y) {
    this.target = { x, y };
    this.currentState = "walk";
  }

  stop() {
    this.target = null;
    this.currentState = "idle";
    this.playAnimation();
  }

  update(delta, tileMap) {
    // Synca selectionringen med spriteposition
    this.selectionRing.x = this.sprite.x;
    this.selectionRing.y = this.sprite.y;

    if (!this.target) {
      this.currentState = "idle";
      this.playAnimation();
      return;
    }

    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      this.stop();
      return;
    }

    const step = (this.speed * delta) / 1000;
    const vx = (dx / dist) * step;
    const vy = (dy / dist) * step;

    const nextX = this.sprite.x + vx;
    const nextY = this.sprite.y + vy;

    // Kolla om nästa position är gångbar (inte guld/sten/mat/träd)
    if (!tileMap.isWalkableWorld(nextX, nextY)) {
      this.stop();
      return;
    }

    this.sprite.x = nextX;
    this.sprite.y = nextY;
    this.sprite.setDepth(this.sprite.y);

    this.updateDirection(dx, dy);
    this.currentState = "walk";
    this.playAnimation();
  }

  updateDirection(dx, dy) {
    const angle = Math.atan2(dy, dx);

    if (angle >= -Math.PI / 8 && angle < Math.PI / 8)
      this.currentDirection = "right";
    else if (angle >= Math.PI / 8 && angle < (3 * Math.PI) / 8)
      this.currentDirection = "down_right";
    else if (angle >= (3 * Math.PI) / 8 && angle < (5 * Math.PI) / 8)
      this.currentDirection = "down";
    else if (angle >= (5 * Math.PI) / 8 && angle < (7 * Math.PI) / 8)
      this.currentDirection = "down_left";
    else if (angle >= (7 * Math.PI) / 8 || angle < (-7 * Math.PI) / 8)
      this.currentDirection = "left";
    else if (angle >= (-7 * Math.PI) / 8 && angle < (-5 * Math.PI) / 8)
      this.currentDirection = "up_left";
    else if (angle >= (-5 * Math.PI) / 8 && angle < (-3 * Math.PI) / 8)
      this.currentDirection = "up";
    else if (angle >= (-3 * Math.PI) / 8 && angle < -Math.PI / 8)
      this.currentDirection = "up_right";
  }

  playAnimation() {
    const dir = this.currentDirection;
    if (this.currentState === "walk") {
      this.sprite.play(`villager_walk_${dir}`, true);
    } else {
      this.sprite.play(`villager_idle_${dir}`, true);
    }
  }
}
