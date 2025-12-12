/**
 * FileLoader - Handles file and folder loading with File System Access API
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS, PLAYER_CONFIG, MEDIA_TYPE } from '../utils/constants.js';
import {
    getFileExtension,
    getMediaType,
    isFileSystemAccessSupported,
    generateId,
} from '../utils/helpers.js';

export class FileLoader {
    constructor() {
        this.supportsFSA = isFileSystemAccessSupported();
    }

    /**
     * Open file picker dialog for single file
     * @param {string} accept - Accept types (e.g., 'video/*,audio/*')
     * @returns {Promise<File|null>}
     */
    async openFilePicker(accept = 'video/*,audio/*') {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;

            input.onchange = (e) => {
                const file = e.target.files[0];
                resolve(file || null);
            };

            input.click();
        });
    }

    /**
     * Open file picker for multiple files
     * @param {string} accept - Accept types
     * @returns {Promise<FileList|null>}
     */
    async openMultipleFilePicker(accept = 'video/*,audio/*') {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = accept;
            input.multiple = true;

            input.onchange = (e) => {
                resolve(e.target.files);
            };

            input.click();
        });
    }

    /**
     * Open folder picker using File System Access API (or fallback)
     * @returns {Promise<Array>} Array of track objects
     */
    async openFolder() {
        if (this.supportsFSA) {
            return this.openFolderFSA();
        } else {
            return this.openFolderFallback();
        }
    }

    /**
     * Open folder using File System Access API
     * @returns {Promise<Array>}
     */
    async openFolderFSA() {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const tracks = [];

            await this.scanDirectory(dirHandle, tracks);

            // Sort by name
            tracks.sort((a, b) => a.name.localeCompare(b.name));

            return tracks;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error opening folder:', error);
            }
            return [];
        }
    }

    /**
     * Recursively scan directory for media files
     * @param {FileSystemDirectoryHandle} dirHandle
     * @param {Array} tracks
     * @param {string} path
     */
    async scanDirectory(dirHandle, tracks, path = '') {
        for await (const entry of dirHandle.values()) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;

            if (entry.kind === 'file') {
                const mediaType = getMediaType(entry.name);
                if (mediaType !== MEDIA_TYPE.UNKNOWN) {
                    const file = await entry.getFile();
                    const track = await this.createTrackFromFile(file, entryPath);
                    tracks.push(track);
                }
            } else if (entry.kind === 'directory') {
                // Recursively scan subdirectories
                await this.scanDirectory(entry, tracks, entryPath);
            }
        }
    }

    /**
     * Fallback folder picker using webkitdirectory
     * @returns {Promise<Array>}
     */
    async openFolderFallback() {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.webkitdirectory = true;
            input.multiple = true;

            input.onchange = async (e) => {
                const files = Array.from(e.target.files);
                const tracks = [];

                for (const file of files) {
                    const mediaType = getMediaType(file.name);
                    if (mediaType !== MEDIA_TYPE.UNKNOWN) {
                        const track = await this.createTrackFromFile(file, file.webkitRelativePath);
                        tracks.push(track);
                    }
                }

                // Sort by path
                tracks.sort((a, b) => a.path.localeCompare(b.path));

                resolve(tracks);
            };

            input.click();
        });
    }

    /**
     * Create track object from file
     * @param {File} file
     * @param {string} path
     * @returns {Promise<Object>}
     */
    async createTrackFromFile(file, path = '') {
        const mediaType = getMediaType(file.name);
        const url = URL.createObjectURL(file);

        const track = {
            id: generateId(),
            name: this.getDisplayName(file.name),
            filename: file.name,
            path: path || file.name,
            url,
            type: mediaType,
            size: file.size,
            file: file,
            artist: '',
            album: '',
            cover: null,
            duration: null,
        };

        // Try to extract metadata for audio files
        if (mediaType === MEDIA_TYPE.AUDIO) {
            await this.extractAudioMetadata(track, file);
        }

        return track;
    }

    /**
     * Get display name from filename (without extension)
     * @param {string} filename
     * @returns {string}
     */
    getDisplayName(filename) {
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(0, lastDot) : filename;
    }

    /**
     * Extract audio metadata (ID3 tags)
     * @param {Object} track
     * @param {File} file
     */
    async extractAudioMetadata(track, file) {
        // Basic metadata extraction - can be enhanced with a library like jsmediatags
        // For now, we'll try to parse artist - title format from filename
        const name = track.name;

        // Try common patterns: "Artist - Title" or "01. Artist - Title"
        const patterns = [
            /^(?:\d+\.\s*)?(.+?)\s*-\s*(.+)$/, // "Artist - Title" or "01. Artist - Title"
            /^(?:\d+\.\s*)?(.+)$/, // Just title
        ];

        for (const pattern of patterns) {
            const match = name.match(pattern);
            if (match) {
                if (match.length === 3) {
                    track.artist = match[1].trim();
                    track.name = match[2].trim();
                }
                break;
            }
        }
    }

    /**
     * Open subtitle file picker
     * @returns {Promise<File|null>}
     */
    async openSubtitlePicker() {
        const extensions = PLAYER_CONFIG.SUBTITLE_EXTENSIONS.map((ext) => `.${ext}`).join(',');
        return this.openFilePicker(extensions);
    }

    /**
     * Load files and add to playlist
     * @param {FileList|Array} files
     * @returns {Promise<Array>}
     */
    async loadFiles(files) {
        const fileArray = Array.from(files);
        const tracks = [];

        for (const file of fileArray) {
            const mediaType = getMediaType(file.name);
            if (mediaType !== MEDIA_TYPE.UNKNOWN) {
                const track = await this.createTrackFromFile(file);
                tracks.push(track);
            }
        }

        return tracks;
    }

    /**
     * Handle drag and drop files
     * @param {DataTransfer} dataTransfer
     * @returns {Promise<Array>}
     */
    async handleDrop(dataTransfer) {
        const items = dataTransfer.items;
        const tracks = [];

        if (items) {
            // Modern API with directory support
            for (const item of items) {
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();

                    if (entry) {
                        if (entry.isDirectory) {
                            await this.processDirectoryEntry(entry, tracks);
                        } else {
                            const file = item.getAsFile();
                            if (file) {
                                const mediaType = getMediaType(file.name);
                                if (mediaType !== MEDIA_TYPE.UNKNOWN) {
                                    const track = await this.createTrackFromFile(file);
                                    tracks.push(track);
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Fallback for older browsers
            const files = dataTransfer.files;
            return this.loadFiles(files);
        }

        return tracks;
    }

    /**
     * Process directory entry recursively
     * @param {FileSystemDirectoryEntry} dirEntry
     * @param {Array} tracks
     * @param {string} path
     */
    async processDirectoryEntry(dirEntry, tracks, path = '') {
        return new Promise((resolve) => {
            const reader = dirEntry.createReader();

            reader.readEntries(async (entries) => {
                for (const entry of entries) {
                    const entryPath = path ? `${path}/${entry.name}` : entry.name;

                    if (entry.isFile) {
                        const mediaType = getMediaType(entry.name);
                        if (mediaType !== MEDIA_TYPE.UNKNOWN) {
                            const file = await this.getFileFromEntry(entry);
                            if (file) {
                                const track = await this.createTrackFromFile(file, entryPath);
                                tracks.push(track);
                            }
                        }
                    } else if (entry.isDirectory) {
                        await this.processDirectoryEntry(entry, tracks, entryPath);
                    }
                }
                resolve();
            });
        });
    }

    /**
     * Get File from FileSystemFileEntry
     * @param {FileSystemFileEntry} fileEntry
     * @returns {Promise<File>}
     */
    getFileFromEntry(fileEntry) {
        return new Promise((resolve) => {
            fileEntry.file(resolve, () => resolve(null));
        });
    }

    /**
     * Clean up object URLs
     * @param {Array} tracks
     */
    cleanupTracks(tracks) {
        for (const track of tracks) {
            if (track.url && track.url.startsWith('blob:')) {
                URL.revokeObjectURL(track.url);
            }
            if (track.cover && track.cover.startsWith('blob:')) {
                URL.revokeObjectURL(track.cover);
            }
        }
    }
}

export default FileLoader;
