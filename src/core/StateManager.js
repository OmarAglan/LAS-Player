/**
 * StateManager - Central state management for the player
 */

import { eventBus } from './EventBus.js';
import { PLAYER_CONFIG, EVENTS, MEDIA_TYPE, REPEAT_MODE } from '../utils/constants.js';
import { storageGet, storageSet } from '../utils/helpers.js';

class StateManager {
    constructor() {
        this.state = {
            // Playback state
            isPlaying: false,
            currentTime: 0,
            duration: 0,
            playbackRate: PLAYER_CONFIG.DEFAULT_SPEED,
            isBuffering: false,

            // Volume state
            volume: PLAYER_CONFIG.DEFAULT_VOLUME,
            isMuted: false,

            // Media state
            mediaType: MEDIA_TYPE.VIDEO,
            currentSrc: null,
            mediaTitle: '',
            mediaArtist: '',
            mediaCover: null,

            // Playlist state
            playlist: [],
            currentTrackIndex: -1,
            shuffleEnabled: false,
            repeatMode: REPEAT_MODE.OFF,
            shuffledOrder: [],

            // UI state
            theme: PLAYER_CONFIG.THEMES.DARK,
            isFullscreen: false,
            isPiP: false,
            controlsVisible: true,
            sidebarOpen: false,

            // Subtitle state
            subtitlesEnabled: false,
            subtitleSrc: null,
        };

        this.loadPersistedState();
    }

    /**
     * Load persisted state from localStorage
     */
    loadPersistedState() {
        const { STORAGE_KEYS } = PLAYER_CONFIG;

        const savedVolume = storageGet(STORAGE_KEYS.VOLUME);
        if (savedVolume !== null) {
            this.state.volume = savedVolume;
        }

        const savedTheme = storageGet(STORAGE_KEYS.THEME);
        if (savedTheme) {
            this.state.theme = savedTheme;
        }

        const savedSpeed = storageGet(STORAGE_KEYS.PLAYBACK_SPEED);
        if (savedSpeed !== null) {
            this.state.playbackRate = savedSpeed;
        }
    }

    /**
     * Get current state or a specific property
     * @param {string} [key] - Optional state key
     * @returns {*} State value
     */
    get(key) {
        if (key) {
            return this.state[key];
        }
        return { ...this.state };
    }

    /**
     * Update state and emit change event
     * @param {Object} updates - State updates
     * @param {string} [eventName] - Optional event to emit
     */
    set(updates, eventName) {
        const previousState = { ...this.state };
        Object.assign(this.state, updates);

        // Persist specific state changes
        this.persistState(updates);

        // Emit generic state change
        if (eventName) {
            eventBus.emit(eventName, {
                current: { ...this.state },
                previous: previousState,
                changes: updates,
            });
        }
    }

    /**
     * Persist specific state to localStorage
     * @param {Object} updates - State updates
     */
    persistState(updates) {
        const { STORAGE_KEYS } = PLAYER_CONFIG;

        if ('volume' in updates) {
            storageSet(STORAGE_KEYS.VOLUME, updates.volume);
        }

        if ('theme' in updates) {
            storageSet(STORAGE_KEYS.THEME, updates.theme);
        }

        if ('playbackRate' in updates) {
            storageSet(STORAGE_KEYS.PLAYBACK_SPEED, updates.playbackRate);
        }
    }

    /**
     * Update playlist
     * @param {Array} playlist - New playlist
     */
    setPlaylist(playlist) {
        this.set({ playlist, currentTrackIndex: playlist.length > 0 ? 0 : -1 });
        eventBus.emit(EVENTS.PLAYLIST_UPDATE, { playlist });
    }

    /**
     * Add tracks to playlist
     * @param {Array} tracks - Tracks to add
     */
    addToPlaylist(tracks) {
        const newPlaylist = [...this.state.playlist, ...tracks];
        this.setPlaylist(newPlaylist);
    }

