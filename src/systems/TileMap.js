const TILE_TYPES = {
  GRASS: "grass",
  FOREST: "forest",
  GOLD: "gold",
  STONE: "stone",
  FOOD: "food",
};

export { TILE_TYPES };

export default class TileMap {
  constructor(scene, width, height, tileSize) {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.tileSize = tileSize;
    this.map = [];
    this.generateMap();
  }

  generateMap() {
    this.map = [];
    for (let y = 0; y < this.height; y++) {
      const row = [];
      for (let x = 0; x < this.width; x++) {
        row.push({ x, y, type: TILE_TYPES.GRASS, protected: false });
      }
      this.map.push(row);
    }
  }

  placeSingleTrees(count) {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.map[y] && this.map[y][x] && this.map[y][x].type === TILE_TYPES.GRASS && !this.map[y][x].protected) {
        this.map[y][x].type = TILE_TYPES.FOREST;
      }
    }
  }

  placeStartingResources(tcTileX, tcTileY) {
    const startResources = [
      { type: TILE_TYPES.STONE, size: 4 },
      { type: TILE_TYPES.GOLD, size: 4 },
      { type: TILE_TYPES.FOOD, size: 6 },
      { type: TILE_TYPES.FOREST, size: 20 },
      { type: TILE_TYPES.FOREST, size: 20 },
    ];

    startResources.forEach((res, index) => {
      const angle = (index / startResources.length) * Math.PI * 2 + Math.random();
      const x = Math.round(tcTileX + Math.cos(angle) * 6);
      const y = Math.round(tcTileY + Math.sin(angle) * 6);
      this.fillCluster(x, y, res.type, res.size);
    });
  }

  randomizeGlobalResources() {
    this.placeGlobalClusters(TILE_TYPES.GOLD, 15, 5);
    this.placeGlobalClusters(TILE_TYPES.STONE, 12, 4);
    this.placeGlobalClusters(TILE_TYPES.FOOD, 20, 8);
    this.placeGlobalClusters(TILE_TYPES.FOREST, 40, 65);
  }

  placeGlobalClusters(type, count, clusterSize) {
    let placed = 0;
    for (let i = 0; i < 500 && placed < count; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      if (this.isAreaClear(x, y, 8)) {
        this.fillCluster(x, y, type, clusterSize);
        placed++;
      }
    }
  }

  fillCluster(startX, startY, type, size) {
    let queue = [{ x: startX, y: startY }];
    let placed = 0;
    let visited = new Set();

    while (placed < size && queue.length > 0) {
      let { x, y } = queue.shift();
      let key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (this.map[y] && this.map[y][x] && this.map[y][x].type === TILE_TYPES.GRASS && !this.map[y][x].protected) {
        this.map[y][x].type = type;
        placed++;
        queue.push({x: x+1, y}, {x: x-1, y}, {x, y: y+1}, {x, y: y-1});
      }
    }
  }

  isAreaClear(targetX, targetY, radius) {
    for (let y = targetY - radius; y <= targetY + radius; y++) {
      for (let x = targetX - radius; x <= targetX + radius; x++) {
        if (!this.map[y] || !this.map[y][x] || this.map[y][x].type !== TILE_TYPES.GRASS || this.map[y][x].protected) return false;
      }
    }
    return true;
  }

  protectArea(tileX, tileY, radius) {
    for (let y = tileY - radius; y <= tileY + radius; y++) {
      for (let x = tileX - radius; x <= tileX + radius; x++) {
        if (this.map[y] && this.map[y][x]) {
          this.map[y][x].protected = true;
          this.map[y][x].type = TILE_TYPES.GRASS;
        }
      }
    }
  }

  renderMap() {
    this.map.forEach((row, y) => {
      row.forEach((tile, x) => {
        this.scene.add.image(x * this.tileSize, y * this.tileSize, "grass").setOrigin(0).setDepth(-1);
        if (tile.type !== TILE_TYPES.GRASS) {
          const sprite = this.scene.add.image(x * this.tileSize, y * this.tileSize, tile.type);
          if (tile.type === TILE_TYPES.FOREST) {
            sprite.setOrigin(0.5, 0.9).setPosition(x * this.tileSize + this.tileSize/2, y * this.tileSize + this.tileSize);
          } else {
            sprite.setOrigin(0);
          }
          sprite.setDepth(sprite.y);
        }
      });
    });
  }

  worldToTile(x, y) {
    return { tx: Math.floor(x / this.tileSize), ty: Math.floor(y / this.tileSize) };
  }

  isWalkableWorld(x, y) {
    const { tx, ty } = this.worldToTile(x, y);
    return this.isWalkableTile(tx, ty);
  }

  isWalkableTile(tx, ty) {
    if (ty < 0 || ty >= this.height || tx < 0 || tx >= this.width) return false;
    return this.map[ty][tx].type === TILE_TYPES.GRASS;
  }
}