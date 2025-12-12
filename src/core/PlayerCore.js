/**
 * PlayerCore - Main orchestrator that initializes and coordinates all modules
 */

import { eventBus } from './EventBus.js';
import { stateManager } from './StateManager.js';
import { EVENTS, MEDIA_TYPE } from '../utils/constants.js';
import { getMediaType, isTouchDevice } from '../utils/helpers.js';

// Controllers
import { MediaController } from '../controllers/MediaController.js';
import { VolumeController } from '../controllers/VolumeController.js';
import { ProgressController } from '../controllers/ProgressController.js';
import { FullscreenController } from '../controllers/FullscreenController.js';
import { SubtitleController } from '../controllers/SubtitleController.js';
import { KeyboardController } from '../controllers/KeyboardController.js';

// Features
import { FileLoader } from '../features/FileLoader.js';
import { PlaylistManager } from '../features/PlaylistManager.js';
import { AudioVisualizer } from '../features/AudioVisualizer.js';

// UI
import { UIManager } from '../ui/UIManager.js';
import { ThemeManager } from '../ui/ThemeManager.js';
import { PlaylistUI } from '../ui/components/PlaylistUI.js';

export class PlayerCore {
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);

        if (!this.container) {
            console.error('Player container not found:', containerSelector);
            return;
        }

        this.elements = {};
        this.controllers = {};

        this.init();
    }

    init() {
        this.queryElements();
        this.initializeControllers();
        this.initializeFeatures();
        this.initializeUI();
        this.attachEventListeners();
        this.setupDragAndDrop();

        console.log('LAS Player initialized');
    }

    /**
     * Query and store all UI elements
     */
    queryElements() {
        const $ = (sel) => this.container.querySelector(sel);
        const $doc = (sel) => document.querySelector(sel);

        this.elements = {
            // Container
            container: this.container,

            // Media elements
            video: $('video'),
            audio: $('audio'),
            videoContainer: $('.video-container'),
            audioContainer: $('.audio-container'),

            // Controls
            controls: $('#controls, .controls'),
            playPauseBtn: $('#play-pause'),
            rewindBtn: $('#rewind'),
            forwardBtn: $('#forward'),
            prevBtn: $('#prev-track'),
            nextBtn: $('#next-track'),

            // Progress
            progressBar: $('#progress-bar, .progress-bar'),
            progressFill: $('#progress-fill, .progress-fill'),
            progressBuffer: $('#progress-buffer, .progress-buffer'),
            progressTooltip: $('#progress-tooltip, .progress-tooltip'),
            currentTime: $('#current-time, .current-time'),
            duration: $('#duration, .duration'),

            // Volume
            volumeBtn: $('#volume-btn, #volume'),
            volumeSlider: $('#volume-slider'),
            volumeSliderContainer: $('#volume-slider-container'),

            // Playback speed
            speedBtn: $('#speed-btn, #playback-speed'),
            speedOptions: $('#speed-options'),

            // Display modes
            fullscreenBtn: $('#fullscreen'),
            pipBtn: $('#pip-toggle'),

            // Subtitles
            subtitleTrack: $('#subtitle-track'),
            subtitleBtn: $('#subtitle-toggle'),

            // Playlist
            sidebar: $('#sidebar, .sidebar'),
            playlistContainer: $('#playlist, .playlist'),
            shuffleBtn: $('#shuffle'),
            repeatBtn: $('#repeat'),

            // File loading
            openFileBtn: $('#open-file'),
            openFolderBtn: $('#open-folder'),
            subtitleUploadBtn: $('#subtitle-upload'),
            dropZone: $('#drop-zone, .drop-zone'),

            // Audio visualizer
            visualizerCanvas: $('#visualizer-canvas, .visualizer-canvas'),
            albumArt: $('#album-art, .album-art'),
            trackTitle: $('#track-title, .track-title'),
            trackArtist: $('#track-artist, .track-artist'),

            // Theme
            themeBtn: $('#theme-toggle'),

            // Sidebar toggle
            sidebarToggleBtn: $('#sidebar-toggle'),

            // Error
            errorOverlay: $('#error-overlay'),
            errorMessage: $('#error-message'),
        };

        // Use video as primary media element, audio as secondary
        this.mediaElement = this.elements.video || this.elements.audio;
    }

    /**
     * Initialize all controllers
     */
    initializeControllers() {
        const { video, subtitleTrack, progressBar, progressFill, progressBuffer, progressTooltip, currentTime, duration } = this.elements;

        if (!this.mediaElement) {
            console.error('No media element found');
            return;
        }

        // Media controller
        this.mediaController = new MediaController(this.mediaElement);

        // Volume controller
        this.volumeController = new VolumeController(this.mediaElement);

        // Progress controller
        this.progressController = new ProgressController(
            {
                progressBar,
                progressFill,
                progressBuffer,
                tooltip: progressTooltip,
                currentTime,
                duration,
            },
            this.mediaController
        );

        // Fullscreen controller
        this.fullscreenController = new FullscreenController(this.container, this.mediaElement);

        // Subtitle controller
        this.subtitleController = new SubtitleController(this.mediaElement, subtitleTrack);

        // Keyboard controller
        this.keyboardController = new KeyboardController(this);
    }

    /**
     * Initialize feature modules
     */
    initializeFeatures() {
        const { visualizerCanvas } = this.elements;

        // File loader
        this.fileLoader = new FileLoader();

        // Playlist manager
        this.playlistManager = new PlaylistManager();

        // Audio visualizer
        if (visualizerCanvas) {
            this.audioVisualizer = new AudioVisualizer(visualizerCanvas, this.mediaElement);
        }
    }

    /**
     * Initialize UI managers
     */
    initializeUI() {
        // Theme manager
        this.themeManager = new ThemeManager(this.container);

        // UI manager
        this.uiManager = new UIManager(this.elements);
    }

    /**
     * Attach event listeners to UI elements
     */
    attachEventListeners() {
        const {
            playPauseBtn,
            rewindBtn,
            forwardBtn,
            prevBtn,
            nextBtn,
            volumeBtn,
            volumeSlider,
            fullscreenBtn,
            pipBtn,
            subtitleBtn,
            speedBtn,
            speedOptions,
            shuffleBtn,
            repeatBtn,
            themeBtn,
            sidebarToggleBtn,
            openFileBtn,
            openFolderBtn,
            subtitleUploadBtn,
            video,
        } = this.elements;

        // Playback controls
        playPauseBtn?.addEventListener('click', () => this.mediaController.toggle());
        rewindBtn?.addEventListener('click', () => this.mediaController.skipBackward());
        forwardBtn?.addEventListener('click', () => this.mediaController.skipForward());

        // Video click to toggle play
        video?.addEventListener('click', () => {
            if (!isTouchDevice()) {
                this.mediaController.toggle();
            }
        });

        // Playlist navigation
        prevBtn?.addEventListener('click', () => this.playlistManager.playPrevious());
        nextBtn?.addEventListener('click', () => this.playlistManager.playNext());

        // Volume
        volumeBtn?.addEventListener('click', () => this.handleVolumeButtonClick());
        volumeSlider?.addEventListener('input', (e) => {
            this.volumeController.setVolume(parseFloat(e.target.value));
        });

        // Display modes
        fullscreenBtn?.addEventListener('click', () => this.fullscreenController.toggleFullscreen());
        pipBtn?.addEventListener('click', () => this.fullscreenController.togglePiP());

        // Subtitles
        subtitleBtn?.addEventListener('click', () => this.subtitleController.toggle());

        // Playback speed
        speedBtn?.addEventListener('click', () => this.toggleSpeedOptions());
        speedOptions?.addEventListener('click', (e) => this.handleSpeedSelection(e));

        // Shuffle & Repeat
        shuffleBtn?.addEventListener('click', () => this.playlistManager.toggleShuffle());
        repeatBtn?.addEventListener('click', () => this.playlistManager.cycleRepeat());

        // Theme
        themeBtn?.addEventListener('click', () => this.themeManager.toggle());

        // Sidebar
        sidebarToggleBtn?.addEventListener('click', () => this.uiManager.toggleSidebar());

        // File loading
        openFileBtn?.addEventListener('click', () => this.handleOpenFile());
        openFolderBtn?.addEventListener('click', () => this.handleOpenFolder());
        subtitleUploadBtn?.addEventListener('click', () => this.handleSubtitleUpload());

        // Handle buffer updates
        this.mediaElement?.addEventListener('progress', () => {
            this.progressController.updateBuffer(
                this.mediaElement.buffered,
                this.mediaElement.duration
            );
        });

        // Close speed options when clicking outside
        document.addEventListener('click', (e) => {
            if (!speedBtn?.contains(e.target) && !speedOptions?.contains(e.target)) {
                speedOptions?.classList.add('hidden');
            }
        });
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const { container, dropZone } = this.elements;
        const dropTarget = dropZone || container;

        if (!dropTarget) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
            dropTarget.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach((eventName) => {
            dropTarget.addEventListener(eventName, () => {
                dropTarget.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach((eventName) => {
            dropTarget.addEventListener(eventName, () => {
                dropTarget.classList.remove('drag-over');
            });
        });

        dropTarget.addEventListener('drop', async (e) => {
            const tracks = await this.fileLoader.handleDrop(e.dataTransfer);
            if (tracks.length > 0) {
                this.playlistManager.setPlaylist(tracks, true);
                this.handleMediaTypeChange(tracks[0].type);
            }
        });
    }

    // --- File Loading Handlers ---

    async handleOpenFile() {
        const files = await this.fileLoader.openMultipleFilePicker();
        if (files && files.length > 0) {
            const tracks = await this.fileLoader.loadFiles(files);
            this.playlistManager.setPlaylist(tracks, true);
            if (tracks.length > 0) {
                this.handleMediaTypeChange(tracks[0].type);
            }
        }
    }

    async handleOpenFolder() {
        const tracks = await this.fileLoader.openFolder();
        if (tracks.length > 0) {
            this.playlistManager.setPlaylist(tracks, true);
            this.handleMediaTypeChange(tracks[0].type);
        }
    }

    async handleSubtitleUpload() {
        const file = await this.fileLoader.openSubtitlePicker();
        if (file) {
            this.subtitleController.loadFromFile(file);
        }
    }

    /**
     * Handle media type change (switch between video/audio UI)
     * @param {string} type
     */
    handleMediaTypeChange(type) {
        stateManager.set({ mediaType: type });
        eventBus.emit(EVENTS.MEDIA_TYPE_CHANGE, { type });
    }

    // --- Volume Handling ---

    handleVolumeButtonClick() {
        if (isTouchDevice()) {
            // On touch, show/hide the volume slider
            this.toggleVolumeSlider();
        } else {
            // On desktop, mute/unmute
            this.volumeController.toggleMute();
        }
    }

    toggleVolumeSlider() {
        const { volumeSliderContainer } = this.elements;
        if (volumeSliderContainer) {
            volumeSliderContainer.classList.toggle('visible');
        }
    }

    // --- Speed Options ---

    toggleSpeedOptions() {
        const { speedOptions } = this.elements;
        if (speedOptions) {
            speedOptions.classList.toggle('hidden');
        }
    }

    handleSpeedSelection(e) {
        const li = e.target.closest('li[data-speed]');
        if (li) {
            const speed = parseFloat(li.dataset.speed);
            this.mediaController.setPlaybackRate(speed);
            this.elements.speedOptions?.classList.add('hidden');
        }
    }

    // --- Public API ---

    /**
     * Load a file directly
     * @param {File} file
     */
    async loadFile(file) {
        const track = await this.fileLoader.createTrackFromFile(file);
        this.playlistManager.setPlaylist([track], true);
        this.handleMediaTypeChange(track.type);
    }

    /**
     * Load a URL directly
     * @param {string} url
     * @param {Object} metadata
     */
    loadUrl(url, metadata = {}) {
        const type = metadata.type || getMediaType(url) || MEDIA_TYPE.VIDEO;
        this.mediaController.loadSource(url, { ...metadata, type });
        this.handleMediaTypeChange(type);
    }

    /**
     * Play
     */
    play() {
        this.mediaController.play();
    }

    /**
     * Pause
     */
    pause() {
        this.mediaController.pause();
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        this.mediaController.toggle();
    }

    /**
     * Seek to time
     * @param {number} time - Time in seconds
     */
    seek(time) {
        this.mediaController.seek(time);
    }

    /**
     * Set volume
     * @param {number} volume - Volume 0-1
     */
    setVolume(volume) {
        this.volumeController.setVolume(volume);
    }

    /**
     * Destroy the player and clean up
     */
    destroy() {
        // Clean up file loader URLs
        this.fileLoader.cleanupTracks(this.playlistManager.playlist);

        // Destroy audio visualizer
        this.audioVisualizer?.destroy();

        // Clear event bus
        eventBus.clear();

        console.log('LAS Player destroyed');
    }
}

export default PlayerCore;
