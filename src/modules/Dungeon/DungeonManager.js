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
        const numRooms = 15;
        for (let i = 0; i < numRooms; i++) {
            let roomWidth = Phaser.Math.Between(6, 14);
            let roomHeight = Phaser.Math.Between(6, 14);
            let x = Phaser.Math.Between(2, this.width - roomWidth - 2);
            let y = Phaser.Math.Between(2, this.height - roomHeight - 2);

            const newRoom = { x, y, width: roomWidth, height: roomHeight };

            // Check overlaps
            let overlaps = false;
            for (let r of this.rooms) {
                if (x < r.x + r.width + 1 && x + roomWidth + 1 > r.x &&
                    y < r.y + r.height + 1 && y + roomHeight + 1 > r.y) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                this.rooms.push(newRoom);
                // Carve room
                for (let rY = y; rY < y + roomHeight; rY++) {
                    for (let rX = x; rX < x + roomWidth; rX++) {
                        this.grid[rY][rX] = 6;
                    }
                }
            }
        }

        // Connect rooms with corridors
        for (let i = 1; i < this.rooms.length; i++) {
            let r1 = this.rooms[i - 1];
            let r2 = this.rooms[i];

            let c1 = { x: Math.floor(r1.x + r1.width / 2), y: Math.floor(r1.y + r1.height / 2) };
            let c2 = { x: Math.floor(r2.x + r2.width / 2), y: Math.floor(r2.y + r2.height / 2) };

            // Horizontal corridor
            let startX = Math.min(c1.x, c2.x);
            let endX = Math.max(c1.x, c2.x);
            for (let px = startX; px <= endX; px++) {
                this.grid[c1.y][px] = 6;
                this.grid[c1.y + 1][px] = 6; // 2 tiles wide
            }

            // Vertical corridor
            let startY = Math.min(c1.y, c2.y);
            let endY = Math.max(c1.y, c2.y);
            for (let py = startY; py <= endY; py++) {
                this.grid[py][c2.x] = 6;
                this.grid[py][c2.x + 1] = 6; // 2 tiles wide
            }
        }
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

        this.dungeonInstance = new SimpleDungeon(this.scene, 50, 50);

        // Create Placeholder Tileset (Debug purpose)
        DungeonRenderer.createPlaceholderTileset(this.scene);

        this.renderer = new DungeonRenderer(this.scene, this.dungeonInstance);
        this.renderer.render();

        console.log('Dungeon generated:', this.dungeonInstance);
    }

    getPlayerStartPosition() {
        // Return center of the first room, converted to world coordinates (tile size 32)
        if (this.dungeonInstance.rooms.length === 0) return { x: 540, y: 320 }; // Fallback

        const firstRoom = this.dungeonInstance.rooms[0];
        return {
            x: (firstRoom.x + firstRoom.width / 2) * 32,
            y: (firstRoom.y + firstRoom.height / 2) * 32
        };
    }
}
