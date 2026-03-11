import EventBus from '../Events/EventBus.js';

/**
 * LocalizationManager handles multi-language support.
 * It listens for LANGUAGE_CHANGED events and prepares translations.
 */
class LocalizationManager {
    constructor() {
        this.currentLanguage = localStorage.getItem('gameLanguage') || 'KR';
        this.init();
    }

    init() {
        console.log(`[LocalizationManager] Initialized with language: ${this.currentLanguage}`);
        
        EventBus.on(EventBus.EVENTS.LANGUAGE_CHANGED, (payload) => {
            this.handleLanguageChange(payload.language);
        });
    }

    handleLanguageChange(lang) {
        this.currentLanguage = lang;
        console.log(`[LocalizationManager] System language updated to: ${lang}`);
        // In the future, this could trigger UI refreshes or load separate JSON files.
    }

    /**
     * Get a localized string by key
     * @param {string} key 
     * @returns {string}
     */
    t(key) {
        // Translation dictionary could be expanded here
        return key; 
    }
}

// Global instance
const localizationManager = new LocalizationManager();
export default localizationManager;
