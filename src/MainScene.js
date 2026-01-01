import TileMap from "./systems/TileMap.js";
import Building from "./entities/Building.js";
import Unit from "./entities/Unit.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    this.load.image("grass", "assets/tiles/grass.png");
    this.load.image("forest", "assets/tiles/forest.png");
    this.load.image("gold", "assets/tiles/gold.png");
    this.load.image("stone", "assets/tiles/stone.png");
    this.load.image("food", "assets/tiles/food.png");
    this.load.image("towncenter", "assets/tiles/towncenter.png");

    const dirs = ["down", "up", "left", "right", "down_right", "down_left", "up_right", "up_left"];
    dirs.forEach(dir => {
      this.load.spritesheet(`villager_idle_${dir}`, `assets/tiles/villager_idle_${dir}.png`, { frameWidth: 45, frameHeight: 65 });
      this.load.spritesheet(`villager_walk_${dir}`, `assets/tiles/villager_walk_${dir}.png`, { frameWidth: 45, frameHeight: 65 });
    });
  }

  create() {
    const tileSize = 32;
    this.tileMap = new TileMap(this, 100, 100, tileSize);
    
    const tcTileX = 15;
    const tcTileY = 15;
    const tcX = tcTileX * tileSize;
    const tcY = tcTileY * tileSize;

    this.tileMap.protectArea(tcTileX, tcTileY, 3);
    this.tileMap.placeStartingResources(tcTileX, tcTileY);
    this.tileMap.randomizeGlobalResources();
    this.tileMap.renderMap();

    this.createVillagerAnimations();

    // Skapa byggnaden
    this.townCenter = new Building(this, tcX, tcY, "towncenter");

    // BLOCKERA TOWN CENTER: Gör så att pathfinding ser byggnaden som ett hinder
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 0; y++) {
        const ty = tcTileY + y;
        const tx = tcTileX + x;
        if (this.tileMap.map[ty] && this.tileMap.map[ty][tx]) {
          this.tileMap.map[ty][tx].type = "building";
        }
      }
    }

    this.units = [
      new Unit(this, tcX + 80, tcY + 60, "villager_idle_down"),
      new Unit(this, tcX + 80, tcY + 100, "villager_idle_down")
    ];

    this.selectedUnits = [];
    this.isDragging = false;
    this.selectionGraphics = this.add.graphics();
    this.destMarker = this.add.graphics();
    this.destMarker.setVisible(false);

    this.setupMouseInput();
    this.cameras.main.centerOn(tcX, tcY);
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
  }

  createVillagerAnimations() {
    const dirs = ["down", "up", "left", "right", "down_right", "down_left", "up_right", "up_left"];
    dirs.forEach(dir => {
      if (!this.anims.exists(`villager_idle_${dir}`)) {
        this.anims.create({ key: `villager_idle_${dir}`, frames: this.anims.generateFrameNumbers(`villager_idle_${dir}`, { start: 0, end: 5 }), frameRate: 6, repeat: -1 });
      }
      if (!this.anims.exists(`villager_walk_${dir}`)) {
        this.anims.create({ key: `villager_walk_${dir}`, frames: this.anims.generateFrameNumbers(`villager_walk_${dir}`, { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
      }
    });
  }

  showDestinationMarker(x, y) {
    this.destMarker.clear();
    this.destMarker.lineStyle(3, 0xff0000);
    this.destMarker.lineBetween(-10, -10, 10, 10);
    this.destMarker.lineBetween(10, -10, -10, 10);
    this.destMarker.setPosition(x, y).setVisible(true).setAlpha(1).setDepth(2000);
    
    if (this.destTween) this.destTween.stop();
    this.destTween = this.tweens.add({
      targets: this.destMarker,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: 3,
      onComplete: () => this.destMarker.setVisible(false)
    });
  }

  setupMouseInput() {
    this.input.mouse.disableContextMenu();
    this.input.on("pointerdown", (p) => {
      if (p.leftButtonDown()) {
        this.isDragging = true;
        this.dragStart = new Phaser.Math.Vector2(p.worldX, p.worldY);
      }
    });

    this.input.on("pointermove", (p) => {
      if (this.isDragging) {
        this.selectionGraphics.clear().lineStyle(2, 0x00ff00);
        this.selectionGraphics.strokeRect(
          Math.min(this.dragStart.x, p.worldX), Math.min(this.dragStart.y, p.worldY),
          Math.abs(p.worldX - this.dragStart.x), Math.abs(p.worldY - this.dragStart.y)
        );
      }
    });

    this.input.on("pointerup", (p) => {
      if (p.leftButtonReleased()) {
        this.isDragging = false;
        this.selectionGraphics.clear();
        if (!this.dragStart) return;
        const dist = Phaser.Math.Distance.Between(this.dragStart.x, this.dragStart.y, p.worldX, p.worldY);
        if (dist < 10) this.handleSingleSelection(p.worldX, p.worldY);
        else this.handleBoxSelection(new Phaser.Geom.Rectangle(Math.min(this.dragStart.x, p.worldX), Math.min(this.dragStart.y, p.worldY), Math.abs(p.worldX - this.dragStart.x), Math.abs(p.worldY - this.dragStart.y)));
      } else if (p.rightButtonReleased()) {
        if (this.selectedUnits.length > 0) {
          this.showDestinationMarker(p.worldX, p.worldY);
          this.selectedUnits.forEach((u, i) => {
            const spacing = 32;
            const tx = p.worldX + (i % 3) * spacing;
            const ty = p.worldY + Math.floor(i / 3) * spacing;
            u.findPathTo(tx, ty, this.tileMap);
          });
        }
      }
    });
  }

  handleSingleSelection(x, y) {
    this.units.forEach(u => u.setSelected(false));
    this.selectedUnits = [];
    for (const u of this.units) {
      if (Phaser.Math.Distance.Between(x, y, u.sprite.x, u.sprite.y) < 30) {
        u.setSelected(true);
        this.selectedUnits.push(u);
        break;
      }
    }
  }

  handleBoxSelection(rect) {
    this.units.forEach(u => u.setSelected(false));
    this.selectedUnits = [];
    this.units.forEach(u => {
      if (rect.contains(u.sprite.x, u.sprite.y)) {
        u.setSelected(true);
        this.selectedUnits.push(u);
      }
    });
  }

  update(t, delta) {
    const camSpeed = 10;
    if (this.keys.W.isDown) this.cameras.main.scrollY -= camSpeed;
    if (this.keys.S.isDown) this.cameras.main.scrollY += camSpeed;
    if (this.keys.A.isDown) this.cameras.main.scrollX -= camSpeed;
    if (this.keys.D.isDown) this.cameras.main.scrollX += camSpeed;
    this.units.forEach(u => u.update(delta, this.tileMap, this.units));
  }
}