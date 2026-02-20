import Phaser from 'phaser';

/**
 * HealthBar
 * A visual component attached to a unit to show their current HP.
 */
export default class HealthBar {
    constructor(scene, x, y, width = 64, height = 8) {
        this.bar = scene.add.graphics();
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.value = 100;
        this.p = width / 100;

        this.bar.setDepth(9999); // Always on top
        this.draw();
    }

    setPos(x, y) {
        this.x = x;
        this.y = y;
        this.draw();
    }

    setValue(amount) {
        this.value = amount;
        if (this.value < 0) this.value = 0;
        this.draw();
    }

    draw() {
        this.bar.clear();

        // Background (Black)
        this.bar.fillStyle(0x000000);
        this.bar.fillRect(this.x - this.width / 2, this.y, this.width, this.height);

        // Health (Green or Red depending on health)
        if (this.value < 30) {
            this.bar.fillStyle(0xff0000); // Red if low
        } else {
            this.bar.fillStyle(0x00ff00); // Green if healthy
        }

        const healthWidth = Math.floor(this.p * this.value);
        this.bar.fillRect(this.x - this.width / 2 + 1, this.y + 1, healthWidth - 2, this.height - 2);
    }

    destroy() {
        this.bar.destroy();
    }
}
