import TileMap from "./systems/TileMap.js";
import Building from "./entities/Building.js";
import Unit from "./entities/Unit.js";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Tiles
    this.load.image("grass", "assets/tiles/grass.png");
    this.load.image("forest", "assets/tiles/forest.png");
    this.load.image("gold", "assets/tiles/gold.png");
    this.load.image("stone", "assets/tiles/stone.png");
    this.load.image("food", "assets/tiles/food.png");
    this.load.image("towncenter", "assets/tiles/towncenter.png");

    // Villager spritesheets (idle + walk, 8 riktningar)
    const dirs = [
      "down",
      "up",
      "down_right",
      "down_left",
      "up_left",
      "up_right",
      "left",
      "right",
    ];

    dirs.forEach((dir) => {
      this.load.spritesheet(
        `villager_idle_${dir}`,
        `assets/tiles/villager_idle_${dir}.png`,
        { frameWidth: 45, frameHeight: 65 }
      );

      this.load.spritesheet(
        `villager_walk_${dir}`,
        `assets/tiles/villager_walk_${dir}.png`,
        { frameWidth: 45, frameHeight: 65 }
      );
    });
  }

  create() {
    const tileSize = 32;
    const mapWidth = 200;
    const mapHeight = 170;

    // 1. Tilemap
    this.tileMap = new TileMap(this, mapWidth, mapHeight, tileSize);

    // 2. Town Center i vänster del
    const tcTileX = 10;
    const tcTileY = Math.floor(mapHeight / 2);

    const tcX = tcTileX * tileSize;
    const tcY = tcTileY * tileSize;

    this.tileMap.protectArea(tcTileX, tcTileY, 3);

    this.tileMap.placeStartingResources(tcTileX, tcTileY);
    this.tileMap.randomizeGlobalResources();
    this.tileMap.placeSingleTrees(150);

    this.tileMap.renderMap();

    // 3. Animationer
    this.createVillagerAnimations();

    // 4. Town Center
    this.townCenter = new Building(this, tcX, tcY, "towncenter");

    // 5. Villagers
    this.units = [];

    const v1 = new Unit(this, tcX + 68, tcY + 6, "villager_idle_down");
    const v2 = new Unit(this, tcX + 48, tcY + 88, "villager_idle_down");

    this.units.push(v1, v2);

    // 6. Selektion
    this.selectedUnits = [];
    this.isDragging = false;
    this.dragStartPoint = null;
    this.selectionGraphics = this.add.graphics();
    this.selectionGraphics.setScrollFactor(0); // ritas i world coords, vi sätter coords manuellt

    // Input‑setup
    this.setupMouseInput();

    // 7. Kamera
    this.cameras.main.setBounds(
      0,
      0,
      mapWidth * tileSize,
      mapHeight * tileSize
    );
    this.cameras.main.centerOn(tcX, tcY);

    this.setupControls();

    this.add
      .text(10, 10, "RTS Karta - WASD för att panorera", {
        fontSize: "16px",
        fill: "#fff",
        backgroundColor: "#000",
      })
      .setScrollFactor(0);
  }

  createVillagerAnimations() {
    const dirs = [
      "down",
      "up",
      "down_right",
      "down_left",
      "up_left",
      "up_right",
      "left",
      "right",
    ];

    dirs.forEach((dir) => {
      this.anims.create({
        key: `villager_idle_${dir}`,
        frames: this.anims.generateFrameNumbers(`villager_idle_${dir}`, {
          start: 0,
          end: 5,
        }),
        frameRate: 6,
        repeat: -1,
      });

      this.anims.create({
        key: `villager_walk_${dir}`,
        frames: this.anims.generateFrameNumbers(`villager_walk_${dir}`, {
          start: 0,
          end: 5,
        }),
        frameRate: 10,
        repeat: -1,
      });
    });
  }

  setupControls() {
    this.input.keyboard.on("keydown-W", () => (this.cameras.main.scrollY -= 32));
    this.input.keyboard.on("keydown-S", () => (this.cameras.main.scrollY += 32));
    this.input.keyboard.on("keydown-A", () => (this.cameras.main.scrollX -= 32));
    this.input.keyboard.on("keydown-D", () => (this.cameras.main.scrollX += 32));
  }

  setupMouseInput() {
    // Vänster musknapp: selektion / box‑select
    this.input.on("pointerdown", (pointer) => {
      if (pointer.leftButtonDown()) {
        this.isDragging = true;
        this.dragStartPoint = new Phaser.Math.Vector2(
          pointer.worldX,
          pointer.worldY
        );
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (this.isDragging && this.dragStartPoint) {
        const x1 = this.dragStartPoint.x;
        const y1 = this.dragStartPoint.y;
        const x2 = pointer.worldX;
        const y2 = pointer.worldY;

        const rect = new Phaser.Geom.Rectangle(
          Math.min(x1, x2),
          Math.min(y1, y2),
          Math.abs(x2 - x1),
          Math.abs(y2 - y1)
        );

        this.drawSelectionRectangle(rect);
      }
    });

    this.input.on("pointerup", (pointer) => {
      if (pointer.leftButtonReleased()) {
        const dragDistance = this.dragStartPoint
          ? Phaser.Math.Distance.Between(
              this.dragStartPoint.x,
              this.dragStartPoint.y,
              pointer.worldX,
              pointer.worldY
            )
          : 0;

        this.selectionGraphics.clear();
        this.isDragging = false;

        if (dragDistance < 5) {
          // Klick – single select
          this.handleSingleSelection(pointer.worldX, pointer.worldY);
        } else {
          // Box‑select
          const x1 = this.dragStartPoint.x;
          const y1 = this.dragStartPoint.y;
          const x2 = pointer.worldX;
          const y2 = pointer.worldY;

          const rect = new Phaser.Geom.Rectangle(
            Math.min(x1, x2),
            Math.min(y1, y2),
            Math.abs(x2 - x1),
            Math.abs(y2 - y1)
          );

          this.handleBoxSelection(rect);
        }

        this.dragStartPoint = null;
      }
    });

    // Högerklick: move‑order för markerade units
    this.input.mouse.disableContextMenu();
    this.input.on("pointerup", (pointer) => {
      if (pointer.rightButtonReleased()) {
        if (this.selectedUnits.length === 0) return;

        const targetX = pointer.worldX;
        const targetY = pointer.worldY;

        // Enkel spridning: offset per unit
        const spacing = 16;
        this.selectedUnits.forEach((unit, index) => {
          const angle = (index / this.selectedUnits.length) * Math.PI * 2;
          const offsetX = Math.cos(angle) * spacing * 2;
          const offsetY = Math.sin(angle) * spacing * 2;
          unit.moveTo(targetX + offsetX, targetY + offsetY);
        });
      }
    });
  }

  drawSelectionRectangle(rect) {
    this.selectionGraphics.clear();
    this.selectionGraphics.lineStyle(1, 0x00ff00, 1);
    this.selectionGraphics.strokeRectShape(rect);
  }

  clearSelection() {
    this.selectedUnits.forEach((u) => u.setSelected(false));
    this.selectedUnits = [];
  }

  handleSingleSelection(x, y) {
    // Kolla om vi klickat på en unit
    let clickedUnit = null;
    for (const u of this.units) {
      const dist = Phaser.Math.Distance.Between(
        x,
        y,
        u.sprite.x,
        u.sprite.y
      );
      if (dist <= 24) {
        clickedUnit = u;
        break;
      }
    }

    this.clearSelection();

    if (clickedUnit) {
      clickedUnit.setSelected(true);
      this.selectedUnits.push(clickedUnit);
    }
  }

  handleBoxSelection(rect) {
    this.clearSelection();

    this.units.forEach((u) => {
      if (rect.contains(u.sprite.x, u.sprite.y)) {
        u.setSelected(true);
        this.selectedUnits.push(u);
      }
    });
  }

  update(time, delta) {
    this.units.forEach((u) => u.update(delta, this.tileMap));
  }
}
