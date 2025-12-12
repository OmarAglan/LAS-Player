/**
 * VolumeController - Handles volume and mute functionality
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS, PLAYER_CONFIG } from '../utils/constants.js';
import { clamp } from '../utils/helpers.js';

export class VolumeController {
    constructor(mediaElement) {
        this.media = mediaElement;
        this.lastVolume = PLAYER_CONFIG.DEFAULT_VOLUME;
        this.init();
    }

    init() {
        this.restoreVolume();
        this.attachEventListeners();
    }

    restoreVolume() {
        const savedVolume = stateManager.get('volume');
        if (savedVolume !== null) {
            this.setVolume(savedVolume, false);
        }
    }

    attachEventListeners() {
        this.media.addEventListener('volumechange', () => this.handleVolumeChange());
    }

    // --- Volume Methods ---

    setVolume(value, emit = true) {
        const volume = clamp(value, 0, 1);
        this.media.volume = volume;

        if (volume > 0) {
            this.lastVolume = volume;
            this.media.muted = false;
        }

        stateManager.set({ volume, isMuted: volume === 0 });

        if (emit) {
            eventBus.emit(EVENTS.VOLUME_CHANGE, { volume, isMuted: volume === 0 });
        }
    }

    getVolume() {
        return this.media.volume;
    }

    increaseVolume(step = PLAYER_CONFIG.VOLUME_STEP) {
        this.setVolume(this.media.volume + step);
    }

    decreaseVolume(step = PLAYER_CONFIG.VOLUME_STEP) {
        this.setVolume(this.media.volume - step);
    }

    // --- Mute Methods ---

    mute() {
        if (this.media.volume > 0) {
            this.lastVolume = this.media.volume;
        }
        this.media.muted = true;
        stateManager.set({ isMuted: true });
        eventBus.emit(EVENTS.MUTE_TOGGLE, { isMuted: true });
    }

    unmute() {
        this.media.muted = false;
        if (this.media.volume === 0) {
            this.setVolume(this.lastVolume > 0 ? this.lastVolume : PLAYER_CONFIG.DEFAULT_VOLUME);
        }
        stateManager.set({ isMuted: false });
        eventBus.emit(EVENTS.MUTE_TOGGLE, { isMuted: false });
    }

    toggleMute() {
        if (this.media.muted || this.media.volume === 0) {
            this.unmute();
        } else {
            this.mute();
        }
    }

    // --- Event Handlers ---

    handleVolumeChange() {
        const volume = this.media.muted ? 0 : this.media.volume;
        stateManager.set({ volume, isMuted: this.media.muted });
        eventBus.emit(EVENTS.VOLUME_CHANGE, {
            volume,
            isMuted: this.media.muted,
        });
    }

    // --- Getters ---

    get isMuted() {
        return this.media.muted || this.media.volume === 0;
    }

    get volume() {
        return this.media.volume;
    }

    /**
     * Get volume icon name based on current state
     * @returns {string} Icon name
     */
    getVolumeIcon() {
        if (this.isMuted) return 'volume_off';
        if (this.volume < 0.3) return 'volume_mute';
        if (this.volume < 0.7) return 'volume_down';
        return 'volume_up';
    }
}

export default VolumeController;
