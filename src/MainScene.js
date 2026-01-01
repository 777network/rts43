import Phaser from "phaser"; // Importera Phaser
import TileMap from "./systems/TileMap.js";
import Building from "./entities/Building.js";
import Unit from "./entities/Unit.js";
import UIScene from "./scenes/UIScene.js"; // Importera nya scenen

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
    // Resurser lagras nu direkt i scenen för enkelhetens skull
    this.resources = { food: 200, stone: 150, gold: 100, wood: 200 };
  }

  preload() {
    // Ladda BARA spel-assets här (UI laddas i UIScene)
    this.load.image("grass", "assets/tiles/grass.png");
    this.load.image("forest", "assets/tiles/forest.png");
    this.load.image("gold", "assets/tiles/gold.png");
    this.load.image("stone", "assets/tiles/stone.png");
    this.load.image("food", "assets/tiles/food.png");
    this.load.image("towncenter", "assets/tiles/towncenter.png");

    this.load.image("mine_pointer", "assets/tiles/mine_pointer1.png");
    this.load.image("idle_pointer", "assets/tiles/idle_pointer1.png");
    this.load.image("chop_pointer", "assets/tiles/chop_pointer1.png");
    this.load.image("hand_pointer", "assets/tiles/hand_pointer1.png");

    const states = ["idle", "walk", "chop", "mine", "food"];
    const dirs = ["down", "up", "left", "right", "down_right", "down_left", "up_right", "up_left"];
    
    dirs.forEach(dir => {
      states.forEach(state => {
        const key = `villager_${state}_${dir}`;
        this.load.spritesheet(key, `assets/tiles/${key}.png`, { frameWidth: 45, frameHeight: 65 });
      });
    });
  }

  create() {
    // Starta UI Scenen parallellt
    if (!this.scene.get("UIScene")) {
        this.scene.add("UIScene", UIScene, true);
    }

    const tileSize = 32;
    const mapSize = 100;
    this.tileMap = new TileMap(this, mapSize, mapSize, tileSize);
    
    // Town Center Position
    this.tcTileX = 15;
    this.tcTileY = 15;
    const tcX = this.tcTileX * tileSize;
    const tcY = this.tcTileY * tileSize;

    this.tileMap.protectArea(this.tcTileX, this.tcTileY, 3);
    this.tileMap.placeStartingResources(this.tcTileX, this.tcTileY);
    this.tileMap.randomizeGlobalResources();
    this.tileMap.renderMap();

    this.createVillagerAnimations();

    this.townCenter = new Building(this, tcX, tcY, "towncenter");
    
    // Markera TC som blockerad (building)
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 0; y++) {
        if (this.tileMap.map[this.tcTileY + y]) {
          this.tileMap.map[this.tcTileY + y][this.tcTileX + x].type = "building";
        }
      }
    }

    // Drop-off point: 2 rutor nedanför TC (på gräset)
    this.dropOffPoint = {
        x: tcX,
        y: tcY + 64 
    };

    this.units = [
      new Unit(this, tcX + 64, tcY + 90, "villager_idle_down"),
      new Unit(this, tcX - 64, tcY + 90, "villager_idle_down")
    ];

    this.selectedUnits = [];
    this.isDragging = false;
    this.selectionGraphics = this.add.graphics();
    this.destMarker = this.add.graphics().setVisible(false);

    this.setupMouseInput();

    // Kamera setup
    this.cameras.main.setZoom(1.5);
    this.cameras.main.centerOn(tcX, tcY);
    this.cameras.main.setBounds(0, 0, mapSize * tileSize, mapSize * tileSize);
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    this.scale.on('resize', (gameSize) => {
      this.cameras.main.setSize(gameSize.width, gameSize.height);
    });
  }

  // Hjälpmetod för ekonomi
  depositResource(type, amount) {
    const key = type === 'forest' ? 'wood' : type;
    if (this.resources[key] !== undefined) {
        this.resources[key] += amount;
        // Skicka event till UIScene att uppdatera texten
        this.events.emit("updateResources", this.resources);
    }
  }

  createVillagerAnimations() {
     // (Samma animationskod som du hade, klistra in den här eller behåll den du har)
     const states = ["idle", "walk", "chop", "mine", "food"];
     const dirs = ["down", "up", "left", "right", "down_right", "down_left", "up_right", "up_left"];
     dirs.forEach(dir => {
       states.forEach(state => {
         const key = `villager_${state}_${dir}`;
         if (!this.anims.exists(key)) {
            this.anims.create({
                key: key,
                frames: this.anims.generateFrameNumbers(key, { start: 0, end: 4 }),
                frameRate: (state === "idle") ? 6 : 10,
                repeat: -1
            });
         }
       });
     });

    this.input.setDefaultCursor('none');
    this.customPointer = this.add.image(0, 0, "idle_pointer").setOrigin(0, 0).setDepth(100000);
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
        this.selectionGraphics.strokeRect(Math.min(this.dragStart.x, p.worldX), Math.min(this.dragStart.y, p.worldY), Math.abs(p.worldX - this.dragStart.x), Math.abs(p.worldY - this.dragStart.y));
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
            const tilePos = this.tileMap.worldToTile(p.worldX, p.worldY);
            if (this.tileMap.isValid(tilePos.tx, tilePos.ty)) {
                const tile = this.tileMap.map[tilePos.ty][tilePos.tx];
                if (["forest", "gold", "stone", "food"].includes(tile.type)) {
                    this.selectedUnits.forEach(u => u.orderGather(tilePos.tx, tilePos.ty, tile.type));
                } else {
                    this.showDestinationMarker(p.worldX, p.worldY);
                    this.selectedUnits.forEach((u, i) => {
                        const offsetX = (i % 3) * 25 - 25;
                        const offsetY = Math.floor(i / 3) * 25 - 25;
                        u.orderMove(p.worldX + offsetX, p.worldY + offsetY);
                    });
                }
            }
        }
      }
    });
  }

  // Behåll handleSingleSelection, handleBoxSelection, showDestinationMarker som de var
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

  showDestinationMarker(x, y) {
      this.destMarker.clear().lineStyle(3, 0xff0000).lineBetween(-10,-10,10,10).lineBetween(10,-10,-10,10).setPosition(x,y).setVisible(true).setAlpha(1).setDepth(2000);
      this.tweens.add({ targets: this.destMarker, alpha: 0, duration: 400, yoyo: true, repeat: 3, onComplete: () => this.destMarker.setVisible(false) });
  }

  update(t, delta) {
    const camSpeed = 10;
    if (this.keys.W.isDown) this.cameras.main.scrollY -= camSpeed;
    if (this.keys.S.isDown) this.cameras.main.scrollY += camSpeed;
    if (this.keys.A.isDown) this.cameras.main.scrollX -= camSpeed;
    if (this.keys.D.isDown) this.cameras.main.scrollX += camSpeed;

    this.updatePointer();
    this.units.forEach(u => u.update(delta, this.tileMap, this.units));
  }

  updatePointer() {
    const worldPoint = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
    this.customPointer.setPosition(worldPoint.x, worldPoint.y);
    if (this.selectedUnits.length > 0) {
      const checkOffsets = [{dx:0, dy:0}, {dx:20, dy:0}, {dx:0, dy:20}, {dx:20, dy:20}];
      let detectedType = "grass";
      for (let offset of checkOffsets) {
        const tilePos = this.tileMap.worldToTile(worldPoint.x + offset.dx, worldPoint.y + offset.dy);
        if (this.tileMap.isValid(tilePos.tx, tilePos.ty)) {
          const type = this.tileMap.map[tilePos.ty][tilePos.tx].type;
          if (["forest", "gold", "stone", "food"].includes(type)) { detectedType = type; break; }
        }
      }
      switch (detectedType) {
        case "forest": this.customPointer.setTexture("chop_pointer"); break;
        case "gold":
        case "stone": this.customPointer.setTexture("mine_pointer"); break;
        case "food": this.customPointer.setTexture("hand_pointer"); break;
        default: this.customPointer.setTexture("idle_pointer"); break;
      }
    } else {
      this.customPointer.setTexture("idle_pointer");
    }
  }
}