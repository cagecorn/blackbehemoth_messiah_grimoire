import EventBus from '../Events/EventBus.js';

export const MUSIC_TRACKS = [
    { id: 'lo_fi_track_1', category: 'LOFI', name: 'Lofi Track 1', path: 'assets/BGM/lo_fi_track_1.mp3', cost: 50000 },
    { id: 'lo_fi_track_2', category: 'LOFI', name: 'Lofi Track 2', path: 'assets/BGM/lo_fi_track_2.mp3', cost: 50000 },
    { id: 'meditation_track_1', category: 'MEDITATION', name: 'Meditation 1', path: 'assets/BGM/meditation_track_1.mp3', cost: 50000 },
    { id: 'meditation_track_2', category: 'MEDITATION', name: 'Meditation 2', path: 'assets/BGM/meditation_track_2.mp3', cost: 50000 },
    { id: 'fantasy_track_1', category: 'FANTASY', name: 'Fantasy 1', path: 'assets/BGM/fantasy_track_1.mp3', cost: 50000 },
    { id: 'fantasy_track_2', category: 'FANTASY', name: 'Fantasy 2', path: 'assets/BGM/fantasy_track_2.mp3', cost: 50000 }
];

export default class MusicManager {
    constructor(game) {
        this.game = game;
        this.playlist = [];
        this.currentTrackIndex = -1;
        this.currentSound = null;
        this.repeat = true;
        this.volume = 0.4;
        this.isCustomPlaylistMode = false;
    }

    setPlaylist(trackIds) {
        this.playlist = trackIds.map(id => MUSIC_TRACKS.find(t => t.id === id)).filter(Boolean);
        this.currentTrackIndex = 0;
        console.log('[MusicManager] Playlist updated:', this.playlist.map(t => t.id));
    }

    startPlaylist() {
        if (this.playlist.length === 0) {
            console.warn('[MusicManager] Cannot start empty playlist.');
            return;
        }
        this.isCustomPlaylistMode = true;
        this.playTrack(0);
    }

    stopPlaylist() {
        this.isCustomPlaylistMode = false;
        if (this.currentSound) {
            this.currentSound.stop();
        }
    }

    playTrack(index) {
        if (!this.game || !this.game.sound) {
            console.error('[MusicManager] Game sound system not initialized.');
            return;
        }

        if (this.currentSound) {
            this.currentSound.stop();
        }

        if (this.playlist.length === 0) return;

        this.currentTrackIndex = index % this.playlist.length;
        const track = this.playlist[this.currentTrackIndex];

        console.log(`[MusicManager] Playing: ${track.name} (${track.id})`);

        // Ensure track is loaded (handled by BootScene normally, but safe-check)
        try {
            this.currentSound = this.game.sound.add(track.id, { volume: this.volume, loop: false });
            this.currentSound.play();

            this.currentSound.once('complete', () => {
                if (this.isCustomPlaylistMode) {
                    this.playTrack(this.currentTrackIndex + 1);
                }
            });
        } catch (e) {
            console.error('[MusicManager] Error playing track:', e);
            // Fallback: try next one if current fails
            if (this.isCustomPlaylistMode) {
                setTimeout(() => this.playTrack(index + 1), 1000);
            }
        }
    }

    setVolume(vol) {
        this.volume = vol;
        if (this.currentSound) {
            this.currentSound.setVolume(vol);
        }
    }

    isPlaying() {
        return this.currentSound && this.currentSound.isPlaying;
    }
}
