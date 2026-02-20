export default class Room {
    constructor(scene, x, y, width, height) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.debugGraphics = null;
    }

    drawDebug() {
        if (!this.debugGraphics) {
            this.debugGraphics = this.scene.add.graphics();
        }

        this.debugGraphics.clear();
        this.debugGraphics.lineStyle(4, 0x00ff00, 1); // Thicker line for walls
        this.debugGraphics.strokeRect(this.x, this.y, this.width, this.height);

        // Draw room center
        this.debugGraphics.fillStyle(0x00ff00, 0.5);
        this.debugGraphics.fillCircle(this.x + this.width / 2, this.y + this.height / 2, 5);

        // Add physics bounds for this room (Mental Note: Ideally we use Physics Static Groups, but for prototype we rely on world bounds or simple check)
        // For now, let's just create a static rectangle per room to act as 'floor' or 'walls' is complex without a tilemap.
        // We will stick to Visual Debug for now.
    }
}
