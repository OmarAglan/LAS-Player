/**
 * ThemeManager - Handles theme switching (light/dark)
 */

import { eventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { EVENTS, PLAYER_CONFIG } from '../utils/constants.js';

export class ThemeManager {
    constructor(containerElement) {
        this.container = containerElement;
        this.root = document.documentElement;

        this.init();
    }

    init() {
        this.applyTheme(stateManager.get('theme'));
        this.detectSystemTheme();
    }

    /**
     * Detect system color scheme preference
     */
    detectSystemTheme() {
        if (!stateManager.get('theme')) {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = prefersDark ? PLAYER_CONFIG.THEMES.DARK : PLAYER_CONFIG.THEMES.LIGHT;
            this.setTheme(theme, false);
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Only auto-switch if user hasn't manually set a theme
            const savedTheme = localStorage.getItem(PLAYER_CONFIG.STORAGE_KEYS.THEME);
            if (!savedTheme) {
                this.setTheme(e.matches ? PLAYER_CONFIG.THEMES.DARK : PLAYER_CONFIG.THEMES.LIGHT, false);
            }
        });
    }

    /**
     * Set theme
     * @param {string} theme - 'dark' or 'light'
     * @param {boolean} persist - Whether to persist to localStorage
     */
    setTheme(theme, persist = true) {
        if (!Object.values(PLAYER_CONFIG.THEMES).includes(theme)) {
            console.warn('Invalid theme:', theme);
            return;
        }

        stateManager.set({ theme });
        this.applyTheme(theme);

        eventBus.emit(EVENTS.THEME_CHANGE, { theme });
    }

    /**
     * Apply theme to DOM
     * @param {string} theme
     */
    applyTheme(theme) {
        // Remove existing theme classes
        this.root.classList.remove('theme-dark', 'theme-light');
        this.container?.classList.remove('theme-dark', 'theme-light');

        // Add new theme class
        this.root.classList.add(`theme-${theme}`);
        this.container?.classList.add(`theme-${theme}`);

        // Update CSS custom properties based on theme
        if (theme === PLAYER_CONFIG.THEMES.DARK) {
            this.applyDarkTheme();
        } else {
            this.applyLightTheme();
        }
    }

    applyDarkTheme() {
        this.root.style.setProperty('--color-bg-primary', '#0f172a');
        this.root.style.setProperty('--color-bg-secondary', '#1e293b');
        this.root.style.setProperty('--color-bg-tertiary', '#334155');
        this.root.style.setProperty('--color-text-primary', '#f8fafc');
        this.root.style.setProperty('--color-text-secondary', '#94a3b8');
        this.root.style.setProperty('--color-text-muted', '#64748b');
        this.root.style.setProperty('--color-accent', '#14b8a6');
        this.root.style.setProperty('--color-accent-hover', '#0d9488');
        this.root.style.setProperty('--color-glass', 'rgba(30, 41, 59, 0.8)');
        this.root.style.setProperty('--color-glass-border', 'rgba(148, 163, 184, 0.1)');
    }

    applyLightTheme() {
        this.root.style.setProperty('--color-bg-primary', '#f8fafc');
        this.root.style.setProperty('--color-bg-secondary', '#e2e8f0');
        this.root.style.setProperty('--color-bg-tertiary', '#cbd5e1');
        this.root.style.setProperty('--color-text-primary', '#0f172a');
        this.root.style.setProperty('--color-text-secondary', '#475569');
        this.root.style.setProperty('--color-text-muted', '#64748b');
        this.root.style.setProperty('--color-accent', '#0d9488');
        this.root.style.setProperty('--color-accent-hover', '#0f766e');
        this.root.style.setProperty('--color-glass', 'rgba(248, 250, 252, 0.9)');
        this.root.style.setProperty('--color-glass-border', 'rgba(15, 23, 42, 0.1)');
    }

    /**
     * Toggle between light and dark themes
     */
    toggle() {
        const currentTheme = stateManager.get('theme');
        const newTheme =
            currentTheme === PLAYER_CONFIG.THEMES.DARK
                ? PLAYER_CONFIG.THEMES.LIGHT
                : PLAYER_CONFIG.THEMES.DARK;

        this.setTheme(newTheme);
    }

    /**
     * Get current theme
     * @returns {string}
     */
    get currentTheme() {
        return stateManager.get('theme');
    }

    /**
     * Check if dark theme is active
     * @returns {boolean}
     */
    get isDark() {
        return this.currentTheme === PLAYER_CONFIG.THEMES.DARK;
    }

    /**
     * Get theme icon name
     * @returns {string}
     */
    getThemeIcon() {
        return this.isDark ? 'light_mode' : 'dark_mode';
    }
}

export default ThemeManager;
