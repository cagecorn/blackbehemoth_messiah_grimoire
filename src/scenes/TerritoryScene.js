import Phaser from 'phaser';

export default class TerritoryScene extends Phaser.Scene {
    constructor() {
        super('TerritoryScene');
    }

    create() {
        console.log('TerritoryScene started');
        this.cameras.main.setBackgroundColor('#2d2d2d');
        this.add.text(this.cameras.main.width / 2, 50, 'Territory (Town)', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, 'Press SPACE to Enter Dungeon', { fontSize: '24px', fill: '#ffff00' }).setOrigin(0.5);

        // Input to enter dungeon
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('DungeonScene');
        });
    }
}
