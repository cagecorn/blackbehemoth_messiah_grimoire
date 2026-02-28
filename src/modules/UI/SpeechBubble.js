import Phaser from 'phaser';

// Initialize Web Audio API for 8-bit beeps
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function play8BitBeep(pitch = 600) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        // Randomize pitch slightly for organic typing feel
        osc.frequency.setValueAtTime(pitch + (Math.random() * 50 - 25), audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
        // Ignore audio errors if blocked
    }
}

/**
 * SpeechBubble
 * A visual component that renders a comic-style bubble with text.
 * Automatically follows a target unit and fades out after a duration.
 */
export default class SpeechBubble extends Phaser.GameObjects.Container {
    constructor(scene, target, text, duration = 3000) {
        // Initialize at target position
        super(scene, target.x, target.y);
        this.scene = scene;
        this.target = target;
        this.scene.add.existing(this);

        this.setDepth(20000); // Higher than health bars (9999) and FX

        const padding = 10;
        const fontSize = '14px';
        const maxWidth = 220;

        const isThought = text.startsWith('[깊은 사고]');
        let mainText = text;
        let thoughtContent = '';

        if (isThought) {
            const splitIdx = text.indexOf('\n');
            if (splitIdx !== -1) {
                thoughtContent = text.substring(0, splitIdx).trim();
                mainText = text.substring(splitIdx + 1).trim();
            } else {
                thoughtContent = '[깊은 사고]';
                mainText = text.replace('[깊은 사고]', '').trim();
            }
        }

        // Create Container for text elements
        const textContainer = this.scene.add.container(0, 0);

        if (isThought) {
            // Create Thought Text (Italic, Gray, word wrap support)
            this.thoughtTextObj = this.scene.add.text(0, 0, thoughtContent, {
                fontSize: '11px',
                fill: '#777',
                fontStyle: 'italic',
                align: 'center',
                wordWrap: { width: maxWidth - padding * 2 }
            });

            const thoughtBounds = this.thoughtTextObj.getBounds();

            // Create Main Text below thought (Init empty for typewriter)
            this.textObj = this.scene.add.text(0, thoughtBounds.height + 6, '', {
                fontSize,
                fill: '#000',
                align: 'center',
                wordWrap: { width: maxWidth - padding * 2 }
            });

            // We need a dummy text to calculate full dimensions
            const dummyText = this.scene.add.text(0, thoughtBounds.height + 6, mainText, {
                fontSize,
                wordWrap: { width: maxWidth - padding * 2 }
            });
            textContainer.add([this.thoughtTextObj, this.textObj, dummyText]);
            this.dummyText = dummyText; // Store to calculate bounds, hide it later
            dummyText.setVisible(false);

        } else {
            // Create Normal Text (Init empty for typewriter)
            this.textObj = this.scene.add.text(0, 0, '', {
                fontSize,
                fill: '#000',
                align: 'center',
                wordWrap: { width: maxWidth - padding * 2 }
            });

            // Dummy text for bounds calculation
            const dummyText = this.scene.add.text(0, 0, mainText, {
                fontSize,
                wordWrap: { width: maxWidth - padding * 2 }
            });
            textContainer.add([this.textObj, dummyText]);
            this.dummyText = dummyText;
            dummyText.setVisible(false);
        }

        // Calculate dimensions
        const bounds = textContainer.getBounds();
        const width = Math.min(maxWidth, bounds.width + padding * 2);
        const height = bounds.height + padding * 2;

        // Position text relative to container
        textContainer.setPosition(-width / 2 + padding, -height - 50 + padding);

        // Graphics for the bubble background
        this.bubble = this.scene.add.graphics();
        this.bubble.fillStyle(0xffffff, 1);
        this.bubble.lineStyle(2, 0x000000, 1);

        // Draw bubble rectangle
        const bubbleX = -width / 2;
        const bubbleY = -height - 50;
        this.bubble.fillRoundedRect(bubbleX, bubbleY, width, height, 8);
        this.bubble.strokeRoundedRect(bubbleX, bubbleY, width, height, 8);

        // Draw pointer (stem)
        this.bubble.beginPath();
        this.bubble.moveTo(-10, -50);
        this.bubble.lineTo(0, -35);
        this.bubble.lineTo(10, -50);
        this.bubble.closePath();
        this.bubble.fillPath();
        this.bubble.strokePath();

        this.add(this.bubble);
        this.add(textContainer);

        // Life cycle - Fade in
        this.alpha = 0;
        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 200,
            ease: 'Power2'
        });

        // Typewriter Effect
        let typeIndex = 0;
        const typeSpeed = 40; // ms per char
        this.typewriterTimer = this.scene.time.addEvent({
            delay: typeSpeed,
            callback: () => {
                if (typeIndex < mainText.length) {
                    this.textObj.text += mainText[typeIndex];
                    // Play beep for non-space characters
                    if (mainText[typeIndex] !== ' ' && mainText[typeIndex] !== '\n') {
                        // Pitch mapping: higher pitch for higher characters (just random flavor)
                        play8BitBeep(600 + (Math.random() * 200 - 100));
                    }
                    typeIndex++;
                } else {
                    this.typewriterTimer.remove();
                }
            },
            callbackScope: this,
            loop: true
        });

        // Auto-destruction timer (start after typewriter finishes roughly)
        const totalDuration = duration + (mainText.length * 40);
        this.destroyTimer = this.scene.time.delayedCall(totalDuration, () => {
            if (this.scene && this.active) {
                this.scene.tweens.add({
                    targets: this,
                    alpha: 0,
                    duration: 500,
                    onComplete: () => {
                        if (this.active) this.destroy();
                    }
                });
            }
        });
    }

    destroy(fromScene) {
        if (this.typewriterTimer) this.typewriterTimer.remove();
        if (this.destroyTimer) this.destroyTimer.remove();
        super.destroy(fromScene);
    }

    /**
     * Phaser internal preUpdate - perfect for following late-physics updates
     */
    preUpdate(time, delta) {
        if (!this.target || !this.target.active || this.target.hp <= 0) {
            this.destroy();
            return;
        }

        // Smoothly follow target position
        this.x = this.target.x;
        this.y = this.target.y;
    }
}
