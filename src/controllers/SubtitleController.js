/**
 * SubtitleController - Handles subtitle loading and toggling
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS } from '../utils/constants.js';

export class SubtitleController {
    constructor(mediaElement, trackElement) {
        this.media = mediaElement;
        this.trackElement = trackElement;
        this.currentSubtitleUrl = null;

        this.init();
    }

    init() {
        this.subscribeToEvents();
    }

    subscribeToEvents() {
        // Clear subtitles when new media loads
        eventBus.on(EVENTS.MEDIA_LOAD, () => this.clear());
    }

    // --- Subtitle Loading ---

    loadFromFile(file) {
        if (!file || !this.trackElement) return false;

        const filename = file.name.toLowerCase();
        if (!filename.endsWith('.vtt') && !filename.endsWith('.srt')) {
            console.error('Invalid subtitle file format. Use .vtt or .srt');
            return false;
        }

        // Revoke previous URL
        if (this.currentSubtitleUrl) {
            URL.revokeObjectURL(this.currentSubtitleUrl);
        }

        // Create new object URL
        this.currentSubtitleUrl = URL.createObjectURL(file);
        this.trackElement.src = this.currentSubtitleUrl;

        // Set mode to hidden initially
        if (this.trackElement.track) {
            this.trackElement.track.mode = 'hidden';
        }

        stateManager.set({
            subtitleSrc: this.currentSubtitleUrl,
            subtitlesEnabled: false,
        });

        eventBus.emit(EVENTS.SUBTITLE_LOAD, { filename: file.name });

        return true;
    }

    loadFromUrl(url) {
        if (!url || !this.trackElement) return false;

        this.trackElement.src = url;

        if (this.trackElement.track) {
            this.trackElement.track.mode = 'hidden';
        }

        stateManager.set({
            subtitleSrc: url,
            subtitlesEnabled: false,
        });

        eventBus.emit(EVENTS.SUBTITLE_LOAD, { url });

        return true;
    }

    // --- Subtitle Toggle ---

    enable() {
        if (!this.trackElement || !this.trackElement.track) return;

        try {
            this.trackElement.track.mode = 'showing';
            stateManager.set({ subtitlesEnabled: true });
            eventBus.emit(EVENTS.SUBTITLE_TOGGLE, { enabled: true });
        } catch (error) {
            console.error('Error enabling subtitles:', error);
        }
    }

    disable() {
        if (!this.trackElement || !this.trackElement.track) return;

        try {
            this.trackElement.track.mode = 'hidden';
            stateManager.set({ subtitlesEnabled: false });
            eventBus.emit(EVENTS.SUBTITLE_TOGGLE, { enabled: false });
        } catch (error) {
            console.error('Error disabling subtitles:', error);
        }
    }

    toggle() {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
    }

    clear() {
        if (this.currentSubtitleUrl) {
            URL.revokeObjectURL(this.currentSubtitleUrl);
            this.currentSubtitleUrl = null;
        }

        if (this.trackElement) {
            this.trackElement.removeAttribute('src');
            if (this.trackElement.track) {
                this.trackElement.track.mode = 'disabled';
            }
        }

        stateManager.set({
            subtitleSrc: null,
            subtitlesEnabled: false,
        });
    }

    // --- Getters ---

    get isEnabled() {
        return this.trackElement?.track?.mode === 'showing';
    }

    get hasSubtitles() {
        return !!this.trackElement?.src;
    }

    /**
     * Get subtitle icon name
     * @returns {string}
     */
    getSubtitleIcon() {
        return this.isEnabled ? 'subtitles' : 'subtitles_off';
    }
}

export default SubtitleController;
