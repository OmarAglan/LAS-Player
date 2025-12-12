/**
 * FullscreenController - Handles fullscreen and Picture-in-Picture modes
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS } from '../utils/constants.js';

export class FullscreenController {
    constructor(containerElement, mediaElement) {
        this.container = containerElement;
        this.media = mediaElement;
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.checkPiPSupport();
    }

    attachEventListeners() {
        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.handleFullscreenChange());
        document.addEventListener('msfullscreenchange', () => this.handleFullscreenChange());

        // PiP events
        this.media.addEventListener('enterpictureinpicture', () => this.handlePiPChange(true));
        this.media.addEventListener('leavepictureinpicture', () => this.handlePiPChange(false));
    }

    checkPiPSupport() {
        return 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;
    }

    // --- Fullscreen Methods ---

    async enterFullscreen() {
        try {
            if (this.container.requestFullscreen) {
                await this.container.requestFullscreen();
            } else if (this.container.webkitRequestFullscreen) {
                await this.container.webkitRequestFullscreen();
            } else if (this.container.msRequestFullscreen) {
                await this.container.msRequestFullscreen();
            }
        } catch (error) {
            console.error('Error entering fullscreen:', error);
        }
    }

    async exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                await document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                await document.msExitFullscreen();
            }
        } catch (error) {
            console.error('Error exiting fullscreen:', error);
        }
    }

    async toggleFullscreen() {
        if (this.isFullscreen) {
            await this.exitFullscreen();
        } else {
            await this.enterFullscreen();
        }
    }

    handleFullscreenChange() {
        const isFullscreen = this.isFullscreen;
        stateManager.set({ isFullscreen });
        eventBus.emit(EVENTS.FULLSCREEN_CHANGE, { isFullscreen });
    }

    // --- Picture-in-Picture Methods ---

    async enterPiP() {
        if (!this.checkPiPSupport()) {
            console.warn('Picture-in-Picture not supported');
            return;
        }

        try {
            await this.media.requestPictureInPicture();
        } catch (error) {
            console.error('Error entering PiP:', error);
        }
    }

    async exitPiP() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }
        } catch (error) {
            console.error('Error exiting PiP:', error);
        }
    }

    async togglePiP() {
        if (this.isPiP) {
            await this.exitPiP();
        } else {
            await this.enterPiP();
        }
    }

    handlePiPChange(isPiP) {
        stateManager.set({ isPiP });
        eventBus.emit(EVENTS.PIP_CHANGE, { isPiP });
    }

    // --- Getters ---

    get isFullscreen() {
        return !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement
        );
    }

    get isPiP() {
        return document.pictureInPictureElement === this.media;
    }

    get isPiPSupported() {
        return this.checkPiPSupport();
    }

    /**
     * Get fullscreen icon name
     * @returns {string}
     */
    getFullscreenIcon() {
        return this.isFullscreen ? 'fullscreen_exit' : 'fullscreen';
    }
}

export default FullscreenController;
