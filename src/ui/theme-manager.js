/**
 * Theme Manager - Core service for managing themes in the main process
 * 
 * Responsible for:
 * - Discovering and registering themes
 * - Managing theme activation/deactivation
 * - Handling theme settings
 * - Coordinating IPC communication with renderer process
 */

const path = require('path');
const fs = require('fs');
const { ipcMain } = require('electron');
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
    
    // Core services
    this.services = {
      eventBus,
      settings: settingsService,
      pomodoro: pomodoroService,
      todoist: todoistService
    };
    
    // Initialize
    this._setupIPCHandlers();
    this._subscribeToEvents();
    
    console.log('ThemeManager: Initialized');
  }
  
  /**
   * Register a theme
   * @param {Object} themeConfig - Theme configuration
   * @returns {boolean} - Success status
   */
  registerTheme(themeConfig) {
    // Validate theme config
    if (!this._validateThemeConfig(themeConfig)) {
      console.error(`ThemeManager: Invalid theme configuration for "${themeConfig?.name || 'unknown'}"`);
      return false;
    }
    
    const { name, displayName, description, mainModule } = themeConfig;
    
    // Check if theme is already registered
    if (this.themes.has(name)) {
      console.warn(`ThemeManager: Theme "${name}" is already registered`);
      return false;
    }
    
    try {
      // Initialize the theme's main module
      const theme = mainModule;
      theme.initialize(this, this.services);
      
      // Store in themes map with metadata
      this.themes.set(name, {
        name,
        displayName,
        description,
        rendererPath: themeConfig.rendererPath,
        mainModule: theme,
        settings: themeConfig.settings || {}
      });
      
      console.log(`ThemeManager: Registered theme "${name}"`);
      return true;
    } catch (error) {
      console.error(`ThemeManager: Failed to register theme "${name}"`, error);
      return false;
    }
  }
  
  /**
   * Discover and load all available themes
   * @returns {Promise<void>}
   */
  async discoverThemes() {
    const themesDir = path.join(__dirname, 'themes');
    
    try {
      // Ensure the themes directory exists
      if (!fs.existsSync(themesDir)) {
        console.error(`ThemeManager: Themes directory not found at ${themesDir}`);
        return;
      }
      
      // Read the themes directory
      const files = fs.readdirSync(themesDir);
      
      // Filter for theme files
      const themeFiles = files.filter(file => 
        file.endsWith('-theme.js') && file !== 'base-theme.js'
      );
      
      // Load each theme
      for (const file of themeFiles) {
        try {
          const themeName = path.basename(file, '.js').replace('-theme', '');
          const themeConfig = require(path.join(themesDir, file));
          
          // Prepare config object if the module exports a class
          const config = typeof themeConfig === 'function' 
            ? {
                name: themeName,
                displayName: themeName.charAt(0).toUpperCase() + themeName.slice(1),
                description: `${themeName} theme`,
                mainModule: new themeConfig(this),
                rendererPath: `./themes/${themeName}.js`
              }
            : themeConfig;
          
          this.registerTheme(config);
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
   * @returns {Promise<boolean>} - Success status
   */
  async activateTheme(themeName) {
    // Check if the theme exists
    if (!this.themes.has(themeName)) {
      console.error(`ThemeManager: Theme "${themeName}" not found`);
      return false;
    }
    
    const themeData = this.themes.get(themeName);
    
    // Deactivate the current theme if there is one
    if (this.activeTheme) {
      await this.deactivateTheme();
    }
    
    try {
      // Activate the theme's main module
      await themeData.mainModule.activate();
      
      // Set as active
      this.activeTheme = themeData;
      
      // Save the current theme in settings
      settingsService.saveCurrentTheme(themeName);
      
      // Notify renderer process
      this._notifyRendererThemeChanged();
      
      console.log(`ThemeManager: Activated theme "${themeName}"`);
      return true;
    } catch (error) {
      console.error(`ThemeManager: Error activating theme "${themeName}"`, error);
      return false;
    }
  }
  
  /**
   * Deactivate the currently active theme
   * @returns {Promise<boolean>} - Success status
   */
  async deactivateTheme() {
    if (!this.activeTheme) {
      return true; // No active theme to deactivate
    }
    
    try {
      // Deactivate the theme's main module
      await this.activeTheme.mainModule.deactivate();
      
      // Clear active theme
      const themeName = this.activeTheme.name;
      this.activeTheme = null;
      
      console.log(`ThemeManager: Deactivated theme "${themeName}"`);
      return true;
    } catch (error) {
      console.error('ThemeManager: Error deactivating theme', error);
      return false;
    }
  }
  
  /**
   * Get a theme by name
   * @param {string} themeName - Name of the theme
   * @returns {Object|null} - The theme data or null if not found
   */
  getTheme(themeName) {
    return this.themes.get(themeName) || null;
  }
  
  /**
   * Get all registered themes
   * @returns {Array} - Array of theme metadata objects
   */
  getAllThemes() {
    // Convert map to array of theme metadata
    return Array.from(this.themes.entries()).map(([name, theme]) => ({
      name,
      displayName: theme.displayName,
      description: theme.description
    }));
  }
  
  /**
   * Get the active theme
   * @returns {Object|null} - The active theme data or null if none
   */
  getActiveTheme() {
    return this.activeTheme 
      ? {
          name: this.activeTheme.name,
          displayName: this.activeTheme.displayName,
          description: this.activeTheme.description
        }
      : null;
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
   * Get theme settings
   * @param {string} themeName - Name of the theme (optional, uses active theme if not provided)
   * @returns {Object} - Theme settings
   */
  getThemeSettings(themeName) {
    const theme = themeName
      ? this.themes.get(themeName)
      : this.activeTheme;
    
    if (!theme) {
      return {};
    }
    
    // Get saved settings or use defaults
    const savedSettings = settingsService.getThemeSettings().themeSettings?.[theme.name] || {};
    
    // Merge with default settings
    return { ...theme.settings, ...savedSettings };
  }
  
  /**
   * Update theme settings
   * @param {string} themeName - Name of the theme (optional, uses active theme if not provided)
   * @param {Object} settings - New settings
   * @returns {boolean} - Success status
   */
  updateThemeSettings(themeName, settings) {
    const name = themeName || (this.activeTheme ? this.activeTheme.name : null);
    
    if (!name || !this.themes.has(name)) {
      console.error(`ThemeManager: Cannot update settings, theme "${name}" not found`);
      return false;
    }
    
    try {
      // Save settings
      settingsService.saveThemeSpecificSettings(name, settings);
      
      // Update the theme's main module
      const theme = this.themes.get(name);
      if (theme.mainModule.updateSettings) {
        theme.mainModule.updateSettings(settings);
      }
      
      // Notify renderer if this is the active theme
      if (this.activeTheme && this.activeTheme.name === name) {
        this.sendToRenderer('theme:settings-updated', {
          themeName: name,
          settings: this.getThemeSettings(name)
        });
      }
      
      console.log(`ThemeManager: Updated settings for theme "${name}"`);
      return true;
    } catch (error) {
      console.error(`ThemeManager: Error updating settings for theme "${name}"`, error);
      return false;
    }
  }
  
  /**
   * Send a message to the renderer process
   * @param {string} channel - IPC channel
   * @param {any} data - Data to send
   */
  sendToRenderer(channel, data) {
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send(channel, data);
    }
  }
  
  /**
   * Load the default or saved theme
   * @returns {Promise<boolean>} - Success status
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
        return await this.activateTheme('default');
      } else if (this.themes.size > 0) {
        const firstTheme = Array.from(this.themes.keys())[0];
        return await this.activateTheme(firstTheme);
      } else {
        console.error('ThemeManager: No themes available');
        return false;
      }
    } else {
      // Activate the saved theme
      return await this.activateTheme(savedTheme);
    }
  }
  
  /**
   * Private: Setup IPC handlers for renderer communication
   */
  _setupIPCHandlers() {
    // Get available themes
    ipcMain.handle('theme:get-available-themes', () => {
      return this.getAllThemes();
    });
    
    // Get active theme
    ipcMain.handle('theme:get-active-theme', () => {
      return this.getActiveTheme();
    });
    
    // Set active theme
    ipcMain.handle('theme:set-active-theme', async (event, themeName) => {
      const success = await this.activateTheme(themeName);
      return { success };
    });
    
    // Get theme settings
    ipcMain.handle('theme:get-theme-settings', (event, themeName) => {
      return this.getThemeSettings(themeName);
    });
    
    // Update theme settings
    ipcMain.handle('theme:update-theme-settings', (event, themeName, settings) => {
      const success = this.updateThemeSettings(themeName, settings);
      return { success };
    });
    
    // Handle theme events from renderer
    ipcMain.on('theme:event', (event, { themeName, eventName, data }) => {
      this._handleRendererEvent(themeName, eventName, data);
    });
  }
  
  /**
   * Private: Subscribe to core service events
   */
  _subscribeToEvents() {
    // Todoist events
    const todoistEvents = todoistService.getEvents();
    
    eventBus.subscribe(todoistEvents.TASKS_LOADED, (data) => {
      if (this.activeTheme) {
        this._forwardEventToTheme('todoist:tasks-loaded', data);
        
        // Also send the current task to the theme
        if (data.currentTask) {
          this._forwardEventToTheme('todoist:current-task', data.currentTask);
        }
      }
    });
    
    eventBus.subscribe(todoistEvents.TASK_COMPLETED, (data) => {
      if (this.activeTheme) {
        this._forwardEventToTheme('todoist:task-completed', data);
      }
    });
    
    eventBus.subscribe(todoistEvents.TASK_ADDED, (data) => {
      if (this.activeTheme) {
        this._forwardEventToTheme('todoist:task-added', data);
      }
    });
    
    // Pomodoro events
    const pomodoroEvents = pomodoroService.getEvents();
    
    eventBus.subscribe(pomodoroEvents.TIMER_TICK, (data) => {
      if (this.activeTheme) {
        this._forwardEventToTheme('pomodoro:timer-tick', data);
      }
    });
    
    eventBus.subscribe(pomodoroEvents.TIMER_COMPLETED, (data) => {
      if (this.activeTheme) {
        this._forwardEventToTheme('pomodoro:timer-completed', data);
      }
    });
    
    eventBus.subscribe(pomodoroEvents.WORK_STARTED, (data) => {
      if (this.activeTheme) {
        this._forwardEventToTheme('pomodoro:work-started', data);
      }
    });
    
    eventBus.subscribe(pomodoroEvents.BREAK_STARTED, (data) => {
      if (this.activeTheme) {
        this._forwardEventToTheme('pomodoro:break-started', data);
      }
    });
    
    // Settings events
    const settingsEvents = settingsService.getEvents();
    
    eventBus.subscribe(settingsEvents.THEME_CHANGED, (data) => {
      if (this.activeTheme) {
        this._forwardEventToTheme('settings:theme-changed', data);
      }
    });
  }
  
  /**
   * Private: Forward an event to the active theme
   * @param {string} eventName - Name of the event
   * @param {any} data - Event data
   */
  _forwardEventToTheme(eventName, data) {
    if (!this.activeTheme || !this.activeTheme.mainModule) return;
    
    const theme = this.activeTheme.mainModule;
    
    // Check if the theme has a handler for this event
    const methodMap = {
      'todoist:tasks-loaded': 'onTasksLoaded',
      'todoist:current-task': 'onCurrentTask',
      'todoist:task-completed': 'onTaskCompleted',
      'todoist:task-added': 'onTaskAdded',
      'pomodoro:timer-tick': 'onPomodoroTick',
      'pomodoro:timer-completed': 'onPomodoroCompleted',
      'pomodoro:work-started': 'onWorkStarted',
      'pomodoro:break-started': 'onBreakStarted',
      'settings:theme-changed': 'onThemeSettingsChanged'
    };
    
    const methodName = methodMap[eventName] || 'onEvent';
    
    // First try the specific handler, then fall back to generic
    if (typeof theme[methodName] === 'function') {
      theme[methodName](data);
    } else if (typeof theme.onEvent === 'function') {
      theme.onEvent(eventName, data);
    }
  }
  
  /**
   * Private: Handle an event from the renderer process
   * @param {string} themeName - Name of the theme that sent the event
   * @param {string} eventName - Name of the event
   * @param {any} data - Event data
   */
  _handleRendererEvent(themeName, eventName, data) {
    // Validate the theme name
    if (themeName !== (this.activeTheme?.name || null)) {
      console.warn(`ThemeManager: Received event from inactive theme "${themeName}"`);
      return;
    }
    
    // Forward to the theme's main module
    if (this.activeTheme && this.activeTheme.mainModule) {
      const theme = this.activeTheme.mainModule;
      
      if (typeof theme.onRendererEvent === 'function') {
        theme.onRendererEvent(eventName, data);
      }
    }
  }
  
  /**
   * Private: Notify the renderer process of a theme change
   */
  _notifyRendererThemeChanged() {
    if (!this.activeTheme) return;
    
    this.sendToRenderer('theme:changed', {
      name: this.activeTheme.name,
      displayName: this.activeTheme.displayName,
      description: this.activeTheme.description,
      rendererPath: this.activeTheme.rendererPath,
      settings: this.getThemeSettings(this.activeTheme.name)
    });
  }
  
  /**
   * Private: Validate a theme configuration
   * @param {Object} config - Theme configuration
   * @returns {boolean} - True if valid
   */
  _validateThemeConfig(config) {
    if (!config || typeof config !== 'object') return false;
    
    // Required fields
    const required = ['name', 'displayName', 'mainModule'];
    for (const field of required) {
      if (!config[field]) return false;
    }
    
    // Required methods in mainModule
    const module = config.mainModule;
    if (typeof module !== 'object') return false;
    
    const requiredMethods = ['initialize', 'activate', 'deactivate'];
    for (const method of requiredMethods) {
      if (typeof module[method] !== 'function') return false;
    }
    
    return true;
  }
}

// Export a singleton instance
const themeManager = new ThemeManager();
module.exports = themeManager;