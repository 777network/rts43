export default class Unit {
  constructor(scene, x, y, texture) {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, texture).setOrigin(0.5, 0.9);
    this.sprite.setDepth(y);
    this.speed = 120;
    this.path = [];
    this.target = null;
    this.currentState = "idle";
    this.currentDir = "down";
    this.ring = scene.add.graphics().lineStyle(2, 0xffffff).strokeCircle(0, 0, 20).setVisible(false);
  }

  setSelected(val) { this.ring.setVisible(val); }

  findPathTo(targetX, targetY, tileMap) {
    const start = tileMap.worldToTile(this.sprite.x, this.sprite.y);
    const end = tileMap.worldToTile(targetX, targetY);
    const path = this.getAStarPath(start, end, tileMap);
    if (path && path.length > 0) {
      this.path = path.map(p => ({
        x: p.x * tileMap.tileSize + tileMap.tileSize / 2,
        y: p.y * tileMap.tileSize + tileMap.tileSize / 2
      }));
      this.target = this.path.shift();
      this.currentState = "walk";
    }
  }

  getAStarPath(start, end, tileMap) {
    let openList = [start];
    let closedList = new Set();
    let cameFrom = new Map();
    let gScore = new Map();
    let fScore = new Map();
    const key = (p) => `${p.tx},${p.ty}`;
    gScore.set(key(start), 0);
    fScore.set(key(start), Math.abs(start.tx - end.tx) + Math.abs(start.ty - end.ty));

    while (openList.length > 0) {
      openList.sort((a, b) => fScore.get(key(a)) - fScore.get(key(b)));
      let current = openList.shift();
      if (current.tx === end.tx && current.ty === end.ty) {
        let path = [];
        while (cameFrom.has(key(current))) {
          path.push({ x: current.tx, y: current.ty });
          current = cameFrom.get(key(current));
        }
        return path.reverse();
      }
      closedList.add(key(current));
      const neighbors = [
        { tx: current.tx + 1, ty: current.ty }, { tx: current.tx - 1, ty: current.ty },
        { tx: current.tx, ty: current.ty + 1 }, { tx: current.tx, ty: current.ty - 1 },
        { tx: current.tx + 1, ty: current.ty + 1 }, { tx: current.tx - 1, ty: current.ty - 1 }
      ];
      for (let neighbor of neighbors) {
        if (!tileMap.isWalkableTile(neighbor.tx, neighbor.ty) || closedList.has(key(neighbor))) continue;
        let tentativeGScore = gScore.get(key(current)) + 1;
        if (!gScore.has(key(neighbor)) || tentativeGScore < gScore.get(key(neighbor))) {
          cameFrom.set(key(neighbor), current);
          gScore.set(key(neighbor), tentativeGScore);
          fScore.set(key(neighbor), tentativeGScore + Math.abs(neighbor.tx - end.tx) + Math.abs(neighbor.ty - end.ty));
          if (!openList.some(p => p.tx === neighbor.tx && p.ty === neighbor.ty)) openList.push(neighbor);
        }
      }
    }
    return null;
  }

  update(delta, tileMap, allUnits) {
    this.ring.setPosition(this.sprite.x, this.sprite.y).setDepth(this.sprite.depth - 1);
    if (!this.target) { this.playAnim(); return; }
    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      if (this.path.length > 0) this.target = this.path.shift();
      else { this.target = null; this.currentState = "idle"; }
      return;
    }

    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    this.calculateDirection(angle);
    const step = (this.speed * delta) / 1000;
    let vx = (dx / dist) * step;
    let vy = (dy / dist) * step;

    // Separation: Gå inte in i varandra
    allUnits.forEach(other => {
      if (other === this) return;
      const d = Phaser.Math.Distance.Between(this.sprite.x + vx, this.sprite.y + vy, other.sprite.x, other.sprite.y);
      if (d < 25) { vx *= 0.2; vy *= 0.2; }
    });

    this.sprite.x += vx; this.sprite.y += vy;
    this.sprite.setDepth(this.sprite.y);
    this.playAnim();
  }

  calculateDirection(deg) {
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
    const key = `villager_${this.currentState}_${this.currentDir}`;
    if (this.scene.anims.exists(key)) this.sprite.play(key, true);
  }
}