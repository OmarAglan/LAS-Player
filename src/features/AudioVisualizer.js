/**
 * AudioVisualizer - Canvas-based audio spectrum visualization
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS, PLAYER_CONFIG, MEDIA_TYPE } from '../utils/constants.js';

export class AudioVisualizer {
    constructor(canvas, mediaElement) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext('2d');
        this.media = mediaElement;

        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;

        this.isInitialized = false;
        this.isActive = false;
        this.animationId = null;

        // Visualization settings
        this.settings = {
            fftSize: PLAYER_CONFIG.VISUALIZER_FFT_SIZE,
            barWidth: PLAYER_CONFIG.VISUALIZER_BAR_WIDTH,
            barGap: PLAYER_CONFIG.VISUALIZER_BAR_GAP,
            barColor: '#14b8a6', // teal-500
            barColorGradient: ['#14b8a6', '#06b6d4', '#8b5cf6'], // teal -> cyan -> violet
            smoothing: 0.8,
            minDecibels: -90,
            maxDecibels: -10,
        };

        this.init();
    }

    init() {
        this.subscribeToEvents();
        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());
    }

    subscribeToEvents() {
        eventBus.on(EVENTS.PLAY, () => this.onPlay());
        eventBus.on(EVENTS.PAUSE, () => this.onPause());
        eventBus.on(EVENTS.STOP, () => this.stop());
        eventBus.on(EVENTS.MEDIA_LOAD, () => this.onMediaLoad());
        eventBus.on(EVENTS.MEDIA_TYPE_CHANGE, (data) => this.onMediaTypeChange(data));
    }

    /**
     * Initialize Web Audio API
     */
    initializeAudio() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();

            this.analyser.fftSize = this.settings.fftSize;
            this.analyser.smoothingTimeConstant = this.settings.smoothing;
            this.analyser.minDecibels = this.settings.minDecibels;
            this.analyser.maxDecibels = this.settings.maxDecibels;

            this.source = this.audioContext.createMediaElementSource(this.media);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            this.isInitialized = true;
            console.log('Audio visualizer initialized');
        } catch (error) {
            console.error('Error initializing audio visualizer:', error);
        }
    }

    /**
     * Handle canvas resize
     */
    handleResize() {
        if (!this.canvas) return;

        const container = this.canvas.parentElement;
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }

    /**
     * Start visualization
     */
    start() {
        if (!this.canvas || !this.ctx) return;

        const mediaType = stateManager.get('mediaType');
        if (mediaType !== MEDIA_TYPE.AUDIO) return;

        if (!this.isInitialized) {
            this.initializeAudio();
        }

        if (this.audioContext?.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isActive = true;
        this.animate();
    }

    /**
     * Stop visualization
     */
    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.clear();
    }

    /**
     * Pause visualization (keeps last frame)
     */
    pause() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Clear canvas
     */
    clear() {
        if (this.ctx && this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isActive) return;

        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Draw visualization frame
     */
    draw() {
        if (!this.ctx || !this.canvas || !this.analyser || !this.dataArray) return;

        const { width, height } = this.canvas;
        const { barWidth, barGap, barColorGradient } = this.settings;

        // Get frequency data
        this.analyser.getByteFrequencyData(this.dataArray);

        // Clear canvas with slight fade for trails effect
        this.ctx.fillStyle = 'rgba(15, 23, 42, 0.3)'; // slate-900 with alpha
        this.ctx.fillRect(0, 0, width, height);

        // Calculate bar count based on canvas width
        const barCount = Math.floor(width / (barWidth + barGap));
        const step = Math.floor(this.dataArray.length / barCount);

        // Create gradient
        const gradient = this.ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, barColorGradient[0]);
        gradient.addColorStop(0.5, barColorGradient[1]);
        gradient.addColorStop(1, barColorGradient[2]);

        // Draw bars
        for (let i = 0; i < barCount; i++) {
            // Average frequency data for smoother visualization
            let sum = 0;
            for (let j = 0; j < step; j++) {
                sum += this.dataArray[i * step + j];
            }
            const value = sum / step;

            const barHeight = (value / 255) * height * 0.9;
            const x = i * (barWidth + barGap);
            const y = height - barHeight;

            // Draw bar with rounded top
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, barWidth, barHeight, [barWidth / 2, barWidth / 2, 0, 0]);
            this.ctx.fill();

            // Add glow effect
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = barColorGradient[0];
        }

        this.ctx.shadowBlur = 0;
    }

    /**
     * Draw static waveform (when paused)
     */
    drawStatic() {
        if (!this.ctx || !this.canvas) return;

        const { width, height } = this.canvas;
        const { barWidth, barGap, barColor } = this.settings;

        this.ctx.fillStyle = 'rgba(15, 23, 42, 1)';
        this.ctx.fillRect(0, 0, width, height);

        const barCount = Math.floor(width / (barWidth + barGap));

        // Draw static bars with random heights for idle state
        for (let i = 0; i < barCount; i++) {
            const barHeight = Math.random() * 10 + 5;
            const x = i * (barWidth + barGap);
            const y = height / 2 - barHeight / 2;

            this.ctx.fillStyle = barColor;
            this.ctx.globalAlpha = 0.3;
            this.ctx.beginPath();
            this.ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;
    }

    // --- Event Handlers ---

    onPlay() {
        const mediaType = stateManager.get('mediaType');
        if (mediaType === MEDIA_TYPE.AUDIO) {
            this.start();
        }
    }

    onPause() {
        this.pause();
    }

    onMediaLoad() {
        const mediaType = stateManager.get('mediaType');
        if (mediaType === MEDIA_TYPE.AUDIO) {
            this.drawStatic();
        } else {
            this.stop();
        }
    }

    onMediaTypeChange({ type }) {
        if (type === MEDIA_TYPE.AUDIO) {
            this.handleResize();
            this.drawStatic();
        } else {
            this.stop();
        }
    }

    /**
     * Update visualization settings
     * @param {Object} newSettings
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);

        if (this.analyser) {
            if (newSettings.fftSize) {
                this.analyser.fftSize = newSettings.fftSize;
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            }
            if (newSettings.smoothing !== undefined) {
                this.analyser.smoothingTimeConstant = newSettings.smoothing;
            }
        }
    }

    /**
     * Destroy visualizer and clean up
     */
    destroy() {
        this.stop();

        if (this.source) {
            this.source.disconnect();
        }
        if (this.audioContext) {
            this.audioContext.close();
        }

        this.isInitialized = false;
        window.removeEventListener('resize', this.handleResize);
    }
}

export default AudioVisualizer;
