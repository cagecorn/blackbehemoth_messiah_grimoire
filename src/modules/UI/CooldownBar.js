export default class CooldownBar {
    constructor(scene, x, y, width = 64, height = 4, color = 0xffaa00, readyColor = 0xffff00) {
        this.bar = scene.add.graphics();

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.readyColor = readyColor;
        this.value = 0; // expected from 0 to 1

        this.bar.setDepth(9999); // Always on top
        this.draw();
    }

    setPos(x, y) {
        this.x = x;
        this.y = y;
        this.draw();
    }

    setValue(value) {
        // value is between 0 and 1
        this.value = Math.max(0, Math.min(1, value));
        this.draw();
    }

    draw() {
        this.bar.clear();

        // Background (black)
        this.bar.fillStyle(0x000000);
        this.bar.fillRect(this.x - this.width / 2, this.y, this.width, this.height);

        // Border (white/gray)
        this.bar.lineStyle(1, 0x555555);
        this.bar.strokeRect(this.x - this.width / 2, this.y, this.width, this.height);

        // Foreground
        if (this.value > 0) {
            // If ready, make it bright yellow, else orange (defaults)
            const color = this.value >= 1 ? this.readyColor : this.color;
            this.bar.fillStyle(color);

            const displayWidth = Math.max(1, this.width * this.value);
            this.bar.fillRect(this.x - this.width / 2, this.y, displayWidth, this.height);
        }
    }

    destroy() {
        this.bar.destroy();
    }
}
