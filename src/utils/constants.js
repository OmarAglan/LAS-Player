/**
 * Constants and configuration for the LAS Player
 */

export const PLAYER_CONFIG = {
    // Playback speeds
    PLAYBACK_SPEEDS: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    DEFAULT_SPEED: 1,

    // Skip times in seconds
    SKIP_BACKWARD: 10,
    SKIP_FORWARD: 10,

    // Volume
    DEFAULT_VOLUME: 1,
    VOLUME_STEP: 0.1,

    // Control visibility
    CONTROLS_HIDE_DELAY: 3000,
    CONTROLS_FADE_DURATION: 300,

    // Visualizer
    VISUALIZER_FFT_SIZE: 256,
    VISUALIZER_BAR_WIDTH: 3,
    VISUALIZER_BAR_GAP: 2,

    // LocalStorage keys
    STORAGE_KEYS: {
        VOLUME: 'las-player-volume',
        THEME: 'las-player-theme',
        PLAYBACK_SPEED: 'las-player-speed',
        PLAYLIST: 'las-player-playlist',
    },

    // Supported file types
    AUDIO_EXTENSIONS: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
    VIDEO_EXTENSIONS: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'flv'],
    SUBTITLE_EXTENSIONS: ['vtt', 'srt'],

    // Themes
    THEMES: {
        DARK: 'dark',
        LIGHT: 'light',
    },
};

export const EVENTS = {
    // Playback events
    PLAY: 'player:play',
    PAUSE: 'player:pause',
    STOP: 'player:stop',
    SEEK: 'player:seek',
    TIME_UPDATE: 'player:timeupdate',
    DURATION_CHANGE: 'player:durationchange',
    ENDED: 'player:ended',
    SPEED_CHANGE: 'player:speedchange',

    // Volume events
    VOLUME_CHANGE: 'volume:change',
    MUTE_TOGGLE: 'volume:mute',

    // Media events
    MEDIA_LOAD: 'media:load',
    MEDIA_ERROR: 'media:error',
    MEDIA_TYPE_CHANGE: 'media:typechange',

    // Playlist events
    PLAYLIST_UPDATE: 'playlist:update',
    TRACK_CHANGE: 'playlist:trackchange',
    SHUFFLE_TOGGLE: 'playlist:shuffle',
    REPEAT_TOGGLE: 'playlist:repeat',

    // UI events
    CONTROLS_SHOW: 'ui:controls:show',
    CONTROLS_HIDE: 'ui:controls:hide',
    THEME_CHANGE: 'ui:theme:change',
    FULLSCREEN_CHANGE: 'ui:fullscreen:change',
    PIP_CHANGE: 'ui:pip:change',
    SIDEBAR_TOGGLE: 'ui:sidebar:toggle',

    // Subtitle events
    SUBTITLE_LOAD: 'subtitle:load',
    SUBTITLE_TOGGLE: 'subtitle:toggle',
};

export const MEDIA_TYPE = {
    VIDEO: 'video',
    AUDIO: 'audio',
    UNKNOWN: 'unknown',
};

export const REPEAT_MODE = {
    OFF: 'off',
    ALL: 'all',
    ONE: 'one',
};
