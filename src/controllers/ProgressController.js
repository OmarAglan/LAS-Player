/**
 * ProgressController - Handles progress bar, seeking, and time display
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS } from '../utils/constants.js';
import { formatTime, clamp, isTouchDevice } from '../utils/helpers.js';

export class ProgressController {
    constructor(elements, mediaController) {
        this.mediaController = mediaController;
        this.elements = elements; // { progressBar, progressFill, progressBuffer, tooltip, currentTime, duration }

        this.isDragging = false;
        this.isTouch = isTouchDevice();

        this.init();
    }

    init() {
        this.attachEventListeners();
        this.subscribeToEvents();
    }

    attachEventListeners() {
        const { progressBar } = this.elements;

        if (!progressBar) return;

        // Mouse events
        progressBar.addEventListener('mousedown', (e) => this.handleSeekStart(e));
        progressBar.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        progressBar.addEventListener('mouseleave', () => this.handleMouseLeave());

        // Touch events
        progressBar.addEventListener('touchstart', (e) => this.handleSeekStart(e), { passive: true });
        progressBar.addEventListener('touchmove', (e) => this.handleSeekMove(e), { passive: false });
        progressBar.addEventListener('touchend', () => this.handleSeekEnd());

        // Window events for drag
        window.addEventListener('mousemove', (e) => {
            if (this.isDragging) this.handleSeekMove(e);
        });
        window.addEventListener('mouseup', () => {
            if (this.isDragging) this.handleSeekEnd();
        });

        // Click to seek
        progressBar.addEventListener('click', (e) => this.handleClick(e));
    }

    subscribeToEvents() {
        eventBus.on(EVENTS.TIME_UPDATE, (data) => this.updateProgress(data));
        eventBus.on(EVENTS.DURATION_CHANGE, (data) => this.updateDuration(data));
        eventBus.on(EVENTS.MEDIA_LOAD, () => this.reset());
    }

    // --- Progress Update Methods ---

    updateProgress({ currentTime, duration }) {
        const { progressFill, currentTime: currentTimeEl } = this.elements;

        if (progressFill && duration > 0) {
            const percent = (currentTime / duration) * 100;
            progressFill.style.width = `${percent}%`;
        }

        if (currentTimeEl) {
            currentTimeEl.textContent = formatTime(currentTime);
        }
    }

    updateDuration({ duration }) {
        const { duration: durationEl } = this.elements;
        if (durationEl) {
            durationEl.textContent = formatTime(duration);
        }
    }

    updateBuffer(buffered, duration) {
        const { progressBuffer } = this.elements;
        if (!progressBuffer || !buffered.length || duration <= 0) return;

        // Get the buffer range that includes current time
        const currentTime = this.mediaController.currentTime;
        for (let i = 0; i < buffered.length; i++) {
            if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
                const bufferEnd = (buffered.end(i) / duration) * 100;
                progressBuffer.style.width = `${bufferEnd}%`;
                break;
            }
        }
    }

    reset() {
        const { progressFill, progressBuffer, currentTime, duration } = this.elements;

        if (progressFill) progressFill.style.width = '0%';
        if (progressBuffer) progressBuffer.style.width = '0%';
        if (currentTime) currentTime.textContent = '00:00';
        if (duration) duration.textContent = '00:00';
    }

    // --- Seeking Methods ---

    handleSeekStart(e) {
        this.isDragging = true;
        this.handleSeekMove(e);
    }

    handleSeekMove(e) {
        if (!this.isDragging && !e.type.includes('touch')) return;

        const { progressBar } = this.elements;
        const rect = progressBar.getBoundingClientRect();

        let clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            if (e.cancelable) e.preventDefault(); // Prevent scroll during touch seek
        } else {
            clientX = e.clientX;
        }

        const position = clamp(clientX - rect.left, 0, rect.width);
        const percent = (position / rect.width) * 100;

        // Update visual progress immediately
        const { progressFill } = this.elements;
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }

        // Seek to position
        this.mediaController.seekToPercent(percent);
    }

    handleSeekEnd() {
        this.isDragging = false;
    }

    handleClick(e) {
        if (this.isDragging) return; // Don't double-process if dragging

        const { progressBar } = this.elements;
        const rect = progressBar.getBoundingClientRect();
        const position = clamp(e.clientX - rect.left, 0, rect.width);
        const percent = (position / rect.width) * 100;

        this.mediaController.seekToPercent(percent);
    }

    // --- Tooltip Methods ---

    handleMouseMove(e) {
        if (this.isTouch) return;

        const { progressBar, tooltip } = this.elements;
        if (!tooltip) return;

        const rect = progressBar.getBoundingClientRect();
        const position = clamp(e.clientX - rect.left, 0, rect.width);
        const percent = position / rect.width;
        const time = percent * this.mediaController.duration;

        tooltip.textContent = formatTime(time);
        tooltip.style.left = `${position}px`;
        tooltip.classList.remove('hidden');
    }

    handleMouseLeave() {
        const { tooltip } = this.elements;
        if (tooltip) {
            tooltip.classList.add('hidden');
        }
    }

    // --- Getters ---

    get progress() {
        return this.mediaController.progress;
    }
}

export default ProgressController;
