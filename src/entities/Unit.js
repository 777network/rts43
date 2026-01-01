import Phaser from "phaser";

export default class Unit {
  constructor(scene, x, y, texture) {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, texture).setOrigin(0.5, 0.8);
    this.sprite.setDepth(y);
    
    this.speed = 100;
    this.gatheringCapacity = 10;
    this.gatheringRate = 1;
    this.inventory = { type: null, amount: 0 };
    this.targetResource = null;
    this.gatheringTimer = 0;
    
    this.path = [];
    this.target = null;
    this.currentState = "idle";
    this.currentDir = "down";
    
    this.ring = scene.add.graphics().lineStyle(2, 0xffffff).strokeCircle(0, 0, 15).setVisible(false);
    this.cargoText = scene.add.text(x, y - 50, "", { 
        fontSize: '14px', 
        fill: '#ffff00', 
        stroke: '#000', 
        strokeThickness: 2 
    }).setOrigin(0.5).setDepth(10001);
  }

  // FIX: Saknad metod för markering
  setSelected(val) {
    this.ring.setVisible(val);
  }

  // --- ORDER LOGIK ---
  orderMove(x, y) {
      this.inventory.amount = 0; // Nollställ vid ny order
      this.targetResource = null;
      this.findPathTo(x, y);
  }

  orderGather(tx, ty, type) {
    if (!this.targetResource || this.targetResource.tx !== tx || this.targetResource.ty !== ty) {
        this.inventory.amount = 0; // Nollställ om det är en ny resurs
    }

    this.targetResource = { tx, ty, type };
    this.inventory.type = type;
    
    const myTile = this.scene.tileMap.worldToTile(this.sprite.x, this.sprite.y);
    const neighbor = this.scene.tileMap.getWalkableNeighbor(tx, ty, myTile.tx, myTile.ty);
    
    if (neighbor) {
        this.findPathTo(neighbor.x * 32 + 16, neighbor.y * 32 + 16);
    } else {
        this.findPathTo(tx * 32 + 16, ty * 32 + 16);
    }
  }

  // --- PATHFINDING ---
  findPathTo(targetX, targetY) {
    const start = this.scene.tileMap.worldToTile(this.sprite.x, this.sprite.y);
    const end = this.scene.tileMap.worldToTile(targetX, targetY);
    
    // Använd din existerande A*-logik eller förenklad rak väg om A* saknas
    this.path = [{ x: targetX, y: targetY }]; 
    this.target = this.path.shift();
    this.currentState = "walk";
  }

  // --- UPDATE LOOP ---
  update(delta, tileMap, allUnits) {
    this.ring.setPosition(this.sprite.x, this.sprite.y).setDepth(this.sprite.depth - 1);
    this.cargoText.setPosition(this.sprite.x, this.sprite.y - 45)
        .setText(this.inventory.amount > 0 ? this.inventory.amount : "");

    // 1. GATHERING
    if (this.currentState === "gathering") {
        this.gatheringTimer += delta;
        if (this.gatheringTimer >= 1000 / this.gatheringRate) {
            this.inventory.amount++;
            this.gatheringTimer = 0;
            if (this.inventory.amount >= this.gatheringCapacity) {
                this.currentState = "delivering";
                this.findPathTo(15 * 32 + 16, 15 * 32 + 16); // Gå till TC
            }
        }
    }

    // 2. DROP-OFF (Stabiliserad räckvidd)
    if (this.currentState === "delivering") {
        const tcX = 15 * 32 + 16;
        const tcY = 15 * 32 + 16;
        const distToTC = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, tcX, tcY);
        
        if (distToTC < 110) { // Generös räckvidd för att undvika att de fastnar
            this.scene.depositResource(this.inventory.type, this.inventory.amount);
            this.inventory.amount = 0;
            
            if (this.targetResource) {
                this.orderGather(this.targetResource.tx, this.targetResource.ty, this.targetResource.type);
            } else {
                this.currentState = "idle";
                this.target = null;
            }
            return;
        }
    }

    // 3. MOVEMENT
    if (!this.target) {
        if (this.currentState === "walk") {
            this.currentState = this.targetResource ? "gathering" : "idle";
        }
        this.playAnim();
        return;
    }

    const dx = this.target.x - this.sprite.x;
    const dy = this.target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
        this.target = this.path.length > 0 ? this.path.shift() : null;
    } else {
        const step = (this.speed * delta) / 1000;
        this.sprite.x += (dx / dist) * step;
        this.sprite.y += (dy / dist) * step;
        
        this.calculateDirection(Math.atan2(dy, dx) * (180 / Math.PI));
        this.sprite.setDepth(this.sprite.y);
    }
    this.playAnim();
  }

  // FIX: Återställd animationsmetod
  playAnim() {
    let animState = this.currentState;
    if (animState === "gathering") {
      if (this.inventory.type === "forest") animState = "chop";
      else if (this.inventory.type === "food") animState = "food";
      else animState = "mine";
    } else if (animState === "delivering") animState = "walk";
    
    const key = `villager_${animState}_${this.currentDir}`;
    if (this.scene.anims.exists(key)) {
        this.sprite.play(key, true);
    }
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
}