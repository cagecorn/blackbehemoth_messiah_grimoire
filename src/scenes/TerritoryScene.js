import Phaser from 'phaser';
import EventBus from '../modules/Events/EventBus.js';
import localizationManager from '../modules/Core/LocalizationManager.js';

// ============================================================
// Banner definitions — easy to extend by adding more entries
// ============================================================
export default class TerritoryScene extends Phaser.Scene {
    constructor() {
        super('TerritoryScene');
    }

    create() {
        if (this.game.uiManager) {
            this.game.uiManager.scene = this;
        }

        // Ensure UI is synced for initial boot
        EventBus.emit(EventBus.EVENTS.SCENE_CHANGED, 'TerritoryScene');

        const { width, height } = this.scale;

        // Play Random Territory BGM
        this.sound.stopAll();
        const territoryBgms = [
            'terretory_bgm', 'terretory_bgm_2', 'terretory_bgm_3', 'terretory_bgm_4',
            'terretory_bgm_5', 'terretory_bgm_6', 'terretory_bgm_7'
        ];
        const randomBgm = territoryBgms[Math.floor(Math.random() * territoryBgms.length)];
        this.bgm = this.sound.add(randomBgm, { volume: 0.4, loop: true });
        this.bgm.play();

        // Solid dark background (canvas)
        this.add.rectangle(0, 0, width, height, 0x0a0506).setOrigin(0, 0);

        // Show modular Territory UI
        if (this.game.uiManager && this.game.uiManager.territoryUI) {
            this.game.uiManager.territoryUI.show();
        }

        // Clean up on scene shutdown/sleep
        const cleanup = () => {
            if (this.game.uiManager && this.game.uiManager.territoryUI) {
                this.game.uiManager.territoryUI.hide();
            }
        };
        this.events.on('shutdown', cleanup);
        this.events.on('sleep', cleanup);

        console.log('[TerritoryScene] 영지 씬 생성 완료 — 모듈형 UI 적용');
    }
}
