import Phaser from "phaser";

export default class TileMap {
  constructor(scene, width, height, tileSize) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.map = [];
    this.initializeMap();
  }

  initializeMap() {
    for (let y = 0; y < this.height; y++) {
      this.map[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.map[y][x] = { 
            type: "grass", 
            x, 
            y, 
            protected: false 
        };
      }
    }
  }

  // --- PATHFINDING HELPERS ---
  isValid(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  isWalkableTile(x, y) {
    if (!this.isValid(x, y)) return false;
    // Endast gräs går att gå på. Byggnader och resurser blockerar
    return this.map[y][x].type === "grass";
  }

  worldToTile(x, y) {
    return { 
        tx: Math.floor(x / this.tileSize), 
        ty: Math.floor(y / this.tileSize) 
    };
  }

  // Hittar en ledig gräsruta bredvid en resurs så villagern inte går in i den
  getWalkableNeighbor(targetX, targetY, startX, startY) {
    const neighbors = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
      { dx: -1, dy: -1 }, { dx: 1, dy: -1 },
      { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
    ];

    let bestTile = null;
    let minDist = Infinity;

    for (let n of neighbors) {
      const checkX = targetX + n.dx;
      const checkY = targetY + n.dy;

      if (this.isValid(checkX, checkY) && this.isWalkableTile(checkX, checkY)) {
        const dist = Phaser.Math.Distance.Between(startX, startY, checkX, checkY);
        if (dist < minDist) {
          minDist = dist;
          bestTile = { x: checkX, y: checkY };
        }
      }
    }
    return bestTile;
  }

  // --- MAP GENERATION ---
  protectArea(cx, cy, radius) {
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (this.isValid(x, y)) this.map[y][x].protected = true;
      }
    }
  }

  randomizeGlobalResources() {
    // 1. Återställ kartan till gräs
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.map[y][x].type = "grass";
      }
    }

    // 2. Skydda området runt Town Center (Tile 15,15)
    this.protectArea(15, 15, 5);

    // 3. Skapa naturliga kluster (typ, antal kluster, min storlek, max storlek)
    this.createClusters("forest", 12, 15, 35); // Stora skogar
    this.createClusters("gold", 6, 3, 6);      // Guldådror
    this.createClusters("stone", 6, 3, 5);     // Stensamlingar
    this.createClusters("food", 8, 2, 4);      // Buskar

    // 4. Placera ut garanterade startresurser nära TC
    this.placeStartingResources(15, 15);
  }

  createClusters(type, numClusters, minSize, maxSize) {
    for (let i = 0; i < numClusters; i++) {
      let tx = Phaser.Math.Between(2, this.width - 3);
      let ty = Phaser.Math.Between(2, this.height - 3);
      
      let clusterSize = Phaser.Math.Between(minSize, maxSize);
      let currentCluster = [{ x: tx, y: ty }];

      for (let s = 0; s < clusterSize; s++) {
        if (currentCluster.length === 0) break;
        let base = currentCluster[Phaser.Math.Between(0, currentCluster.length - 1)];
        
        let neighbors = [
          { x: base.x + 1, y: base.y }, { x: base.x - 1, y: base.y },
          { x: base.x, y: base.y + 1 }, { x: base.x, y: base.y - 1 }
        ];

        for (let n of neighbors) {
          if (this.isValid(n.x, n.y) && !this.map[n.y][n.x].protected && this.map[n.y][n.x].type === "grass") {
            this.map[n.y][n.x].type = type;
            currentCluster.push(n);
            if (currentCluster.length >= clusterSize) break;
          }
        }
      }
    }
  }

  placeStartingResources(cx, cy) {
    // Placerar resurser precis utanför det skyddade området för att garantera en bra start
    const starts = [
      { x: cx + 4, y: cy, type: "forest" },
      { x: cx + 4, y: cy + 1, type: "forest" },
      { x: cx + 4, y: cy - 1, type: "forest" },
      { x: cx - 4, y: cy, type: "gold" },
      { x: cx, y: cy + 4, type: "stone" },
      { x: cx, y: cy - 4, type: "food" }
    ];

    starts.forEach(s => {
      if (this.isValid(s.x, s.y)) {
        this.map[s.y][s.x].type = s.type;
      }
    });
  }

  // --- RENDERING ---
  renderMap() {
    // Rensa gamla resurser innan vi ritar nya
    this.scene.children.list.filter(c => c.isResource || c.isTile).forEach(c => c.destroy());

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.map[y][x];
        
        // Rita alltid gräs som baslager
        const bg = this.scene.add.image(x * this.tileSize, y * this.tileSize, "grass")
          .setOrigin(0)
          .setDepth(0);
        bg.isTile = true;

        // Om det finns en resurs, rita den som ett objekt med djup
        if (tile.type !== "grass" && tile.type !== "building") {
          const res = this.scene.add.sprite(
            x * this.tileSize + 16, 
            y * this.tileSize + 32, // Flytta ner 32px så "fötterna" på spriten landar rätt
            tile.type
          )
          .setOrigin(0.5, 1) // Sätt ankarpunkten till mitten-botten (stammen)
          .setDepth(y * this.tileSize + 32); // Djup baserat på Y-position
          
          res.isResource = true;
        }
      }
    }
  }
}