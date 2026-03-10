import DBManager from '../Database/DBManager.js';
import EventBus from '../Events/EventBus.js';

export default class FocusManager {
    constructor(game) {
        this.game = game;
        this.isFocusModeActive = false;
        this.settings = {
            blurEnabled: true,
            timerEnabled: true,
            sfxEnabled: true // Mentioned as toggle in settings tab
        };
        this.ownedTracks = ['lo_fi_track_1']; 
        this.currentPlaylist = ['lo_fi_track_1'];
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        const data = await DBManager.get('settings', 'focus_music_data');
        if (data) {
            this.settings = data.settings || this.settings;
            this.ownedTracks = data.ownedTracks || [];
            this.currentPlaylist = data.currentPlaylist || [];
        }

        this.initialized = true;
        console.log('[FocusManager] Initialized:', {
            settings: this.settings,
            ownedTracks: this.ownedTracks.length,
            playlist: this.currentPlaylist.length
        });
    }

    async save() {
        await DBManager.save('settings', 'focus_music_data', {
            settings: this.settings,
            ownedTracks: this.ownedTracks,
            currentPlaylist: this.currentPlaylist
        });
    }

    toggleFocusMode(active) {
        this.isFocusModeActive = active !== undefined ? active : !this.isFocusModeActive;
        console.log(`[FocusManager] Focus Mode: ${this.isFocusModeActive ? 'ON' : 'OFF'}`);

        // Toggle Music
        if (this.isFocusModeActive) {
            if (this.game.musicManager) {
                // AUTO-PLAYLIST FIX: If playlist is empty but we have owned tracks, auto-set first track
                if (this.currentPlaylist.length === 0 && this.ownedTracks.length > 0) {
                    this.currentPlaylist = [this.ownedTracks[0]];
                    this.save();
                    console.log('[FocusManager] Auto-initialized empty playlist with owned track:', this.ownedTracks[0]);
                }
                
                this.game.musicManager.setPlaylist(this.currentPlaylist);
                this.game.musicManager.startPlaylist();
            }
        } else {
            if (this.game.musicManager) {
                this.game.musicManager.stopPlaylist();
            }
        }

        // Apply visual effects via CSS (UIManager will handle the class toggle on body/container)
        console.log('🚀 [FocusManager] Emitting FOCUS_MODE_CHANGED:', { active: this.isFocusModeActive });
        EventBus.emit('FOCUS_MODE_CHANGED', {
            active: this.isFocusModeActive,
            settings: this.settings
        });
    }

    async buyTrack(trackId, cost) {
        if (this.ownedTracks.includes(trackId)) return { success: false, message: '이미 보유한 음반입니다.' };

        // Check Gold (using DBManager directly since it's the source of truth for gems/gold in some managers)
        const goldData = await DBManager.getInventoryItem('emoji_coin');
        const currentGold = goldData ? goldData.amount : 0;

        if (currentGold < cost) {
            return { success: false, message: '골드가 부족합니다. (필요: 50,000)' };
        }

        // Deduct Gold
        await DBManager.saveInventoryItem('emoji_coin', currentGold - cost);

        // Add Track
        this.ownedTracks.push(trackId);
        await this.save();

        EventBus.emit(EventBus.EVENTS.INVENTORY_UPDATED); // Refresh HUD
        console.log(`[FocusManager] Purchased track: ${trackId}`);
        return { success: true };
    }

    async updatePlaylist(trackIds) {
        this.currentPlaylist = trackIds;
        await this.save();
        console.log('[FocusManager] Saved playlist:', this.currentPlaylist);
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.save();

        // If focus mode is active, re-emit to update current session visuals
        if (this.isFocusModeActive) {
            EventBus.emit('FOCUS_MODE_CHANGED', {
                active: true,
                settings: this.settings
            });
        }
    }
}
