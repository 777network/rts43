export default class Unit {
  constructor(scene, x, y, texture) {
    this.scene = scene;
    
    // Skapa spriten
    this.sprite = scene.add.sprite(x, y, texture).setOrigin(0.5, 0.9);
    this.sprite.setDepth(y);
    
    this.speed = 120;
    this.target = null;
    this.currentState = "idle";
    this.currentDir = "down";
    
    // Markeringsring
    this.ring = scene.add.graphics();
    this.ring.lineStyle(2, 0xffffff, 1).strokeCircle(0, 0, 22).setVisible(false);
  }

  setSelected(val) {
    this.ring.setVisible(val);
  }

  moveTo(x, y) {
    this.target = { x, y };
    this.currentState = "walk";
  }

  update(delta, tileMap) {
    // Ring följer gubben
    this.ring.setPosition(this.sprite.x, this.sprite.y);
    this.ring.setDepth(this.sprite.depth - 1);

    if (!this.target) {
      this.playAnim();
      return;
    }

    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Stanna om vi är framme
    if (dist < 5) {
      this.target = null;
      this.currentState = "idle";
      this.playAnim();
      return;
    }

    // Välj en av dina 8 riktningar baserat på vinkel
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this.calculateDirection(angle);

    // Beräkna nästa steg
    const step = (this.speed * delta) / 1000;
    const vx = (dx / dist) * step;
    const vy = (dy / dist) * step;

    const nextX = this.sprite.x + vx;
    const nextY = this.sprite.y + vy;

    // Kollisionskontroll mot TileMap
    if (tileMap.isWalkableWorld(nextX, nextY)) {
      this.sprite.x = nextX;
      this.sprite.y = nextY;
      this.sprite.setDepth(this.sprite.y);
    } else {
      // Om vägen är blockerad, stanna (eller så kan man lägga till pathfinding senare)
      this.target = null;
      this.currentState = "idle";
    }

    this.playAnim();
  }

  calculateDirection(deg) {
    // Mappar grader till dina filnamn
    if (deg >= -22.5 && deg < 22.5) this.currentDir = "right";
    else if (deg >= 22.5 && deg < 67.5) this.currentDir = "down_right";
    else if (deg >= 67.5 && deg < 112.5) this.currentDir = "down";
    else if (deg >= 112.5 && deg < 157.5) this.currentDir = "down_left";
    else if (deg >= 157.5 || deg < -157.5) this.currentDir = "left";
    else if (deg >= -157.5 && deg < -112.5) this.currentDir = "up_left";
    else if (deg >= -112.5 && deg < -67.5) this.currentDir = "up";
    else if (deg >= -67.5 && deg < -22.5) this.currentDir = "up_right";
  }

  playAnim() {
    const animKey = `villager_${this.currentState}_${this.currentDir}`;
    
    // Spela bara om animationen existerar (förhindrar krasch)
    if (this.scene.anims.exists(animKey)) {
      this.sprite.play(animKey, true);
    }
  }
}