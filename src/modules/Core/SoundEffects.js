// src/modules/Core/SoundEffects.js

class SoundEffects {
    constructor() {
        this.audioCtx = null;
        this.initialized = false;
        this.masterSFXGain = null;

        const savedVol = localStorage.getItem('sfxVolume');
        this.sfxVolume = savedVol !== null ? parseFloat(savedVol) : 0.8;

        this.sfxMuted = localStorage.getItem('sfxMuted') === 'true';
        this.vibrationEnabled = localStorage.getItem('vibrationEnabled') !== 'false'; // Default ON

        console.log(`[SoundEffects] Constructor: Volume=${this.sfxVolume}, Muted=${this.sfxMuted}`);
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();

            // Create Master SFX Gain Node
            this.masterSFXGain = this.audioCtx.createGain();
            this.masterSFXGain.connect(this.audioCtx.destination);
            this.updateSFXGain();

            this.initialized = true;
            console.log('[SoundEffects] Web Audio API Initialized. MasterSFXGain:', this.masterSFXGain);
            console.log('[SoundEffects] MasterSFXGain connected to destination:', this.audioCtx.destination);

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
        console.log('[SoundEffects] Connecting masterGain to masterSFXGain:', this.masterSFXGain);
        masterGain.connect(this.masterSFXGain);

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
        masterGain.connect(this.masterSFXGain);
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
        masterGain.connect(this.masterSFXGain);
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
        masterGain.connect(this.masterSFXGain);
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
        masterGain.connect(this.masterSFXGain);
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
        masterGain.connect(this.masterSFXGain);
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
            masterGain.connect(this.masterSFXGain);
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

    // --- NEW EFFECTS ---

    // 7. "땨라란~" (Gacha Arpeggio)
    async playGachaSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const startNow = ctx.currentTime;

        const sequence = [
            { f: 523.25, d: 0.1 }, // C5
            { f: 659.25, d: 0.1 }, // E5
            { f: 783.99, d: 0.1 }, // G5
            { f: 1046.50, d: 0.4 } // C6
        ];

        sequence.forEach((note, idx) => {
            const time = startNow + idx * 0.08;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, time);

            g.gain.setValueAtTime(0, time);
            g.gain.linearRampToValueAtTime(0.3, time + 0.02);
            g.gain.exponentialRampToValueAtTime(0.01, time + note.d);

            osc.connect(g);
            g.connect(this.masterSFXGain);

            osc.start(time);
            osc.stop(time + note.d);
        });
    }

    // 8. "쿠쿵!" (Heavy Impact) - 킹 마젠타 드라이브
    async playMagentaDriveSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        // 1st Impact ("쿠") - Increased gain and lower freq
        this.playLowImpact(ctx, ctx.currentTime, 70, 0.4, 0.8);
        // 2nd Impact ("쿵") - Heavily increased gain
        this.playLowImpact(ctx, ctx.currentTime + 0.1, 35, 0.8, 1.2);
    }

    playLowImpact(ctx, time, freq, duration, gain = 0.6) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(10, time + duration);

        g.gain.setValueAtTime(gain, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(g);
        g.connect(this.masterSFXGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    // 11. "쾅!" (Lightning Smite/Explosion) - 본 스마이트
    async playSmiteSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        // Sharp lightning crack (Noise)
        const noiseGen = () => {
            const bufSize = ctx.sampleRate * 0.2;
            const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
            return buf;
        };

        const noise = ctx.createBufferSource();
        noise.buffer = noiseGen();
        const noiseG = ctx.createGain();
        noiseG.gain.setValueAtTime(0.8, ctx.currentTime);
        noiseG.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 800;

        noise.connect(filter);
        filter.connect(noiseG);
        noiseG.connect(this.masterSFXGain);
        noise.start(ctx.currentTime);

        // Low "Kwang" boom
        this.playLowImpact(ctx, ctx.currentTime, 120, 0.5, 0.9);
    }

    // 12. "쟈쟈잔~" (Upbeat/Trumpet-like) - 니클 전술 지휘
    async playJajajanSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const notes = [
            { freq: 392, duration: 0.15 }, // G4
            { freq: 392, duration: 0.15 }, // G4
            { freq: 523, duration: 0.4 }   // C5
        ];

        notes.forEach((note, i) => {
            const time = ctx.currentTime + i * 0.15;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(note.freq, time);
            g.gain.setValueAtTime(0.15, time);
            g.gain.exponentialRampToValueAtTime(0.01, time + note.duration);
            osc.connect(g);
            g.connect(this.masterSFXGain);
            osc.start(time);
            osc.stop(time + note.duration);
        });
    }

    // 13. "븅~" (Whistle/Slide) - 레오나 융단 폭격
    async playByungSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.6);
        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        osc.connect(g);
        g.connect(this.masterSFXGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
    }

    // 14. "아아~" (Ethereal/Angel) - 세라 수호천사
    async playAaahSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const freqs = [440, 554, 659]; // A Major triad
        freqs.forEach(f => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, ctx.currentTime);
            g.gain.setValueAtTime(0, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);
            osc.connect(g);
            g.connect(this.masterSFXGain);
            osc.start();
            osc.stop(ctx.currentTime + 2.0);
        });
    }

    // 15. "빠밤!" (Victory/Timpani) - 바오 가라 바바오
    async playPpabamSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const times = [0, 0.15];
        const notes = [110, 82]; // A2, E2
        times.forEach((t, i) => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(notes[i], ctx.currentTime + t);
            osc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + t + 0.3);
            g.gain.setValueAtTime(0.5, ctx.currentTime + t);
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + t + 0.3);
            osc.connect(g);
            g.connect(this.masterSFXGain);
            osc.start(ctx.currentTime + t);
            osc.stop(ctx.currentTime + t + 0.3);
        });
    }

    // 16. "찌징-" (Creepy/Metal) - 나나 피를 다오
    async playSpookyJjijingSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.5);

        // Add frequency modulation for "horror" vibe
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 15;
        lfoGain.gain.value = 20;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        g.gain.setValueAtTime(0.3, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);

        osc.connect(g);
        g.connect(this.masterSFXGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
        lfo.stop(ctx.currentTime + 0.5);
    }

    // 17. "딴 따단" (Cute/Short) - 노아 노엘
    async playCuteTtanTadanSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const notes = [
            { f: 523.25, t: 0 },    // C5
            { f: 659.25, t: 0.15 }, // E5
            { f: 783.99, t: 0.3 }   // G5
        ];

        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.f, ctx.currentTime + n.t);
            g.gain.setValueAtTime(0.2, ctx.currentTime + n.t);
            g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + n.t + 0.15);
            osc.connect(g);
            g.connect(this.masterSFXGain);
            osc.start(ctx.currentTime + n.t);
            osc.stop(ctx.currentTime + n.t + 0.15);
        });
    }

    // 18. "휘이이잉" (Wind) - 아이나 아이스 스톰
    async playWindSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const bufSize = ctx.sampleRate * 2.0;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);
        filter.Q.value = 10;
        filter.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 1.0);
        filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 2.0);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.5);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

        src.connect(filter);
        filter.connect(g);
        g.connect(this.masterSFXGain);
        src.start();
    }

    // 19. "지직" (Electric Crackle) - 레오나 전기 수류탄
    async playJijigSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const duration = 0.3;
        const bufSize = ctx.sampleRate * duration;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);

        for (let i = 0; i < bufSize; i++) {
            // White noise with periodic gaps for "crackle"
            data[i] = (Math.random() * 2 - 1) * (Math.sin(i * 0.05) > 0.8 ? 1 : 0.2);
        }

        const src = ctx.createBufferSource();
        src.buffer = buf;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        src.connect(filter);
        filter.connect(g);
        g.connect(this.masterSFXGain);
        src.start();
    }

    // 20. "쿵!" (Stone Impact) - 바오 스톤 블래스트
    async playStoneImpactSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        this.playLowImpact(ctx, ctx.currentTime, 80, 0.4, 0.4);

        // Add a bit of noise for the "crunch"
        const noise = ctx.createOscillator();
        const noiseG = ctx.createGain();
        noise.type = 'triangle';
        noise.frequency.setValueAtTime(40, ctx.currentTime);
        noiseG.gain.setValueAtTime(0.2, ctx.currentTime);
        noiseG.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
        noise.connect(noiseG);
        noiseG.connect(this.masterSFXGain);
        noise.start();
        noise.stop(ctx.currentTime + 0.2);
    }

    // 21. "뵹뵹뵹" (Bouncy) - 나나 뮤지컬매지컬크리티컬
    async playByongSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const notes = [
            { f: 880, t: 0 },
            { f: 1100, t: 0.1 },
            { f: 1320, t: 0.2 }
        ];

        notes.forEach(n => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.f, ctx.currentTime + n.t);
            osc.frequency.exponentialRampToValueAtTime(n.f / 2, ctx.currentTime + n.t + 0.1);
            g.gain.setValueAtTime(0.1, ctx.currentTime + n.t);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + n.t + 0.1);
            osc.connect(g);
            g.connect(this.masterSFXGain);
            osc.start(ctx.currentTime + n.t);
            osc.stop(ctx.currentTime + n.t + 0.1);
        });
    }

    // 22. "또르륵!" (Rolling/Ripple) - 노아/노엘
    async playTtorureukSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        for (let i = 0; i < 6; i++) {
            const time = ctx.currentTime + i * 0.05;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000 + i * 200, time);
            g.gain.setValueAtTime(0.08, time);
            g.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            osc.connect(g);
            g.connect(this.masterSFXGain);
            osc.start(time);
            osc.stop(time + 0.05);
        }
    }

    // 23. "쩌정!" (Ice Shatter) - 아이나 아이스볼
    async playIceShatterSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        // High frequency "ping"
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(3000, ctx.currentTime);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(g);
        g.connect(this.masterSFXGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);

        // Noise burst for "shatter"
        const bufSize = ctx.sampleRate * 0.15;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const noiseG = ctx.createGain();
        noiseG.gain.setValueAtTime(0.1, ctx.currentTime);
        noiseG.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        src.connect(noiseG);
        noiseG.connect(this.masterSFXGain);
        src.start();
    }

    // 9. "아아~" (Choir/Pad) - 본 네 존재를 증명해보아라
    async playProveExistenceSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const duration = 2.0;

        const frequencies = [329.63, 392.00, 523.25]; // E4, G4, C5 (C Major)

        frequencies.forEach(f => {
            const osc = ctx.createOscillator();
            const g = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = f;

            g.gain.setValueAtTime(0, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.5);
            g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

            osc.connect(g);
            g.connect(this.masterSFXGain);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        });
    }

    // 10. "삥~삥~삥~" (High Pluck) - 실비 죄송합니다
    async playSylvieSorrySound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

        g.gain.setValueAtTime(0.2, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        osc.connect(filter);
        filter.connect(g);
        g.connect(this.masterSFXGain);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    }

    // 24. "파팟!" (Sharp Burst/Spark) - 원소 노바 효과
    async playPapatSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const duration = 0.15;
        const masterGain = ctx.createGain();
        masterGain.connect(this.masterSFXGain);
        masterGain.gain.setValueAtTime(0.4, ctx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + duration);

        osc.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    // 25. "뾰롱!" (Cute/High Pluck) - 햄버거 회복 효과
    async playBbyorongSound() {
        await this.ensureContext();
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;

        const duration = 0.3;
        const masterGain = ctx.createGain();
        masterGain.connect(this.masterSFXGain);
        masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
        masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6 jump

        osc.connect(masterGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    // Vibration Wrapper
    vibrate(pattern) {
        if (!this.vibrationEnabled) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
                navigator.vibrate(pattern);
            } catch (e) {
                console.warn('[SoundEffects] Vibration failed', e);
            }
        }
    }

    updateSFXGain() {
        if (!this.masterSFXGain) {
            console.warn('[SoundEffects] updateSFXGain failed: masterSFXGain is null');
            return;
        }
        const vol = this.sfxMuted ? 0 : this.sfxVolume;
        console.log(`[SoundEffects] Updating SFX Gain: Volume=${this.sfxVolume}, Muted=${this.sfxMuted} -> Final Gain=${vol}`);

        // Check if audioCtx is suspended
        if (this.audioCtx && this.audioCtx.state === 'running') {
            this.masterSFXGain.gain.setTargetAtTime(vol, this.audioCtx.currentTime, 0.05);
        } else {
            console.log('[SoundEffects] AudioContext not running, setting gain value directly.');
            this.masterSFXGain.gain.value = vol;
        }
    }

    setSFXVolume(v) {
        this.sfxVolume = v;
        localStorage.setItem('sfxVolume', v);
        this.updateSFXGain();
    }

    setSFXMuted(m) {
        this.sfxMuted = m;
        localStorage.setItem('sfxMuted', m);
        this.updateSFXGain();
    }

    setVibrationEnabled(e) {
        this.vibrationEnabled = e;
        localStorage.setItem('vibrationEnabled', e);
    }

    // --- Common Utility Sounds for SpeechBubble & FXManager ---

    play8BitBeep(pitch = 600) {
        if (!this.initialized) this.init();
        if (!this.audioCtx || !this.masterSFXGain) return;

        try {
            const ctx = this.audioCtx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(pitch + (Math.random() * 50 - 25), ctx.currentTime);

            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(this.masterSFXGain);

            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch (e) {
            console.warn('[SoundEffects] play8BitBeep failed', e);
        }
    }

    play8BitHitSound(isCritical, amount) {
        if (!this.initialized) this.init();
        if (!this.audioCtx || !this.masterSFXGain) return;

        try {
            const ctx = this.audioCtx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            let startFreq = 200 + Math.random() * 100;
            let endFreq = 50 + Math.random() * 50;
            let duration = 0.1;
            let vol = 0.08;

            const isMiss = amount === 'MISS!';
            const isHeal = typeof amount === 'string' && amount.startsWith('+');

            if (isHeal) return;

            if (isMiss) {
                osc.type = 'triangle';
                startFreq = 800 + Math.random() * 100;
                endFreq = 800;
                duration = 0.05;
                vol = 0.03;
            } else if (isCritical) {
                osc.type = 'sawtooth';
                startFreq = 400 + Math.random() * 200;
                endFreq = 80;
                duration = 0.2;
                vol = 0.12;

                const dist = ctx.createWaveShaper();
                const makeDistortionCurve = (amount) => {
                    let k = typeof amount === 'number' ? amount : 50,
                        n_samples = 44100,
                        curve = new Float32Array(n_samples),
                        deg = Math.PI / 180,
                        i = 0,
                        x;
                    for (; i < n_samples; ++i) {
                        x = i * 2 / n_samples - 1;
                        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
                    }
                    return curve;
                };
                dist.curve = makeDistortionCurve(50);
                dist.oversample = '4x';

                osc.connect(dist);
                dist.connect(gain);
            } else {
                osc.type = 'square';
                if (typeof amount === 'number' && amount > 100) {
                    startFreq = 150 + Math.random() * 50;
                    endFreq = 40;
                    duration = 0.15;
                    vol = 0.1;
                } else if (typeof amount === 'number' && amount <= 5) {
                    startFreq = 600 + Math.random() * 100;
                    endFreq = 400;
                    duration = 0.06;
                    vol = 0.05;
                }
                osc.connect(gain);
            }

            osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
            if (!isMiss) {
                osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
            }

            gain.gain.setValueAtTime(vol, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            gain.connect(this.masterSFXGain);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('[SoundEffects] play8BitHitSound failed', e);
        }
    }
}

// 싱글톤 패턴으로 내보냄
const soundEffects = new SoundEffects();
export default soundEffects;
