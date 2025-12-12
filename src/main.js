/**
 * LAS Player - Entry Point
 * A modern, modular HTML5 media player
 */

import { PlayerCore } from './core/PlayerCore.js';

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the player with the main container
    const player = new PlayerCore('#player-container');

    // Expose player globally for debugging and external access
    window.LASPlayer = player;

    console.log('LAS Player ready');
});

// Export for module usage
export { PlayerCore };
export { eventBus } from './core/EventBus.js';
export { stateManager } from './core/StateManager.js';
