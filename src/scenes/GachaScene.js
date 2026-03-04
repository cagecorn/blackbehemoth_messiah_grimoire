import Phaser from 'phaser';
import GachaManager from '../modules/Core/GachaManager.js';
import DBManager from '../modules/Database/DBManager.js';
import EventBus from '../modules/Events/EventBus.js';
import SoundEffects from '../modules/Core/SoundEffects.js';

export default class GachaScene extends Phaser.Scene {
    constructor() {
        super('GachaScene');
    }

    async create() {
        if (this.game.uiManager) {
            this.game.uiManager.scene = this;
        }
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        const bg = this.add.image(0, 0, 'bg_gacha').setOrigin(0, 0);
        bg.setDisplaySize(width, height);

        // Header UI (DOM)
        this.createDOMUI();

        // Cards Container for Animation
        this.cardsContainer = this.add.container(0, 0);
        this.cardsContainer.setDepth(10);

        // Particles
        this.particles = this.add.particles(0, 0, 'emoji_sparkles', {
            x: width / 2,
            y: height / 2,
            speed: { min: -200, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 1500,
            emitting: false,
            quantity: 20
        });
        this.particles.setDepth(5);

        // Register scene with UIManager
        EventBus.emit(EventBus.EVENTS.PARTY_DEPLOYED, {
            scene: this,
            mercenaries: [] // No active mercenaries in Gacha
        });
    }

    async createDOMUI() {
        if (this.uiContainer) this.uiContainer.remove();

        this.uiContainer = document.createElement('div');
        this.uiContainer.className = 'gacha-ui-wrapper';
        this.uiContainer.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; display: flex; flex-direction: column;
            align-items: center; justify-content: space-between; padding: 60px 20px 20px 20px; box-sizing: border-box;
            z-index: 1000;
        `;

        // Title Element removed to prevent overlap with global HUD
        // Put in an empty div so justify-content: space-between still pushes the bottom button down
        const topSpacer = document.createElement('div');
        this.uiContainer.appendChild(topSpacer);
        // Bottom Action Area
        const bottomArea = document.createElement('div');
        bottomArea.style.cssText = `pointer-events: auto; margin-bottom: 50px; text-align: center; display: flex; flex-direction: column; gap: 15px;`;

        this.pullBtn = document.createElement('button');
        this.pullBtn.innerHTML = `5연속 영입<br><span style="font-size: 16px; color: #fbbf24; text-shadow: 0 1px 2px rgba(0,0,0,1);">💎 ${GachaManager.COST_PER_PULL * 5} 다이아</span>`;
        this.pullBtn.style.cssText = `
            padding: 15px 50px; font-size: 24px; font-weight: bold;
            background: linear-gradient(135deg, #a855f7, #6366f1);
            color: white; border: 3px solid #e0e7ff; border-radius: 16px;
            cursor: pointer; box-shadow: 0 10px 20px rgba(0,0,0,0.5);
            transition: transform 0.2s, background 0.2s;
        `;
        this.pullBtn.onmouseover = () => {
            this.pullBtn.style.transform = 'scale(1.05)';
            this.pullBtn.style.background = 'linear-gradient(135deg, #c084fc, #818cf8)';
        };
        this.pullBtn.onmouseout = () => {
            this.pullBtn.style.transform = 'scale(1)';
            this.pullBtn.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
        };
        this.pullBtn.onclick = () => this.executeGacha();

        // --- Pet Pull Button ---
        this.petPullBtn = document.createElement('button');
        this.petPullBtn.innerHTML = `펫 영입 (1마리)<br><span style="font-size: 16px; color: #fbbf24; text-shadow: 0 1px 2px rgba(0,0,0,1);">💎 ${GachaManager.COST_PET_PULL} 다이아</span>`;
        this.petPullBtn.style.cssText = `
            padding: 12px 40px; font-size: 18px; font-weight: bold;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white; border: 3px solid #d1fae5; border-radius: 16px;
            cursor: pointer; box-shadow: 0 10px 20px rgba(0,0,0,0.5);
            transition: transform 0.2s, background 0.2s;
        `;
        this.petPullBtn.onmouseover = () => {
            this.petPullBtn.style.transform = 'scale(1.05)';
            this.petPullBtn.style.background = 'linear-gradient(135deg, #34d399, #10b981)';
        };
        this.petPullBtn.onmouseout = () => {
            this.petPullBtn.style.transform = 'scale(1)';
            this.petPullBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        };
        this.petPullBtn.onclick = () => this.executePetGacha();

        bottomArea.appendChild(this.pullBtn);
        bottomArea.appendChild(this.petPullBtn);
        this.uiContainer.appendChild(bottomArea);

        document.body.appendChild(this.uiContainer);

        this.events.once('shutdown', () => {
            if (this.uiContainer) {
                this.uiContainer.remove();
                this.uiContainer = null;
            }
            if (this.resultModal) {
                this.resultModal.remove();
                this.resultModal = null;
            }
        });
    }

    updateGemsDisplay() {
        // Now fully handled by the global UIManager HUD
        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED);
    }

    async executeGacha() {
        this.pullBtn.disabled = true;
        this.pullBtn.style.opacity = '0.5';
        this.pullBtn.style.pointerEvents = 'none';

        if (this.titleArea) this.titleArea.style.opacity = '0';

        // Clear previous cards if any
        this.cardsContainer.removeAll(true);
        if (this.resultModal) {
            this.resultModal.remove();
            this.resultModal = null;
        }

        const result = await GachaManager.performGacha(5);

        if (!result.success) {
            alert(result.message);
            this.resetPullButton();
            return;
        }

        // Update gem display
        await this.updateGemsDisplay();

        // Start Sound Effect
        SoundEffects.playGachaSound();

        // Start Animation Phase
        await this.playGachaAnimation(result.pulled, result.mergeResults);
    }

    async executePetGacha() {
        this.petPullBtn.disabled = true;
        this.petPullBtn.style.opacity = '0.5';

        const result = await GachaManager.performPetGacha();

        if (!result.success) {
            this.game.uiManager?.showToast(result.message);
            this.petPullBtn.disabled = false;
            this.petPullBtn.style.opacity = '1';
            return;
        }

        await this.updateGemsDisplay();
        SoundEffects.playGachaSound();

        // Simplified Pet Animation (Single Card)
        await this.playGachaAnimation([result.pulled], result.mergeResult ? [result.mergeResult] : []);

        this.petPullBtn.disabled = false;
        this.petPullBtn.style.opacity = '1';
    }

    resetPullButton() {
        if (this.pullBtn) {
            this.pullBtn.disabled = false;
            this.pullBtn.style.opacity = '1';
            this.pullBtn.style.pointerEvents = 'auto';
        }
        if (this.titleArea) {
            this.titleArea.style.opacity = '1';
        }
    }

    playGachaAnimation(pulledCharacters, mergeResults) {
        return new Promise((resolve) => {
            const width = this.cameras.main.width;
            const height = this.cameras.main.height;

            // Flash effect
            const flash = this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0, 0).setDepth(20).setAlpha(0);
            this.tweens.add({
                targets: flash,
                alpha: 1,
                yoyo: true,
                duration: 200,
                onComplete: () => {
                    flash.destroy();
                    this.particles.start();
                    this.cameras.main.shake(300, 0.01);

                    this.showCards(pulledCharacters, mergeResults, resolve);
                }
            });
        });
    }

    showCards(characters, mergeResults, resolve) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const centerY = height / 2 - 30;

        let positions = [];
        let cardScale = 1.0;

        if (characters.length === 1) {
            // Single Centered Pull (e.g. Pet)
            positions = [{ x: width / 2, y: centerY }];
            cardScale = 1.8; // Make it much larger
        } else {
            // "W" Layout positions for 5 cards
            positions = [
                { x: width * 0.15, y: centerY - 40 },
                { x: width * 0.325, y: centerY + 40 },
                { x: width * 0.50, y: centerY - 40 },
                { x: width * 0.675, y: centerY + 40 },
                { x: width * 0.85, y: centerY - 40 }
            ];
            cardScale = 1.0;
        }

        let cardsRevealed = 0;

        characters.forEach((char, index) => {
            setTimeout(() => {
                const pos = positions[index];

                // Card Background
                const isBehemoth = char.rarity === 'BLACK_BEHEMOTH';
                const cardBg = this.add.graphics();
                if (isBehemoth) {
                    cardBg.fillStyle(0x020617, 0.95); // Deep black
                    cardBg.lineStyle(4, 0x8b5cf6); // Intense Purple border
                } else {
                    cardBg.fillStyle(0x1e293b, 0.95);
                    cardBg.lineStyle(3, 0xfbbf24);
                }
                cardBg.fillRoundedRect(-45, -60, 90, 120, 12);
                cardBg.strokeRoundedRect(-45, -60, 90, 120, 12);

                // Add nice internal glow / backdrop
                const glow = this.add.graphics();
                if (isBehemoth) {
                    glow.fillStyle(0xa78bfa, 0.5); // Stronger purple glow
                } else {
                    glow.fillStyle(0x60a5fa, 0.3);
                }
                glow.fillCircle(0, -10, 30);

                // Character Sprite
                const sprite = this.add.image(0, -10, char.sprite);
                sprite.setScale(isBehemoth ? 1.0 : 0.9); // Slightly larger for Behemoth

                // Name plate
                const nameText = this.add.text(0, 40, char.name.split(' (')[0], {
                    fontSize: isBehemoth ? '16px' : '14px',
                    fontFamily: 'Inter',
                    fontStyle: 'bold',
                    fill: isBehemoth ? '#a78bfa' : '#fff',
                    stroke: isBehemoth ? '#000' : 'transparent',
                    strokeThickness: isBehemoth ? 3 : 0
                }).setOrigin(0.5);

                const cardContainer = this.add.container(pos.x, pos.y - 50, [cardBg, glow, sprite, nameText]);
                cardContainer.setDepth(10);
                cardContainer.setScale(0); // Start completely scaled down
                cardContainer.setAlpha(0);

                this.cardsContainer.add(cardContainer);

                // Popup Animation (Rise up, spin and land)
                this.tweens.add({
                    targets: cardContainer,
                    scaleX: cardScale * 1.1,
                    scaleY: cardScale * 1.1,
                    y: pos.y,
                    alpha: 1,
                    duration: 300,
                    ease: 'Back.easeOut',
                    onComplete: () => {
                        this.tweens.add({
                            targets: cardContainer,
                            scaleX: cardScale,
                            scaleY: cardScale,
                            duration: 100
                        });
                        cardsRevealed++;
                        if (cardsRevealed === characters.length) {
                            setTimeout(() => {
                                this.particles.stop();
                                this.showMergeResults(mergeResults, resolve);
                            }, 1000); // give user a bit of time to look at pulls
                        }
                    }
                });
            }, index * 250); // fast pacing
        });
    }

    showMergeResults(mergeResults, resolve) {
        if (!mergeResults || mergeResults.length === 0) {
            this.resetPullButton();
            resolve();
            return;
        }

        // Show a modal for merges
        this.resultModal = document.createElement('div');
        this.resultModal.style.cssText = `
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: linear-gradient(to bottom, #1e1b4b, #312e81); border: 2px solid #f59e0b; border-radius: 20px;
            padding: 30px; text-align: center; color: white; width: 85%; max-width: 500px;
            z-index: 2000; box-shadow: 0 0 50px rgba(245, 158, 11, 0.4);
            display: flex; flex-direction: column; gap: 15px;
            animation: fadeIn 0.3s ease-out;
        `;

        const title = document.createElement('div');
        title.innerHTML = `✨ 자동 진화 발생! ✨`;
        title.style.cssText = `font-size: 28px; font-weight: 900; color: #fbbf24; margin-bottom: 15px; text-shadow: 0 4px 6px rgba(0,0,0,0.8);`;
        this.resultModal.appendChild(title);

        const listContainer = document.createElement('div');
        listContainer.style.cssText = `display: flex; flex-direction: column; gap: 10px; max-height: 40vh; overflow-y: auto;`;

        mergeResults.forEach(merge => {
            const item = document.createElement('div');
            item.style.cssText = `
                display: flex; align-items: center; justify-content: flex-start; gap: 20px; 
                background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; border-left: 4px solid #f59e0b;
            `;

            const isPet = !!merge.petId;
            const data = isPet ? merge.petData : merge.charData;
            const spritePath = isPet ? `assets/pet/${data.sprite}.png` : `assets/characters/party/${data.sprite}.png`;
            const name = data.name.split(' (')[0];

            item.innerHTML = `
                <div style="background: rgba(255,255,255,0.1); border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;">
                    <img src="${spritePath}" style="width: 40px; height: 40px; object-fit: contain;">
                </div>
                <div style="text-align: left; flex: 1;">
                    <div style="font-size: 18px; font-weight: bold; margin-bottom: 4px;">${name}</div>
                    <div style="font-size: 14px; color: #cbd5e1;">
                        <span style="color: #94a3b8; text-decoration: line-through;">${merge.fromStar}성 3명</span> ➔ 
                        <span style="color: #fbbf24; font-weight: bold; font-size: 18px;">${merge.toStar}성 진화 완료</span>
                    </div>
                </div>
            `;
            listContainer.appendChild(item);
        });

        this.resultModal.appendChild(listContainer);

        const okBtn = document.createElement('button');
        okBtn.innerText = '확인';
        okBtn.style.cssText = `
            margin-top: 20px; padding: 12px 30px; font-size: 18px; font-weight: bold; 
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white; border: none; border-radius: 12px; cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        `;
        okBtn.onclick = () => {
            this.resultModal.style.opacity = '0';
            setTimeout(() => {
                if (this.resultModal) this.resultModal.remove();
                this.resultModal = null;
                this.resetPullButton();
                resolve();
            }, 300);
        };
        this.resultModal.appendChild(okBtn);

        document.body.appendChild(this.resultModal);
    }
}
