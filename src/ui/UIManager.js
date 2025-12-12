/**
 * UIManager - Handles control visibility, interactions, and UI state
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS, PLAYER_CONFIG, MEDIA_TYPE } from '../utils/constants.js';
import { isTouchDevice, debounce } from '../utils/helpers.js';

export class UIManager {
    constructor(elements) {
        this.elements = elements; // Object containing UI element references
        this.isTouch = isTouchDevice();

        this.hideControlsTimeout = null;
        this.isMouseOverControls = false;
        this.isMouseOverContainer = false;

        this.init();
    }

    init() {
        this.attachEventListeners();
        this.subscribeToEvents();
        this.updateUI();
    }

    attachEventListeners() {
        const { container, controls, videoContainer, audioContainer } = this.elements;

        if (container) {
            // Mouse events
            container.addEventListener('mouseenter', () => this.handleContainerMouseEnter());
            container.addEventListener('mouseleave', () => this.handleContainerMouseLeave());
            container.addEventListener('mousemove', () => this.handleMouseMove());

            // Touch events
            container.addEventListener('touchstart', (e) => this.handleContainerTap(e), { passive: true });
        }

        if (controls) {
            controls.addEventListener('mouseenter', () => this.handleControlsMouseEnter());
            controls.addEventListener('mouseleave', () => this.handleControlsMouseLeave());
        }

        // Prevent context menu on player
        container?.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    subscribeToEvents() {
        eventBus.on(EVENTS.PLAY, () => this.onPlay());
        eventBus.on(EVENTS.PAUSE, () => this.onPause());
        eventBus.on(EVENTS.MEDIA_TYPE_CHANGE, (data) => this.onMediaTypeChange(data));
        eventBus.on(EVENTS.FULLSCREEN_CHANGE, (data) => this.onFullscreenChange(data));
        eventBus.on(EVENTS.VOLUME_CHANGE, (data) => this.updateVolumeUI(data));
        eventBus.on(EVENTS.SPEED_CHANGE, (data) => this.updateSpeedUI(data));
        eventBus.on(EVENTS.PLAYLIST_UPDATE, () => this.updatePlaylistUI());
        eventBus.on(EVENTS.SHUFFLE_TOGGLE, (data) => this.updateShuffleUI(data));
        eventBus.on(EVENTS.REPEAT_TOGGLE, (data) => this.updateRepeatUI(data));
        eventBus.on(EVENTS.SUBTITLE_TOGGLE, (data) => this.updateSubtitleUI(data));
        eventBus.on(EVENTS.MEDIA_ERROR, (data) => this.showError(data.message));
        eventBus.on(EVENTS.MEDIA_LOAD, () => this.hideError());
    }

    // --- Control Visibility ---

    showControls() {
        clearTimeout(this.hideControlsTimeout);
        const { controls } = this.elements;

        if (controls) {
            controls.classList.remove('opacity-0', 'pointer-events-none');
            controls.classList.add('opacity-100');
        }

        stateManager.set({ controlsVisible: true });
        eventBus.emit(EVENTS.CONTROLS_SHOW);

        // Schedule hide if playing
        if (stateManager.get('isPlaying')) {
            this.scheduleHideControls();
        }
    }

    hideControls() {
        if (this.isMouseOverControls) return;

        const { controls } = this.elements;

        if (controls) {
            controls.classList.add('opacity-0', 'pointer-events-none');
            controls.classList.remove('opacity-100');
        }

        stateManager.set({ controlsVisible: false });
        eventBus.emit(EVENTS.CONTROLS_HIDE);
    }

    scheduleHideControls(delay = PLAYER_CONFIG.CONTROLS_HIDE_DELAY) {
        clearTimeout(this.hideControlsTimeout);

        if (!stateManager.get('isPlaying')) return;

        this.hideControlsTimeout = setTimeout(() => {
            if (!this.isMouseOverControls) {
                this.hideControls();
            }
        }, delay);
    }

    toggleControls() {
        if (stateManager.get('controlsVisible')) {
            this.hideControls();
        } else {
            this.showControls();
        }
    }

    // --- Event Handlers ---

    handleContainerMouseEnter() {
        if (this.isTouch) return;
        this.isMouseOverContainer = true;
        this.showControls();
    }

    handleContainerMouseLeave() {
        if (this.isTouch) return;
        this.isMouseOverContainer = false;

        setTimeout(() => {
            if (!this.isMouseOverContainer && !this.isMouseOverControls) {
                this.hideControls();
            }
        }, 100);
    }

    handleControlsMouseEnter() {
        if (this.isTouch) return;
        this.isMouseOverControls = true;
        clearTimeout(this.hideControlsTimeout);
    }

    handleControlsMouseLeave() {
        if (this.isTouch) return;
        this.isMouseOverControls = false;

        if (!this.isMouseOverContainer && stateManager.get('isPlaying')) {
            this.scheduleHideControls();
        }
    }

    handleMouseMove() {
        this.showControls();
    }

    handleContainerTap(e) {
        // Don't toggle if tapped on controls
        if (e.target.closest('#controls') || e.target.closest('.controls')) return;
        this.toggleControls();
    }

    // --- Media Type Switching ---

    onMediaTypeChange({ type }) {
        const { videoContainer, audioContainer } = this.elements;

        if (type === MEDIA_TYPE.AUDIO) {
            videoContainer?.classList.add('hidden');
            audioContainer?.classList.remove('hidden');
        } else {
            videoContainer?.classList.remove('hidden');
            audioContainer?.classList.add('hidden');
        }
    }

    // --- Playback Events ---

    onPlay() {
        this.updatePlayPauseIcon(true);
        this.scheduleHideControls();
    }

    onPause() {
        this.updatePlayPauseIcon(false);
        this.showControls();
        clearTimeout(this.hideControlsTimeout);
    }

    onFullscreenChange({ isFullscreen }) {
        this.updateFullscreenIcon(isFullscreen);
    }

    // --- UI Updates ---

    updateUI() {
        const state = stateManager.get();

        this.updatePlayPauseIcon(state.isPlaying);
        this.updateVolumeUI({ volume: state.volume, isMuted: state.isMuted });
        this.updateSpeedUI({ current: state.playbackRate });
    }

    updatePlayPauseIcon(isPlaying) {
        const { playPauseBtn } = this.elements;
        if (!playPauseBtn) return;

        const icon = playPauseBtn.querySelector('i, .material-icons');
        if (icon) {
            icon.textContent = isPlaying ? 'pause' : 'play_arrow';
        }
    }

    updateVolumeUI({ volume, isMuted }) {
        const { volumeBtn, volumeSlider } = this.elements;

        if (volumeBtn) {
            const icon = volumeBtn.querySelector('i, .material-icons');
            if (icon) {
                if (isMuted || volume === 0) {
                    icon.textContent = 'volume_off';
                } else if (volume < 0.3) {
                    icon.textContent = 'volume_mute';
                } else if (volume < 0.7) {
                    icon.textContent = 'volume_down';
                } else {
                    icon.textContent = 'volume_up';
                }
            }
        }

        if (volumeSlider) {
            volumeSlider.value = isMuted ? 0 : volume;
        }
    }

    updateSpeedUI({ current }) {
        const { speedBtn } = this.elements;
        if (speedBtn) {
            speedBtn.textContent = `${current}x`;
        }
    }

    updateFullscreenIcon(isFullscreen) {
        const { fullscreenBtn } = this.elements;
        if (!fullscreenBtn) return;

        const icon = fullscreenBtn.querySelector('i, .material-icons');
        if (icon) {
            icon.textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
        }
    }

    updateSubtitleUI({ enabled }) {
        const { subtitleBtn } = this.elements;
        if (!subtitleBtn) return;

        const icon = subtitleBtn.querySelector('i, .material-icons');
        if (icon) {
            icon.textContent = enabled ? 'subtitles' : 'subtitles_off';
        }

        subtitleBtn.classList.toggle('active', enabled);
    }

    updateShuffleUI({ shuffleEnabled }) {
        const { shuffleBtn } = this.elements;
        if (shuffleBtn) {
            shuffleBtn.classList.toggle('active', shuffleEnabled);
        }
    }

    updateRepeatUI({ repeatMode }) {
        const { repeatBtn } = this.elements;
        if (!repeatBtn) return;

        const icon = repeatBtn.querySelector('i, .material-icons');
        if (icon) {
            icon.textContent = repeatMode === 'one' ? 'repeat_one' : 'repeat';
        }

        repeatBtn.classList.toggle('active', repeatMode !== 'off');
    }

    updatePlaylistUI() {
        // Playlist rendering is handled by a separate component
        eventBus.emit('ui:playlist:render');
    }

    // --- Error Display ---

    showError(message) {
        const { errorOverlay, errorMessage } = this.elements;

        if (errorOverlay && errorMessage) {
            errorMessage.textContent = message;
            errorOverlay.classList.remove('hidden');
        }
    }

    hideError() {
        const { errorOverlay } = this.elements;
        if (errorOverlay) {
            errorOverlay.classList.add('hidden');
        }
    }

    // --- Sidebar Toggle ---

    toggleSidebar() {
        const { sidebar, container } = this.elements;
        const isOpen = !stateManager.get('sidebarOpen');

        stateManager.set({ sidebarOpen: isOpen });

        sidebar?.classList.toggle('open', isOpen);
        container?.classList.toggle('sidebar-open', isOpen);

        eventBus.emit(EVENTS.SIDEBAR_TOGGLE, { isOpen });
    }
}

export default UIManager;
