/**
 * Theme Manager - Manages loading, switching, and communicating with themes
 * 
 * Central manager for registering and activating visual themes.
 * Handles theme lifecycle and integration with core services.
 */

const path = require('path');
const fs = require('fs');
const eventBus = require('../core/event-bus');
const settingsService = require('../core/settings-service');
const pomodoroService = require('../core/pomodoro-service');
const todoistService = require('../core/todoist-service');

class ThemeManager {
  constructor() {
    // Map of registered themes
    this.themes = new Map();
    
    // Currently active theme
    this.activeTheme = null;
    
    // Settings events
    this.settingsEvents = settingsService.getEvents();
    
    // Pomodoro events
    this.pomodoroEvents = pomodoroService.getEvents();
    
    // Todoist events
    this.todoistEvents = todoistService.getEvents();
    
    // Subscribe to events
    this._subscribeToEvents();
    
    console.log('ThemeManager: Initialized');
  }
  
  /**
   * Register a theme
   * @param {string} themeName - Name of the theme
   * @param {BaseTheme} ThemeClass - Theme class constructor
   */
  registerTheme(themeName, ThemeClass) {
    if (this.themes.has(themeName)) {
      console.warn(`ThemeManager: Theme "${themeName}" is already registered`);
      return;
    }
    
    // Create instance of the theme
    const theme = new ThemeClass(this);
    
    // Store in themes map
    this.themes.set(themeName, theme);
    
    console.log(`ThemeManager: Registered theme "${themeName}"`);
  }
  
  /**
   * Get a theme by name
   * @param {string} themeName - Name of the theme
   * @returns {BaseTheme|null} - The theme or null if not found
   */
  getTheme(themeName) {
    return this.themes.get(themeName) || null;
  }
  
  /**
   * Get all registered themes
   * @returns {Map} - Map of registered themes
   */
  getAllThemes() {
    return this.themes;
  }
  
  /**
   * Get the active theme
   * @returns {BaseTheme|null} - The active theme or null if none
   */
  getActiveTheme() {
    return this.activeTheme;
  }
  
  /**
   * Check if a theme is registered
   * @param {string} themeName - Name of the theme
   * @returns {boolean} - True if the theme is registered
   */
  hasTheme(themeName) {
    return this.themes.has(themeName);
  }
  
  /**
   * Discover and load all available themes
   * @returns {Promise} - Resolves when all themes are loaded
   */
  async discoverThemes() {
    const themesDir = path.join(__dirname, 'themes');
    
    try {
      // Read the themes directory
      const files = fs.readdirSync(themesDir);
      
      // Filter for theme files
      const themeFiles = files.filter(file => 
        file.endsWith('-theme.js') && file !== 'base-theme.js'
      );
      
      // Load each theme
      for (const file of themeFiles) {
        try {
          const ThemeClass = require(path.join(themesDir, file));
          const themeName = path.basename(file, '.js').replace('-theme', '');
          
          this.registerTheme(themeName, ThemeClass);
        } catch (error) {
          console.error(`ThemeManager: Error loading theme "${file}"`, error);
        }
      }
      
      console.log(`ThemeManager: Discovered ${this.themes.size} themes`);
    } catch (error) {
      console.error('ThemeManager: Error discovering themes', error);
    }
  }
  
  /**
   * Activate a theme
   * @param {string} themeName - Name of the theme to activate
   * @returns {Promise} - Resolves when the theme is activated
   */
  async activateTheme(themeName) {
    // Check if the theme exists
    if (!this.hasTheme(themeName)) {
      console.error(`ThemeManager: Theme "${themeName}" not found`);
      return;
    }
    
    // Get the theme
    const theme = this.getTheme(themeName);
    
    // Deactivate the current theme if there is one
    if (this.activeTheme) {
      await this.activeTheme.deactivate();
    }
    
    // Activate the new theme
    try {
      // Initialize if not already
      await theme.initialize();
      
      // Activate
      await theme.activate();
      
      // Set as active
      this.activeTheme = theme;
      
      // Save the current theme in settings
      settingsService.saveCurrentTheme(themeName);
      
      console.log(`ThemeManager: Activated theme "${themeName}"`);
      
      // Update the theme with current state
      this._updateThemeWithCurrentState();
    } catch (error) {
      console.error(`ThemeManager: Error activating theme "${themeName}"`, error);
    }
  }
  
