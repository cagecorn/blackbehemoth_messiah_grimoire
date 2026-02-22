import Phaser from 'phaser';

export default class TerritoryScene extends Phaser.Scene {
    constructor() {
        super('TerritoryScene');
    }

    create() {
        console.log('TerritoryScene started');
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Title
        this.add.text(width / 2, 80, '영지 (Territory)', {
            fontSize: '48px',
            fill: '#e2e8f0',
            fontStyle: 'bold',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 140, '원정대를 이끌고 명성을 떨치십시오.', {
            fontSize: '20px',
            fill: '#94a3b8'
        }).setOrigin(0.5);

        // Buttons Container
        const buttonSpacing = 220;

        // [Dungeon Button]
        this.createMenuButton(width / 2 - 240, height / 2, '🏰 던전 입장', '#3b82f6', () => {
            this.scene.start('DungeonScene');
        });

        // [Arena Button]
        this.createMenuButton(width / 2, height / 2, '⚔️ 아레나 입장', '#ef4444', () => {
            this.scene.start('ArenaScene');
        });

        // [Raid Button]
        this.createMenuButton(width / 2 + 240, height / 2, '👺 레이드 입장', '#9333ea', () => {
            this.scene.start('RaidScene');
        });
    }

    createMenuButton(x, y, label, color, callback) {
        const btnBg = this.add.rectangle(0, 0, 200, 60, 0x1e293b).setInteractive({ useHandCursor: true });
        const btnText = this.add.text(0, 0, label, { fontSize: '24px', fill: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        const container = this.add.container(x, y, [btnBg, btnText]);

        btnBg.on('pointerover', () => {
            btnBg.setFillStyle(Phaser.Display.Color.HexStringToColor(color).color);
            container.setScale(1.1);
        });

        btnBg.on('pointerout', () => {
            btnBg.setFillStyle(0x1e293b);
            container.setScale(1.0);
        });

        btnBg.on('pointerdown', () => {
            callback();
        });

        return container;
    }
}
