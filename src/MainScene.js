import TileMap from "./systems/TileMap.js";
import Building from "./entities/Building.js";
import Unit from "./entities/Unit.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Grundläggande grafik
    this.load.image("grass", "assets/tiles/grass.png");
    this.load.image("forest", "assets/tiles/forest.png");
    this.load.image("gold", "assets/tiles/gold.png");
    this.load.image("stone", "assets/tiles/stone.png");
    this.load.image("food", "assets/tiles/food.png");
    this.load.image("towncenter", "assets/tiles/towncenter.png");

    // Dina 8 exakta riktningar
    const dirs = [
      "down", "up", "left", "right", 
      "down_right", "down_left", "up_right", "up_left"
    ];
    
    dirs.forEach((dir) => {
      // Laddar in 6 frames (0-5) med storlek 45x65 per ruta
      this.load.spritesheet(`villager_idle_${dir}`, `assets/tiles/villager_idle_${dir}.png`, { frameWidth: 45, frameHeight: 65 });
      this.load.spritesheet(`villager_walk_${dir}`, `assets/tiles/villager_walk_${dir}.png`, { frameWidth: 45, frameHeight: 65 });
    });
  }

  create() {
    const tileSize = 32;
    const mapWidth = 200;
    const mapHeight = 170;

    // Skapa karta
    this.tileMap = new TileMap(this, mapWidth, mapHeight, tileSize);
    
    const tcX = 10 * tileSize;
    const tcY = Math.floor(mapHeight / 2) * tileSize;

    this.tileMap.protectArea(10, Math.floor(mapHeight / 2), 3);
    this.tileMap.placeStartingResources(10, Math.floor(mapHeight / 2));
    this.tileMap.randomizeGlobalResources();
    this.tileMap.placeSingleTrees(150);
    this.tileMap.renderMap();

    // Skapa alla animationer
    this.createVillagerAnimations();

    this.townCenter = new Building(this, tcX, tcY, "towncenter");
    
    // Skapa start-enheter
    this.units = [
      new Unit(this, tcX + 80, tcY + 20, "villager_idle_down"),
      new Unit(this, tcX + 80, tcY + 80, "villager_idle_down")
    ];

    this.selectedUnits = [];
    this.isDragging = false;
    this.selectionGraphics = this.add.graphics();

    this.setupMouseInput();
    
    // Kamera-inställningar
    this.cameras.main.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize);
    this.cameras.main.centerOn(tcX, tcY);
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    this.add.text(10, 10, "MARKERA: Vänsterklick | GÅ: Högerklick", { 
        font: "16px Arial", fill: "#ffffff", backgroundColor: "#000000" 
    }).setScrollFactor(0).setDepth(1000);
  }

  createVillagerAnimations() {
    const dirs = ["down", "up", "left", "right", "down_right", "down_left", "up_right", "up_left"];
    dirs.forEach((dir) => {
      // Idle: 6 rutor (0 till 5)
      this.anims.create({
        key: `villager_idle_${dir}`,
        frames: this.anims.generateFrameNumbers(`villager_idle_${dir}`, { start: 0, end: 5 }),
        frameRate: 6,
        repeat: -1
      });

      // Walk: 6 rutor (0 till 5)
      this.anims.create({
        key: `villager_walk_${dir}`,
        frames: this.anims.generateFrameNumbers(`villager_walk_${dir}`, { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
      });
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
        this.selectionGraphics.clear().lineStyle(2, 0x00ff00, 1);
        const x = Math.min(this.dragStart.x, p.worldX);
        const y = Math.min(this.dragStart.y, p.worldY);
        const w = Math.abs(p.worldX - this.dragStart.x);
        const h = Math.abs(p.worldY - this.dragStart.y);
        this.selectionGraphics.strokeRect(x, y, w, h);
      }
    });

    this.input.on("pointerup", (p) => {
      if (p.leftButtonReleased()) {
        this.isDragging = false;
        this.selectionGraphics.clear();
        
        const dist = Phaser.Math.Distance.Between(this.dragStart.x, this.dragStart.y, p.worldX, p.worldY);
        if (dist < 10) {
          this.handleSingleSelection(p.worldX, p.worldY);
        } else {
          this.handleBoxSelection(new Phaser.Geom.Rectangle(
            Math.min(this.dragStart.x, p.worldX), Math.min(this.dragStart.y, p.worldY),
            Math.abs(p.worldX - this.dragStart.x), Math.abs(p.worldY - this.dragStart.y)
          ));
        }
      } else if (p.rightButtonReleased()) {
        // Skicka valda gubbar till målpunkten
        this.selectedUnits.forEach((u, i) => {
          const offsetX = (i % 3) * 30;
          const offsetY = Math.floor(i / 3) * 30;
          u.moveTo(p.worldX + offsetX, p.worldY + offsetY);
        });
      }
    });
  }

  handleSingleSelection(x, y) {
    this.clearSelection();
    for (const u of this.units) {
      if (Phaser.Math.Distance.Between(x, y, u.sprite.x, u.sprite.y) < 32) {
        u.setSelected(true);
        this.selectedUnits.push(u);
        break;
      }
    }
  }

  handleBoxSelection(rect) {
    this.clearSelection();
    this.units.forEach(u => {
      if (rect.contains(u.sprite.x, u.sprite.y)) {
        u.setSelected(true);
        this.selectedUnits.push(u);
      }
    });
  }

  clearSelection() {
    this.selectedUnits.forEach(u => u.setSelected(false));
    this.selectedUnits = [];
  }

  update(time, delta) {
    const camSpeed = 12;
    if (this.keys.W.isDown) this.cameras.main.scrollY -= camSpeed;
    if (this.keys.S.isDown) this.cameras.main.scrollY += camSpeed;
    if (this.keys.A.isDown) this.cameras.main.scrollX -= camSpeed;
    if (this.keys.D.isDown) this.cameras.main.scrollX += camSpeed;

    this.units.forEach(u => u.update(delta, this.tileMap));
  }
}