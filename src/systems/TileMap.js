export default class TileMap {
  constructor(scene, width, height, tileSize) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.map = [];

    // 1. Initiera kartan med gräs
    for (let y = 0; y < height; y++) {
      this.map[y] = [];
      for (let x = 0; x < width; x++) {
        this.map[y][x] = { type: "grass", protected: false };
      }
    }
  }

  // Förhindrar att resurser spawnar mitt i Town Center
  protectArea(startX, startY, range) {
    for (let y = startY - range; y <= startY + range; y++) {
      for (let x = startX - range; x <= startX + range; x++) {
        if (this.isValid(x, y)) {
          this.map[y][x].type = "grass";
          this.map[y][x].protected = true;
        }
      }
    }
  }

  // Skapar de viktiga resurserna precis vid start
  placeStartingResources(tcX, tcY) {
    const resources = ["forest", "gold", "stone", "food"];
    resources.forEach((res, i) => {
      const angle = (i / resources.length) * Math.PI * 2;
      const dist = 5;
      const x = Math.floor(tcX + Math.cos(angle) * dist);
      const y = Math.floor(tcY + Math.sin(angle) * dist);
      this.generateCluster(x, y, res, 4); // Lite större start-kluster
    });
  }

  // NY: Denna metod skapar stora skogar och gruvor över hela banan
  randomizeGlobalResources() {
    // Skapa ca 40 skogar (forest)
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, this.width - 1);
      const y = Phaser.Math.Between(0, this.height - 1);
      this.generateCluster(x, y, "forest", Phaser.Math.Between(5, 15));
    }

    // Skapa ca 15 guld-kluster
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, this.width - 1);
      const y = Phaser.Math.Between(0, this.height - 1);
      this.generateCluster(x, y, "gold", Phaser.Math.Between(3, 6));
    }

    // Skapa ca 15 sten-kluster
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(0, this.width - 1);
      const y = Phaser.Math.Between(0, this.height - 1);
      this.generateCluster(x, y, "stone", Phaser.Math.Between(3, 6));
    }
  }

  // Hjälpmetod för att bygga ihop kluster av resurser
  generateCluster(startX, startY, type, size) {
    for (let i = 0; i < size; i++) {
      const offX = Phaser.Math.Between(-2, 2);
      const offY = Phaser.Math.Between(-2, 2);
      const x = startX + offX;
      const y = startY + offY;
      
      if (this.isValid(x, y) && !this.map[y][x].protected) {
        this.map[y][x].type = type;
      }
    }
  }

  renderMap() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.map[y][x];
        const worldX = x * this.tileSize + this.tileSize / 2;
        const worldY = y * this.tileSize + this.tileSize / 2;
        
        const img = this.scene.add.image(worldX, worldY, tile.type);
        img.setOrigin(0.5);
        // Gräs i botten, allt annat har djup baserat på Y för 2.5D-effekt
        img.setDepth(tile.type === "grass" ? -1 : worldY);
      }
    }
  }

  isValid(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  worldToTile(x, y) {
    return { 
      tx: Math.floor(x / this.tileSize), 
      ty: Math.floor(y / this.tileSize) 
    };
  }

  isWalkableTile(tx, ty) {
    if (!this.isValid(tx, ty)) return false;
    const tile = this.map[ty][tx];
    // Pathfinding: Endast grass är öppet för att gå på
    return tile.type === "grass";
  }

  isWalkableWorld(worldX, worldY) {
    const tile = this.worldToTile(worldX, worldY);
    return this.isWalkableTile(tile.tx, tile.ty);
  }
}