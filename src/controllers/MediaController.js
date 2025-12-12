/**
 * MediaController - Handles playback controls (play, pause, seek, speed)
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS, PLAYER_CONFIG } from '../utils/constants.js';

export class MediaController {
    constructor(mediaElement) {
        this.media = mediaElement;
        this.init();
    }

    init() {
        this.attachEventListeners();
        this.restorePlaybackRate();
    }

    attachEventListeners() {
        // Media element events
        this.media.addEventListener('play', () => this.handlePlay());
        this.media.addEventListener('pause', () => this.handlePause());
        this.media.addEventListener('ended', () => this.handleEnded());
        this.media.addEventListener('timeupdate', () => this.handleTimeUpdate());
        this.media.addEventListener('loadedmetadata', () => this.handleLoadedMetadata());
        this.media.addEventListener('waiting', () => this.handleBuffering(true));
        this.media.addEventListener('canplay', () => this.handleBuffering(false));
        this.media.addEventListener('error', (e) => this.handleError(e));

        // EventBus listeners
        eventBus.on(EVENTS.TRACK_CHANGE, (data) => this.loadTrack(data.track));
    }

    restorePlaybackRate() {
        const savedRate = stateManager.get('playbackRate');
        if (savedRate) {
            this.media.playbackRate = savedRate;
        }
    }

    // --- Playback Methods ---

    play() {
        if (this.media.src) {
            this.media.play().catch((error) => {
                console.error('Error playing media:', error);
                eventBus.emit(EVENTS.MEDIA_ERROR, { error, message: 'Failed to play media' });
            });
        }
    }

    pause() {
        this.media.pause();
    }

    toggle() {
        if (this.media.paused || this.media.ended) {
            this.play();
        } else {
            this.pause();
        }
    }

    stop() {
        this.pause();
        this.media.currentTime = 0;
        stateManager.set({ isPlaying: false, currentTime: 0 });
        eventBus.emit(EVENTS.STOP);
    }

    // --- Seeking Methods ---

    seek(time) {
        if (!isNaN(this.media.duration)) {
            this.media.currentTime = Math.max(0, Math.min(time, this.media.duration));
            eventBus.emit(EVENTS.SEEK, { time: this.media.currentTime });
        }
    }

    seekBy(seconds) {
        this.seek(this.media.currentTime + seconds);
    }

    skipBackward() {
        this.seekBy(-PLAYER_CONFIG.SKIP_BACKWARD);
    }

    skipForward() {
        this.seekBy(PLAYER_CONFIG.SKIP_FORWARD);
    }

    seekToPercent(percent) {
        if (!isNaN(this.media.duration)) {
            this.seek((percent / 100) * this.media.duration);
        }
    }

    // --- Playback Rate Methods ---

    setPlaybackRate(rate) {
        if (PLAYER_CONFIG.PLAYBACK_SPEEDS.includes(rate)) {
            this.media.playbackRate = rate;
            stateManager.set({ playbackRate: rate }, EVENTS.SPEED_CHANGE);
        }
    }

    cyclePlaybackRate() {
        const currentRate = this.media.playbackRate;
        const speeds = PLAYER_CONFIG.PLAYBACK_SPEEDS;
        const currentIndex = speeds.indexOf(currentRate);
        const nextIndex = (currentIndex + 1) % speeds.length;
        this.setPlaybackRate(speeds[nextIndex]);
    }

    getPlaybackRate() {
        return this.media.playbackRate;
    }

    // --- Track Loading ---

    loadTrack(track) {
        if (!track || !track.url) return;

        // Revoke previous blob URL if exists
        const currentSrc = this.media.src;
        if (currentSrc && currentSrc.startsWith('blob:')) {
            URL.revokeObjectURL(currentSrc);
        }

        this.media.src = track.url;
        this.media.load();

        stateManager.set({
            currentSrc: track.url,
            mediaTitle: track.name || 'Unknown',
            mediaArtist: track.artist || '',
            mediaCover: track.cover || null,
            mediaType: track.type,
        });

        eventBus.emit(EVENTS.MEDIA_LOAD, { track });
    }

    loadSource(url, metadata = {}) {
        const track = {
            url,
            name: metadata.name || 'Unknown',
            artist: metadata.artist || '',
            cover: metadata.cover || null,
            type: metadata.type || 'video',
        };
        this.loadTrack(track);
    }

    // --- Event Handlers ---

    handlePlay() {
        stateManager.set({ isPlaying: true }, EVENTS.PLAY);
    }

    handlePause() {
        stateManager.set({ isPlaying: false }, EVENTS.PAUSE);
    }

    handleEnded() {
        stateManager.set({ isPlaying: false });
        eventBus.emit(EVENTS.ENDED);

        // Auto-advance to next track
        const nextIndex = stateManager.getNextTrackIndex();
        if (nextIndex >= 0) {
            stateManager.setCurrentTrack(nextIndex);
            // Small delay before playing next track
            setTimeout(() => this.play(), 100);
        }
    }

    handleTimeUpdate() {
        stateManager.set({
            currentTime: this.media.currentTime,
        });
        eventBus.emit(EVENTS.TIME_UPDATE, {
            currentTime: this.media.currentTime,
            duration: this.media.duration,
        });
    }

    handleLoadedMetadata() {
        stateManager.set({
            duration: this.media.duration,
        });
        eventBus.emit(EVENTS.DURATION_CHANGE, {
            duration: this.media.duration,
        });
    }

    handleBuffering(isBuffering) {
        stateManager.set({ isBuffering });
    }

    handleError(event) {
        const error = event.target.error;
        let message = 'An unknown error occurred';

        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    message = 'Media loading aborted';
                    break;
                case error.MEDIA_ERR_NETWORK:
                    message = 'Network error while loading media';
                    break;
                case error.MEDIA_ERR_DECODE:
                    message = 'Media decoding error';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    message = 'Media format not supported';
                    break;
            }
        }

        console.error('Media error:', message);
        eventBus.emit(EVENTS.MEDIA_ERROR, { error, message });
    }

    // --- Getters ---

    get currentTime() {
        return this.media.currentTime;
    }

    get duration() {
        return this.media.duration || 0;
    }

    get isPlaying() {
        return !this.media.paused && !this.media.ended;
    }

    get progress() {
        return this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    }
}

export default MediaController;
