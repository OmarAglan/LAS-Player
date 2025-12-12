/**
 * KeyboardController - Handles keyboard shortcuts
 */

import { eventBus } from '../core/EventBus.js';
import { EVENTS, PLAYER_CONFIG } from '../utils/constants.js';

export class KeyboardController {
    constructor(playerCore) {
        this.player = playerCore;
        this.enabled = true;

        this.init();
    }

    init() {
        this.attachEventListeners();
    }

    attachEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    }

    /**
     * Check if keyboard shortcuts should be ignored
     * @param {KeyboardEvent} e
     * @returns {boolean}
     */
    shouldIgnore(e) {
        if (!this.enabled) return true;

        // Ignore if focus is on input elements
        const activeElement = document.activeElement;
        const isInputFocused =
            activeElement &&
            (activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.tagName === 'SELECT' ||
                activeElement.isContentEditable);

        return isInputFocused;
    }

    handleKeyDown(e) {
        if (this.shouldIgnore(e)) return;

        const key = e.key.toLowerCase();

        switch (key) {
            // Play/Pause
            case ' ':
            case 'k':
                e.preventDefault();
                this.player.mediaController?.toggle();
                break;

            // Seek backward
            case 'arrowleft':
            case 'j':
                e.preventDefault();
                this.player.mediaController?.skipBackward();
                break;

            // Seek forward
            case 'arrowright':
            case 'l':
                e.preventDefault();
                this.player.mediaController?.skipForward();
                break;

            // Volume up
            case 'arrowup':
                e.preventDefault();
                this.player.volumeController?.increaseVolume();
                break;

            // Volume down
            case 'arrowdown':
                e.preventDefault();
                this.player.volumeController?.decreaseVolume();
                break;

            // Mute
            case 'm':
                e.preventDefault();
                this.player.volumeController?.toggleMute();
                break;

            // Fullscreen
            case 'f':
                e.preventDefault();
                this.player.fullscreenController?.toggleFullscreen();
                break;

            // Picture-in-Picture
            case 'p':
                if (e.shiftKey) {
                    e.preventDefault();
                    this.player.fullscreenController?.togglePiP();
                }
                break;

            // Subtitles toggle
            case 'c':
                e.preventDefault();
                this.player.subtitleController?.toggle();
                break;

            // Escape - exit fullscreen
            case 'escape':
                if (this.player.fullscreenController?.isFullscreen) {
                    this.player.fullscreenController.exitFullscreen();
                }
                break;

            // Number keys 0-9 for seeking to percentage
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
                e.preventDefault();
                const percent = parseInt(key) * 10;
                this.player.mediaController?.seekToPercent(percent);
                break;

            // Previous track
            case 'n':
                if (e.shiftKey) {
                    e.preventDefault();
                    this.player.playlistManager?.playPrevious();
                }
                break;

            // Next track
            case 'n':
                if (!e.shiftKey) {
                    e.preventDefault();
                    this.player.playlistManager?.playNext();
                }
                break;

            default:
                // Unhandled key
                break;
        }
    }

    /**
     * Enable keyboard shortcuts
     */
    enable() {
        this.enabled = true;
    }

    /**
     * Disable keyboard shortcuts
     */
    disable() {
        this.enabled = false;
    }

    /**
     * Get list of available shortcuts for display
     * @returns {Array}
     */
    getShortcutsList() {
        return [
            { key: 'Space / K', action: 'Play / Pause' },
            { key: '← / J', action: `Rewind ${PLAYER_CONFIG.SKIP_BACKWARD}s` },
            { key: '→ / L', action: `Forward ${PLAYER_CONFIG.SKIP_FORWARD}s` },
            { key: '↑ / ↓', action: 'Volume Up / Down' },
            { key: 'M', action: 'Mute / Unmute' },
            { key: 'F', action: 'Toggle Fullscreen' },
            { key: 'Shift + P', action: 'Toggle Picture-in-Picture' },
            { key: 'C', action: 'Toggle Subtitles' },
            { key: '0-9', action: 'Seek to 0%-90%' },
            { key: 'N', action: 'Next Track' },
            { key: 'Shift + N', action: 'Previous Track' },
        ];
    }
}

export default KeyboardController;