    /**
     * Remove track from playlist
     * @param {number} index - Track index
     */
    removeFromPlaylist(index) {
        const newPlaylist = this.state.playlist.filter((_, i) => i !== index);
        let newIndex = this.state.currentTrackIndex;

        if (index < newIndex) {
            newIndex--;
        } else if (index === newIndex) {
            newIndex = Math.min(newIndex, newPlaylist.length - 1);
        }

        this.set({
            playlist: newPlaylist,
            currentTrackIndex: newIndex,
        });
        eventBus.emit(EVENTS.PLAYLIST_UPDATE, { playlist: newPlaylist });
    }

    /**
     * Set current track by index
     * @param {number} index - Track index
     */
    setCurrentTrack(index) {
        if (index >= 0 && index < this.state.playlist.length) {
            this.set({ currentTrackIndex: index });
            eventBus.emit(EVENTS.TRACK_CHANGE, {
                track: this.state.playlist[index],
                index,
            });
        }
    }

    /**
     * Get current track
     * @returns {Object|null} Current track
     */
    getCurrentTrack() {
        const { playlist, currentTrackIndex } = this.state;
        return currentTrackIndex >= 0 ? playlist[currentTrackIndex] : null;
    }

    /**
     * Get next track index
     * @returns {number} Next track index or -1
     */
    getNextTrackIndex() {
        const { playlist, currentTrackIndex, repeatMode, shuffleEnabled, shuffledOrder } =
            this.state;

        if (playlist.length === 0) return -1;

        if (repeatMode === REPEAT_MODE.ONE) {
            return currentTrackIndex;
        }

        let nextIndex;

        if (shuffleEnabled && shuffledOrder.length > 0) {
            const currentShufflePos = shuffledOrder.indexOf(currentTrackIndex);
            const nextShufflePos = currentShufflePos + 1;

            if (nextShufflePos >= shuffledOrder.length) {
                return repeatMode === REPEAT_MODE.ALL ? shuffledOrder[0] : -1;
            }

            nextIndex = shuffledOrder[nextShufflePos];
        } else {
            nextIndex = currentTrackIndex + 1;

            if (nextIndex >= playlist.length) {
                return repeatMode === REPEAT_MODE.ALL ? 0 : -1;
            }
        }

        return nextIndex;
    }

    /**
     * Get previous track index
     * @returns {number} Previous track index or -1
     */
    getPreviousTrackIndex() {
        const { playlist, currentTrackIndex, shuffleEnabled, shuffledOrder } = this.state;

        if (playlist.length === 0) return -1;

        if (shuffleEnabled && shuffledOrder.length > 0) {
            const currentShufflePos = shuffledOrder.indexOf(currentTrackIndex);
            const prevShufflePos = currentShufflePos - 1;

            return prevShufflePos >= 0 ? shuffledOrder[prevShufflePos] : shuffledOrder[shuffledOrder.length - 1];
        }

        return currentTrackIndex > 0 ? currentTrackIndex - 1 : playlist.length - 1;
    }

    /**
     * Toggle shuffle mode
     */
    toggleShuffle() {
        const shuffleEnabled = !this.state.shuffleEnabled;
        let shuffledOrder = [];

        if (shuffleEnabled) {
            // Create shuffled order excluding current track, then add it at the start
            const indices = this.state.playlist
                .map((_, i) => i)
                .filter((i) => i !== this.state.currentTrackIndex);

            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }

            shuffledOrder = [this.state.currentTrackIndex, ...indices];
        }

        this.set({ shuffleEnabled, shuffledOrder });
        eventBus.emit(EVENTS.SHUFFLE_TOGGLE, { shuffleEnabled });
    }

    /**
     * Cycle repeat mode
     */
    cycleRepeatMode() {
        const modes = [REPEAT_MODE.OFF, REPEAT_MODE.ALL, REPEAT_MODE.ONE];
        const currentIndex = modes.indexOf(this.state.repeatMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];

        this.set({ repeatMode: nextMode });
        eventBus.emit(EVENTS.REPEAT_TOGGLE, { repeatMode: nextMode });
    }
}

// Singleton instance
export const stateManager = new StateManager();
export default StateManager;
