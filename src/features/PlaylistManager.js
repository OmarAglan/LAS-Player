/**
 * PlaylistManager - Handles playlist functionality
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS, REPEAT_MODE } from '../utils/constants.js';
import { shuffleArray } from '../utils/helpers.js';

export class PlaylistManager {
    constructor() {
        this.init();
    }

    init() {
        this.subscribeToEvents();
    }

    subscribeToEvents() {
        eventBus.on(EVENTS.ENDED, () => this.handleTrackEnded());
    }

    // --- Playlist Operations ---

    /**
     * Set the playlist
     * @param {Array} tracks
     * @param {boolean} autoPlay - Whether to auto-play first track
     */
    setPlaylist(tracks, autoPlay = false) {
        stateManager.setPlaylist(tracks);

        if (autoPlay && tracks.length > 0) {
            this.playTrack(0);
        }
    }

    /**
     * Add tracks to playlist
     * @param {Array} tracks
     */
    addTracks(tracks) {
        stateManager.addToPlaylist(tracks);
    }

    /**
     * Remove track from playlist
     * @param {number} index
     */
    removeTrack(index) {
        const currentIndex = stateManager.get('currentTrackIndex');

        stateManager.removeFromPlaylist(index);

        // If we removed the currently playing track
        if (index === currentIndex) {
            const playlist = stateManager.get('playlist');
            if (playlist.length > 0) {
                const newIndex = Math.min(index, playlist.length - 1);
                this.playTrack(newIndex);
            }
        }
    }

    /**
     * Clear the playlist
     */
    clearPlaylist() {
        stateManager.setPlaylist([]);
    }

    /**
     * Move track in playlist
     * @param {number} fromIndex
     * @param {number} toIndex
     */
    moveTrack(fromIndex, toIndex) {
        const playlist = [...stateManager.get('playlist')];
        const currentIndex = stateManager.get('currentTrackIndex');

        const [track] = playlist.splice(fromIndex, 1);
        playlist.splice(toIndex, 0, track);

        // Update current index if needed
        let newCurrentIndex = currentIndex;
        if (fromIndex === currentIndex) {
            newCurrentIndex = toIndex;
        } else if (fromIndex < currentIndex && toIndex >= currentIndex) {
            newCurrentIndex--;
        } else if (fromIndex > currentIndex && toIndex <= currentIndex) {
            newCurrentIndex++;
        }

        stateManager.set({
            playlist,
            currentTrackIndex: newCurrentIndex,
        });

        eventBus.emit(EVENTS.PLAYLIST_UPDATE, { playlist });
    }

    // --- Playback Control ---

    /**
     * Play track at index
     * @param {number} index
     */
    playTrack(index) {
        stateManager.setCurrentTrack(index);
    }

    /**
     * Play next track
     */
    playNext() {
        const nextIndex = stateManager.getNextTrackIndex();
        if (nextIndex >= 0) {
            this.playTrack(nextIndex);
        }
    }

    /**
     * Play previous track
     */
    playPrevious() {
        const prevIndex = stateManager.getPreviousTrackIndex();
        if (prevIndex >= 0) {
            this.playTrack(prevIndex);
        }
    }

    /**
     * Handle track ended event
     */
    handleTrackEnded() {
        // Auto-advance is handled in MediaController
    }

    // --- Shuffle & Repeat ---

    /**
     * Toggle shuffle mode
     */
    toggleShuffle() {
        stateManager.toggleShuffle();
    }

    /**
     * Cycle repeat mode
     */
    cycleRepeat() {
        stateManager.cycleRepeatMode();
    }

    // --- Getters ---

    get playlist() {
        return stateManager.get('playlist');
    }

    get currentTrackIndex() {
        return stateManager.get('currentTrackIndex');
    }

    get currentTrack() {
        return stateManager.getCurrentTrack();
    }

    get isShuffled() {
        return stateManager.get('shuffleEnabled');
    }

    get repeatMode() {
        return stateManager.get('repeatMode');
    }

    get isEmpty() {
        return this.playlist.length === 0;
    }

    get trackCount() {
        return this.playlist.length;
    }

    /**
     * Get repeat icon name
     * @returns {string}
     */
    getRepeatIcon() {
        const mode = this.repeatMode;
        if (mode === REPEAT_MODE.ONE) return 'repeat_one';
        return 'repeat';
    }

    /**
     * Check if repeat is active
     * @returns {boolean}
     */
    isRepeatActive() {
        return this.repeatMode !== REPEAT_MODE.OFF;
    }
}

export default PlaylistManager;
