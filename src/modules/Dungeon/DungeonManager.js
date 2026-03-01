import DungeonRenderer from './DungeonRenderer.js';
// import Room from './Room.js'; 

class SimpleDungeon {
    constructor(scene, width, height) {
        this.scene = scene;
        this.width = width;
        this.height = height;
        // 1 = wall, 6 = floor
        this.grid = Array.from({ length: height }, () => Array(width).fill(1));
        this.rooms = [];
        this.generate();
    }

    generate() {
        // We now treat the entire background as a playable floor.
        // 6 = floor
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 6;
            }
        }
        console.log(`[Dungeon] Flat floor generation complete: ${this.width}x${this.height}`);
    }

    getMappedTiles(mapping) {
        // We use 1 for wall, 6 for floor internally. Mapping them to the requested indices if needed.
        return this.grid.map(row =>
            row.map(cell => cell === 1 ? mapping.wall : mapping.floor)
        );
    }
}

export default class DungeonManager {
    constructor(scene) {
        this.scene = scene;
        this.dungeonInstance = null;
        this.renderer = null;
    }

    generateDungeon() {
        console.log('Generating Dungeon with custom simple generator...');

        // Background base is 1536x1024. 
        // 1.5x scaling: 1536 * 1.5 = 2304, 1024 * 1.5 = 1536.
        // Tiles (32px): 2304/32 = 72, 1536/32 = 48.
        this.dungeonInstance = new SimpleDungeon(this.scene, 72, 48);

        // Create Placeholder Tileset (Debug purpose)
        DungeonRenderer.createPlaceholderTileset(this.scene);

        this.renderer = new DungeonRenderer(this.scene, this.dungeonInstance);
        this.renderer.render();

        console.log('Dungeon generated:', this.dungeonInstance);
    }

    getPlayerStartPosition() {
        // Return center of the generated world if no rooms exist
        if (this.dungeonInstance.rooms.length === 0) {
            return {
                x: (this.dungeonInstance.width * 32) / 2,
                y: (this.dungeonInstance.height * 32) / 2
            };
        }

        const firstRoom = this.dungeonInstance.rooms[0];
        return {
            x: (firstRoom.x + firstRoom.width / 2) * 32,
            y: (firstRoom.y + firstRoom.height / 2) * 32
        };
    }
}
