import EventBus from '../Events/EventBus.js';

export const MUSIC_TRACKS = [
    // LOFI
    { id: 'lo_fi_track_1', category: 'LOFI', name: 'Lofi Track 1', path: 'assets/BGM/lo_fi_track_1.mp3', cost: 50000 },
    { id: 'lo_fi_track_2', category: 'LOFI', name: 'Lofi Track 2', path: 'assets/BGM/lo_fi_track_2.mp3', cost: 50000 },
    
    // MEDITATION
    { id: 'meditation_track_1', category: 'MEDITATION', name: 'Meditation 1', path: 'assets/BGM/meditation_track_1.mp3', cost: 50000 },
    { id: 'meditation_track_2', category: 'MEDITATION', name: 'Meditation 2', path: 'assets/BGM/meditation_track_2.mp3', cost: 50000 },
    
    // FANTASY
    { id: 'fantasy_track_1', category: 'FANTASY', name: 'Fantasy 1', path: 'assets/BGM/fantasy_track_1.mp3', cost: 50000 },
    { id: 'fantasy_track_2', category: 'FANTASY', name: 'Fantasy 2', path: 'assets/BGM/fantasy_track_2.mp3', cost: 50000 },

    // TERRITORY
    { id: 'terretory_bgm', category: 'TERRITORY', name: 'Territory Theme 1', path: 'assets/BGM/terretory_bgm.mp3', cost: 50000 },
    { id: 'terretory_bgm_2', category: 'TERRITORY', name: 'Territory Theme 2', path: 'assets/BGM/terretory_bgm_2.mp3', cost: 50000 },
    { id: 'terretory_bgm_3', category: 'TERRITORY', name: 'Territory Theme 3', path: 'assets/BGM/terretory_bgm_3.mp3', cost: 50000 },
    { id: 'terretory_bgm_4', category: 'TERRITORY', name: 'Territory Theme 4', path: 'assets/BGM/terretory_bgm_4.mp3', cost: 50000 },
    { id: 'terretory_bgm_5', category: 'TERRITORY', name: 'Territory Theme 5', path: 'assets/BGM/terretory_bgm_5.mp3', cost: 50000 },
    { id: 'terretory_bgm_6', category: 'TERRITORY', name: 'Territory Theme 6', path: 'assets/BGM/terretory_bgm_6.mp3', cost: 50000 },
    { id: 'terretory_bgm_7', category: 'TERRITORY', name: 'Territory Theme 7', path: 'assets/BGM/terretory_bgm_7.mp3', cost: 50000 },

    // DUNGEON
    { id: 'main_battle_bgm_1', category: 'DUNGEON', name: 'Dungeon Fight 1', path: 'assets/BGM/main_battle_bgm_1.mp3', cost: 50000 },
    { id: 'main_battle_bgm_2', category: 'DUNGEON', name: 'Dungeon Fight 2', path: 'assets/BGM/main_battle_bgm_2.mp3', cost: 50000 },
    { id: 'main_battle_bgm_3', category: 'DUNGEON', name: 'Dungeon Fight 3', path: 'assets/BGM/main_battle_bgm_3.mp3', cost: 50000 },
    { id: 'main_battle_bgm_4', category: 'DUNGEON', name: 'Dungeon Fight 4', path: 'assets/BGM/main_battle_bgm_4.mp3', cost: 50000 },
    { id: 'main_battle_bgm_5', category: 'DUNGEON', name: 'Dungeon Fight 5', path: 'assets/BGM/main_battle_bgm_5.mp3', cost: 50000 },
    { id: 'main_battle_bgm_6', category: 'DUNGEON', name: 'Dungeon Fight 6', path: 'assets/BGM/main_battle_bgm_6.mp3', cost: 50000 },
    { id: 'main_battle_bgm_7', category: 'DUNGEON', name: 'Dungeon Fight 7', path: 'assets/BGM/main_battle_bgm_7.mp3', cost: 50000 },
    { id: 'main_battle_bgm_8', category: 'DUNGEON', name: 'Dungeon Fight 8', path: 'assets/BGM/main_battle_bgm_8.mp3', cost: 50000 },
    { id: 'main_battle_bgm_9', category: 'DUNGEON', name: 'Dungeon Fight 9', path: 'assets/BGM/main_battle_bgm_9.mp3', cost: 50000 },
    { id: 'main_battle_bgm_10', category: 'DUNGEON', name: 'Dungeon Fight 10', path: 'assets/BGM/main_battle_bgm_10.mp3', cost: 50000 },
    { id: 'main_battle_bgm_11', category: 'DUNGEON', name: 'Dungeon Fight 11', path: 'assets/BGM/main_battle_bgm_11.mp3', cost: 50000 },

    // ARENA
    { id: 'arena_battle_bgm_1', category: 'ARENA', name: 'Arena Battle 1', path: 'assets/BGM/arena_battle_bgm_1.mp3', cost: 50000 },
    { id: 'arena_battle_bgm_2', category: 'ARENA', name: 'Arena Battle 2', path: 'assets/BGM/arena_battle_bgm_2.mp3', cost: 50000 },
    { id: 'arena_battle_bgm_3', category: 'ARENA', name: 'Arena Battle 3', path: 'assets/BGM/arena_battle_bgm_3.mp3', cost: 50000 },
    { id: 'arena_battle_bgm_4', category: 'ARENA', name: 'Arena Battle 4', path: 'assets/BGM/arena_battle_bgm_4.mp3', cost: 50000 },
    { id: 'arena_battle_bgm_5', category: 'ARENA', name: 'Arena Battle 5', path: 'assets/BGM/arena_battle_bgm_5.mp3', cost: 50000 },
    { id: 'arena_battle_bgm_6', category: 'ARENA', name: 'Arena Battle 6', path: 'assets/BGM/arena_battle_bgm_6.mp3', cost: 50000 },
    { id: 'arena_battle_bgm_7', category: 'ARENA', name: 'Arena Battle 7', path: 'assets/BGM/arena_battle_bgm_7.mp3', cost: 50000 },
    { id: 'arena_battle_bgm_8', category: 'ARENA', name: 'Arena Battle 8', path: 'assets/BGM/arena_battle_bgm_8.mp3', cost: 50000 },
    { id: 'arena_battle_bgm_9', category: 'ARENA', name: 'Arena Battle 9', path: 'assets/BGM/arena_battle_bgm_9.mp3', cost: 50000 },
    { id: 'arena_battle_bgm_10', category: 'ARENA', name: 'Arena Battle 10', path: 'assets/BGM/arena_battle_bgm_10.mp3', cost: 50000 },

    // RAID
    { id: 'raid_battle_bgm_1', category: 'RAID', name: 'Raid Battle 1', path: 'assets/BGM/raid_battle_bgm_1.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_2', category: 'RAID', name: 'Raid Battle 2', path: 'assets/BGM/raid_battle_bgm_2.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_3', category: 'RAID', name: 'Raid Battle 3', path: 'assets/BGM/raid_battle_bgm_3.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_4', category: 'RAID', name: 'Raid Battle 4', path: 'assets/BGM/raid_battle_bgm_4.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_5', category: 'RAID', name: 'Raid Battle 5', path: 'assets/BGM/raid_battle_bgm_5.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_6', category: 'RAID', name: 'Raid Battle 6', path: 'assets/BGM/raid_battle_bgm_6.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_7', category: 'RAID', name: 'Raid Battle 7', path: 'assets/BGM/raid_battle_bgm_7.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_8', category: 'RAID', name: 'Raid Battle 8', path: 'assets/BGM/raid_battle_bgm_8.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_9', category: 'RAID', name: 'Raid Battle 9', path: 'assets/BGM/raid_battle_bgm_9.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_10', category: 'RAID', name: 'Raid Battle 10', path: 'assets/BGM/raid_battle_bgm_10.mp3', cost: 50000 },
    { id: 'raid_battle_bgm_11', category: 'RAID', name: 'Raid Battle 11', path: 'assets/BGM/raid_battle_bgm_11.mp3', cost: 50000 },
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
        this._pausedSoundsByPreview = [];
        this._pausedSoundsByFocus = [];
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

        // Pause other sounds for Focus Mode
        if (this.game && this.game.sound && this._pausedSoundsByFocus.length === 0) {
            this.game.sound.sounds.forEach(s => {
                if (s.isPlaying) {
                    s.pause();
                    s._pausedByFocus = true;
                    this._pausedSoundsByFocus.push(s);
                }
            });
        }

        this.isCustomPlaylistMode = true;
        this.playTrack(0);
    }

    stopPlaylist() {
        this.isCustomPlaylistMode = false;
        if (this.currentSound) {
            this.currentSound.stop();
        }

        // Resume sounds paused by Focus Mode
        this._pausedSoundsByFocus.forEach(s => {
            if (s && s._pausedByFocus) {
                s.resume();
                delete s._pausedByFocus;
            }
        });
        this._pausedSoundsByFocus = [];
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

    playPreview(trackId) {
        if (this.currentSound) {
            this.currentSound.stop();
        }

        // Pause other sounds if not already paused by focus or previous preview
        if (this.game && this.game.sound && this._pausedSoundsByPreview.length === 0) {
            this.game.sound.sounds.forEach(s => {
                if (s.isPlaying) {
                    s.pause();
                    s._pausedByPreview = true;
                    this._pausedSoundsByPreview.push(s);
                }
            });
        }

        const track = MUSIC_TRACKS.find(t => t.id === trackId);
        if (!track) return;

        console.log(`[MusicManager] Previewing: ${track.name}`);
        try {
            this.currentSound = this.game.sound.add(track.id, { volume: this.volume, loop: false });
            this.currentSound.play();
            
            // Auto-resume when preview ends naturally
            this.currentSound.once('complete', () => {
                this.stopPreview();
            });
        } catch (e) {
            console.error('[MusicManager] Error playing preview:', e);
        }
    }

    stopPreview() {
        if (this.currentSound) {
            this.currentSound.stop();
        }
        
        // Resume sounds paused by preview
        this._pausedSoundsByPreview.forEach(s => {
            if (s && s._pausedByPreview) {
                s.resume();
                delete s._pausedByPreview;
            }
        });
        this._pausedSoundsByPreview = [];
    }
}
