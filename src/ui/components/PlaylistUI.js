/**
 * PlaylistUI - Renders and manages playlist UI
 */

import { eventBus } from '../../core/EventBus.js';
import { stateManager } from '../../core/StateManager.js';
import { EVENTS, MEDIA_TYPE } from '../../utils/constants.js';
import { formatTime, createElement } from '../../utils/helpers.js';

export class PlaylistUI {
    constructor(containerElement, playlistManager) {
        this.container = containerElement;
        this.playlistManager = playlistManager;
        this.draggedItem = null;

        this.init();
    }

    init() {
        this.subscribeToEvents();
        this.render();
    }

    subscribeToEvents() {
        eventBus.on(EVENTS.PLAYLIST_UPDATE, () => this.render());
        eventBus.on(EVENTS.TRACK_CHANGE, () => this.updateActiveTrack());
        eventBus.on('ui:playlist:render', () => this.render());
    }

    /**
     * Render the playlist
     */
    render() {
        if (!this.container) return;

        const playlist = this.playlistManager.playlist;

        if (playlist.length === 0) {
            this.renderEmpty();
            return;
        }

        this.container.innerHTML = '';

        playlist.forEach((track, index) => {
            const item = this.createPlaylistItem(track, index);
            this.container.appendChild(item);
        });

        this.updateActiveTrack();
    }

    /**
     * Render empty state
     */
    renderEmpty() {
        this.container.innerHTML = `
      <div class="playlist-empty" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem;">
        <i class="material-icons" style="font-size: 3rem; color: var(--color-text-muted); margin-bottom: 1rem;">queue_music</i>
        <p style="color: var(--color-text-muted); text-align: center;">No tracks in playlist</p>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; text-align: center; margin-top: 0.5rem;">
          Open files or drag & drop to add tracks
        </p>
      </div>
    `;
    }

    /**
     * Create a playlist item element
     * @param {Object} track
     * @param {number} index
     * @returns {HTMLElement}
     */
    createPlaylistItem(track, index) {
        const isActive = index === this.playlistManager.currentTrackIndex;
        const isVideo = track.type === MEDIA_TYPE.VIDEO;

        const item = createElement('div', {
            className: `playlist-item ${isActive ? 'active' : ''}`,
            dataset: { index: index.toString() },
            draggable: 'true',
        });

        // Icon
        const icon = createElement('div', { className: 'playlist-item-icon' }, [
            createElement('i', { className: 'material-icons' }, isVideo ? 'movie' : 'music_note'),
        ]);

        // Info
        const info = createElement('div', { className: 'playlist-item-info' });

        const title = createElement(
            'div',
            { className: 'playlist-item-title' },
            track.name || 'Unknown'
        );

        const meta = createElement('div', { className: 'playlist-item-meta' });

        if (track.artist) {
            meta.textContent = track.artist;
        } else if (track.duration) {
            meta.textContent = formatTime(track.duration);
        } else {
            meta.textContent = isVideo ? 'Video' : 'Audio';
        }

        info.appendChild(title);
        info.appendChild(meta);

        // Remove button
        const removeBtn = createElement(
            'button',
            {
                className: 'control-btn playlist-item-remove',
                title: 'Remove from playlist',
                onClick: (e) => {
                    e.stopPropagation();
                    this.playlistManager.removeTrack(index);
                },
            },
            [createElement('i', { className: 'material-icons' }, 'close')]
        );
        removeBtn.style.cssText = 'width: 28px; height: 28px; opacity: 0; transition: opacity 0.2s;';

        item.appendChild(icon);
        item.appendChild(info);
        item.appendChild(removeBtn);

        // Click to play
        item.addEventListener('click', () => {
            this.playlistManager.playTrack(index);
        });

        // Hover effect for remove button
        item.addEventListener('mouseenter', () => {
            removeBtn.style.opacity = '1';
        });
        item.addEventListener('mouseleave', () => {
            removeBtn.style.opacity = '0';
        });

        // Drag & drop
        item.addEventListener('dragstart', (e) => this.handleDragStart(e, index));
        item.addEventListener('dragover', (e) => this.handleDragOver(e));
        item.addEventListener('dragenter', (e) => this.handleDragEnter(e));
        item.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        item.addEventListener('drop', (e) => this.handleDrop(e, index));
        item.addEventListener('dragend', () => this.handleDragEnd());

        return item;
    }

    /**
     * Update active track highlighting
     */
    updateActiveTrack() {
        const currentIndex = this.playlistManager.currentTrackIndex;
        const items = this.container.querySelectorAll('.playlist-item');

        items.forEach((item, index) => {
            item.classList.toggle('active', index === currentIndex);
        });
    }

    // --- Drag & Drop Handlers ---

    handleDragStart(e, index) {
        this.draggedItem = index;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.target.closest('.playlist-item')?.classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.target.closest('.playlist-item')?.classList.remove('drag-over');
    }

    handleDrop(e, targetIndex) {
        e.preventDefault();
        e.target.closest('.playlist-item')?.classList.remove('drag-over');

        if (this.draggedItem !== null && this.draggedItem !== targetIndex) {
            this.playlistManager.moveTrack(this.draggedItem, targetIndex);
        }

        this.draggedItem = null;
    }

    handleDragEnd() {
        this.container.querySelectorAll('.playlist-item').forEach((item) => {
            item.classList.remove('dragging', 'drag-over');
        });
        this.draggedItem = null;
    }
}

export default PlaylistUI;
