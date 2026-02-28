// src/modules/Core/SoundEffects.js

class SoundEffects {
    constructor() {
        this.audioCtx = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.initialized = true;
            console.log('[SoundEffects] Web Audio API Initialized');

            // 브라우저 오디오 자동 재생 정책(Autoplay policy) 대응
            const unlockAudio = async () => {
                if (this.audioCtx.state === 'suspended') {
                    await this.audioCtx.resume();
                    console.log('[SoundEffects] AudioContext unlocked by user gesture');
                }
                // 한 번 풀린 후에는 리스너 제거
                window.removeEventListener('pointerdown', unlockAudio);
                window.removeEventListener('keydown', unlockAudio);
            };
            window.addEventListener('pointerdown', unlockAudio, { once: true });
            window.addEventListener('keydown', unlockAudio, { once: true });
        } catch (e) {
            console.warn('[SoundEffects] Web Audio API not supported', e);
        }
    }

    // 재생 전 컨텍스트가 suspended 상태(보통 브라우저 정책)면 재개
    async ensureContext() {
        if (!this.initialized) this.init();
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }
    }

    /**
     * 궁극기 사용 시 "콰창~" 하는 무거운 타격음/폭발음 절차적 생성
     */
    async playUltimateSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;

        const ctx = this.audioCtx;
        const duration = 1.2;

        // 메인 게인(볼륨) 노드
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);

        // 터지는 타격감을 위한 빠른 어택, 느린 릴리즈
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05); // Attack
        masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration); // Decay/Release

        // 1. Noise Generator (폭발의 거친 질감 "콰아아")
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // 노이즈에 로우패스 핑터 적용 (어두운 폭발음 형성)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(masterGain);

        // 2. Oscillator (타격의 무게감 "쿵!")
        const osc = ctx.createOscillator();
        osc.type = 'sine'; // 묵직함을 위해 사인파
        // 주파수를 타격 순간 급격히 낮춤 (피치 드롭)
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.3);

        const oscGain = ctx.createGain();
        oscGain.connect(masterGain);
        oscGain.gain.setValueAtTime(0.6, ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.connect(oscGain);

        // 재생
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);

        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + duration);
    }

    // 1. "탕!" (Gunshot) - 엘라 넉백샷
    async playGunshotSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const duration = 0.3;
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0.8, ctx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 500;

        noise.connect(filter);
        filter.connect(masterGain);

        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + duration);
    }

    // 2. "촤~촤~촤~" (Whip/Swish) - 엘라 운명의 끈
    async playWhipSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const duration = 0.2;
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.05);
        masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + duration);

        osc.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    // 3. "뾰롱!" (Heal) - 세라 매스힐
    async playHealSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const duration = 0.6;
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.1); // jump

        osc.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    // 4. "우웅~" (Angel Hum) - 세라 수호천사
    async playAngelSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const duration = 1.5;
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.5);
        masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.value = 220;

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 222; // beat frequency

        osc1.connect(masterGain);
        osc2.connect(masterGain);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + duration);
        osc2.stop(ctx.currentTime + duration);
    }

    // 5. "화륵~" (Fireball) - 멀린 파이어볼/메테오
    async playFireballSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const duration = 0.5;
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.1);
        masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        // Fire is predominantly low-mid noisy swish
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(100, ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(800, ctx.currentTime + duration);

        noise.connect(filter);
        filter.connect(masterGain);

        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + duration);
    }

    // 6. "띠리링~" (Harp/Arp) - 루트 노래/사이렌
    async playHarpSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const noteDuration = 0.3;

        notes.forEach((freq, idx) => {
            const time = ctx.currentTime + idx * 0.1; // arp speed

            const masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.setValueAtTime(0, time);
            masterGain.gain.linearRampToValueAtTime(0.3, time + 0.05);
            masterGain.gain.exponentialRampToValueAtTime(0.01, time + noteDuration);

            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            osc.connect(masterGain);
            osc.start(time);
            osc.stop(time + noteDuration);
        });
    }
}


// 싱글톤 패턴으로 내보냄
const soundEffects = new SoundEffects();
export default soundEffects;