  /**
   * Load the default or saved theme
   * @returns {Promise} - Resolves when the theme is loaded
   */
  async loadSavedTheme() {
    // Get the saved theme from settings
    const themeSettings = settingsService.getThemeSettings();
    const savedTheme = themeSettings.currentTheme || 'default';
    
    // Check if the theme exists
    if (!this.hasTheme(savedTheme)) {
      console.warn(`ThemeManager: Saved theme "${savedTheme}" not found, using default`);
      
      // Use default if available, otherwise use the first available
      if (this.hasTheme('default')) {
        await this.activateTheme('default');
      } else if (this.themes.size > 0) {
        const firstTheme = Array.from(this.themes.keys())[0];
        await this.activateTheme(firstTheme);
      } else {
        console.error('ThemeManager: No themes available');
      }
    } else {
      // Activate the saved theme
      await this.activateTheme(savedTheme);
    }
  }
  
  /**
   * Private: Subscribe to events
   */
  _subscribeToEvents() {
    // Todoist events
    eventBus.subscribe(this.todoistEvents.TASKS_LOADED, (data) => {
      if (this.activeTheme) {
        this.activeTheme.update({ type: 'tasks', data });
        
        if (data.currentTask) {
          this.activeTheme.displayTask(data.currentTask);
        }
      }
    });
    
    eventBus.subscribe(this.todoistEvents.PROJECTS_LOADED, (data) => {
      if (this.activeTheme) {
        this.activeTheme.update({ type: 'projects', data });
      }
    });
    
    eventBus.subscribe(this.todoistEvents.TASK_COMPLETED, (data) => {
      if (this.activeTheme) {
        this.activeTheme.completeTask(data);
      }
    });
    
    eventBus.subscribe(this.todoistEvents.TASK_ADDED, (data) => {
      if (this.activeTheme) {
        this.activeTheme.addTask(data);
      }
    });
    
    // Pomodoro events
    eventBus.subscribe(this.pomodoroEvents.TIMER_TICK, (data) => {
      if (this.activeTheme) {
        this.activeTheme.updatePomodoro(data);
      }
    });
    
    eventBus.subscribe(this.pomodoroEvents.WORK_STARTED, (data) => {
      if (this.activeTheme) {
        this.activeTheme.startWorkPeriod(data);
      }
    });
    
    eventBus.subscribe(this.pomodoroEvents.BREAK_STARTED, (data) => {
      if (this.activeTheme) {
        this.activeTheme.startBreakPeriod(data);
      }
    });
    
    // Settings events
    eventBus.subscribe(this.settingsEvents.APPEARANCE_CHANGED, (data) => {
      if (this.activeTheme) {
        this.activeTheme.update({ type: 'appearance', data });
      }
    });
  }
  
  /**
   * Private: Update the active theme with the current application state
   */
  _updateThemeWithCurrentState() {
    if (!this.activeTheme) {
      return;
    }
    
    // Update tasks
    const currentTask = todoistService.getCurrentTask();
    if (currentTask) {
      this.activeTheme.displayTask(currentTask);
    }
    
    // Update Pomodoro state
    const pomodoroState = pomodoroService.getState();
    this.activeTheme.updatePomodoro(pomodoroState);
    
    // Update appearance
    const appearance = settingsService.getAppearanceSettings();
    this.activeTheme.update({ type: 'appearance', data: appearance });
  }
  
  /**
   * Show a notification
   * @param {Object} notification - The notification to show
   */
  showNotification(notification) {
    if (this.activeTheme) {
      this.activeTheme.showNotification(notification);
    }
  }
  
  /**
   * Handle window resize
   * @param {Object} size - The new window size
   */
  handleResize(size) {
    if (this.activeTheme) {
      this.activeTheme.handleResize(size);
    }
  }
}

// Export a singleton instance
const themeManager = new ThemeManager();
module.exports = themeManager;