export default class DungeonRenderer {
    constructor(scene, dungeon) {
        this.scene = scene;
        this.dungeon = dungeon;
        this.tilemap = null;
        this.groundLayer = null;
        this.wallLayer = null;
    }

    render() {
        // Create a blank tilemap
        this.tilemap = this.scene.make.tilemap({
            tileWidth: 32,
            tileHeight: 32,
            width: this.dungeon.width,
            height: this.dungeon.height
        });

        // Load a tileset (User needs to provide assets, but we'll use a placeholder or single color tiles if possible. 
        // For now, we assume a 'tiles' image is loaded in BootScene, strictly for logic verification we might need to generate a texture)
        // If not, we can't use createLayer easily without a tileset.
        // Let's create a procedural texture for testing if 'dungeon-tiles' is missing.

        let tileset = this.tilemap.addTilesetImage('dungeon-tiles', null, 32, 32, 1, 2); // Parameters: name, key, width, height, margin, spacing

        // --- PHASER TILEMAP PATCH ---
        // Blank tilemaps don't populate the tiles lookup table, causing PutTileAt to crash.
        // We manually inject the tile metadata mapped to tileset index 0.
        for (let i = 0; i < 20; i++) {
            this.tilemap.tiles[i] = [i, null, 0];
        }
        // -----------------------------

        if (!tileset) {
            console.warn("Tileset 'dungeon-tiles' not found. Creating debug layer.");
            // Fallback: Using simple shapes is harder with Tilemap.
            // We will assume the user or BootScene creates a placeholder texture.
            return;
        }

        this.groundLayer = this.tilemap.createBlankLayer('Ground', tileset, 0, 0, this.dungeon.width, this.dungeon.height);
        this.wallLayer = this.tilemap.createBlankLayer('Walls', tileset, 0, 0, this.dungeon.width, this.dungeon.height);

        // Fill layers based on dungeon data
        // Mapped values: 0 = empty, 1 = wall, 2 = floor
        // We need to map dungeon.dungeon (2D array) to tiles
        // mikewesthad/dungeon uses: 0 for nothing, 1 for floor, 2 for wall usually? 
        // Actually it depends on how we query it. 

        const mappedTiles = this.dungeon.getMappedTiles({ empty: -1, wall: 1, floor: 6, door: 6 });

        mappedTiles.forEach((row, y) => {
            row.forEach((tileId, x) => {
                if (tileId === 1) {
                    this.wallLayer.putTileAt(tileId, x, y);
                } else if (tileId === 6) {
                    this.groundLayer.putTileAt(tileId, x, y);
                }
            });
        });

        // Enable collision on walls
        this.wallLayer.setCollisionByExclusion([-1]);
    }

    // Helper to generate a placeholder tileset texture if none exists
    static createPlaceholderTileset(scene) {
        if (scene.textures.exists('dungeon-tiles')) return;

        const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

        // Draw Wall (Index 1) - Dark Gray
        graphics.fillStyle(0x444444);
        graphics.fillRect(34, 0, 32, 32); // 1px margin + 32 + 2px spacing... simplified: just draw a strip

        // Draw Floor (Index 6) - Lighter Gray
        graphics.fillStyle(0x888888);
        graphics.fillRect(34 * 6, 0, 32, 32);

        graphics.generateTexture('dungeon-tiles', 256, 32);
    }
}
