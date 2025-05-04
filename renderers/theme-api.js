/**
 * Theme API - Interface for themes in the renderer process
 * 
 * Provides a clean API for theme implementations to:
 * - Interact with the main application
 * - Communicate with the main process
 * - Perform common operations
 */

class ThemeAPI {
  constructor() {
    // Current theme state
    this.currentTheme = null;
    this.themeSettings = {};
    
    // Theme renderer instance
    this.themeRenderer = null;
    
    // Event listeners
    this.eventListeners = new Map();
    
    // Initialize
    this._setupIPCHandlers();
    
    console.log('ThemeAPI: Initialized');
  }
  
  /**
   * Initialize the theme API
   * @returns {Promise<void>}
   */
  async initialize() {
    // Request the active theme from the main process
    const activeTheme = await this._invokeMain('theme:get-active-theme');
    
    if (activeTheme) {
      this.currentTheme = activeTheme;
      this.themeSettings = await this._invokeMain('theme:get-theme-settings', activeTheme.name);
      
      console.log(`ThemeAPI: Active theme is "${activeTheme.name}"`);
    } else {
      console.log('ThemeAPI: No active theme');
    }
  }
  
  /**
   * Get available themes
   * @returns {Promise<Array>} - Array of theme metadata objects
   */
  async getAvailableThemes() {
    return await this._invokeMain('theme:get-available-themes');
  }
  
  /**
   * Get the active theme
   * @returns {Object|null} - The active theme data or null if none
   */
  getActiveTheme() {
    return this.currentTheme;
  }
  
  /**
   * Set the active theme
   * @param {string} themeName - Name of the theme to activate
   * @returns {Promise<boolean>} - Success status
   */
  async setActiveTheme(themeName) {
    const result = await this._invokeMain('theme:set-active-theme', themeName);
    return result?.success || false;
  }
  
  /**
   * Get theme settings
   * @param {string} themeName - Name of the theme (optional, uses active theme if not provided)
   * @returns {Promise<Object>} - Theme settings
   */
  async getThemeSettings(themeName) {
    const name = themeName || (this.currentTheme ? this.currentTheme.name : null);
    
    if (!name) {
      return {};
    }
    
    return await this._invokeMain('theme:get-theme-settings', name);
  }
  
  /**
   * Update theme settings
   * @param {Object} settings - New settings
   * @param {string} themeName - Name of the theme (optional, uses active theme if not provided)
   * @returns {Promise<boolean>} - Success status
   */
  async updateThemeSettings(settings, themeName) {
    const name = themeName || (this.currentTheme ? this.currentTheme.name : null);
    
    if (!name) {
      console.error('ThemeAPI: Cannot update settings, no active theme');
      return false;
    }
    
    const result = await this._invokeMain('theme:update-theme-settings', name, settings);
    return result?.success || false;
  }
  
  /**
   * Send a message to the main process
   * @param {string} eventName - Name of the event
   * @param {any} data - Data to send
   */
  sendToMain(eventName, data) {
    if (!this.currentTheme) {
      console.warn('ThemeAPI: Cannot send event, no active theme');
      return;
    }
    
    window.electronAPI.sendThemeEvent({
      themeName: this.currentTheme.name,
      eventName,
      data
    });
  }
  
  /**
   * Listen for main process messages
   * @param {string} eventName - Name of the event to listen for
   * @param {Function} callback - Callback function
   * @returns {Function} - Function to remove the listener
   */
  onMainMessage(eventName, callback) {
    if (typeof callback !== 'function') {
      console.error('ThemeAPI: Callback must be a function');
      return () => {};
    }
    
    // Add to event listeners map
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    
    this.eventListeners.get(eventName).add(callback);
    
    // Return function to remove the listener
    return () => {
      if (this.eventListeners.has(eventName)) {
        this.eventListeners.get(eventName).delete(callback);
      }
    };
  }
  
  /**
   * Register a theme renderer
   * @param {Object} renderer - Theme renderer instance
   */
  registerRenderer(renderer) {
    if (!renderer || typeof renderer !== 'object') {
      console.error('ThemeAPI: Invalid theme renderer');
      return;
    }
    
    if (typeof renderer.initialize !== 'function' || typeof renderer.onMainEvent !== 'function') {
      console.error('ThemeAPI: Theme renderer must implement initialize() and onMainEvent()');
      return;
    }
    
    this.themeRenderer = renderer;
    console.log('ThemeAPI: Registered theme renderer');
  }
  
  /**
   * Show a notification
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   */
  showNotification(title, body) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.innerHTML = `
      <div class="notification-title">${title}</div>
      <div class="notification-body">${body}</div>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 5000);
  }
  
  /**
   * Complete the current task
   */
  completeTask() {
    if (window.electronAPI && window.currentTaskId) {
      window.electronAPI.completeTask(window.currentTaskId);
    } else {
      console.warn('ThemeAPI: No task to complete');
    }
  }
  
  /**
   * Get the next task
   */
  nextTask() {
    if (window.electronAPI) {
      window.electronAPI.getNextTask();
    }
  }
  
  /**
   * Add a new task
   * @param {string} content - Task content
   * @param {string} projectId - Project ID (optional)
   */
  addTask(content, projectId) {
    if (window.electronAPI) {
      window.electronAPI.addNewTask(content, projectId);
    }
  }
  
  /**
   * Start or pause the Pomodoro timer
   */
  togglePomodoro() {
    if (window.electronAPI) {
      window.electronAPI.startPomodoro();
    }
  }
  
  /**
   * Reset the Pomodoro timer
   */
  resetPomodoro() {
    if (window.electronAPI) {
      window.electronAPI.resetPomodoro();
    }
  }
  
  /**
   * Start the next Pomodoro phase
   */
  startNextPhase() {
    if (window.electronAPI) {
      window.electronAPI.startNextPhase();
    }
  }
  
  /**
   * Format time for display (MM:SS)
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time
   */
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Get project information
   * @param {string} projectId - Project ID
   * @returns {Object|null} - Project data or null if not found
   */
  getProject(projectId) {
    if (!window.projectsList) return null;
    
    return window.projectsList.find(project => project.id === projectId) || null;
  }
  
  /**
   * Get all projects
   * @returns {Array} - Array of projects
   */
  getProjects() {
    return window.projectsList || [];
  }
  
  /**
   * Create CSS variables for a theme
   * @param {Object} variables - Key-value pairs of CSS variables
   * @param {string} scope - CSS selector to scope variables to (default: ':root')
   */
  createCSSVariables(variables, scope = ':root') {
    let css = `${scope} {\n`;
    
    for (const [key, value] of Object.entries(variables)) {
      css += `  --${key}: ${value};\n`;
    }
    
    css += '}\n';
    
    // Create or update style element
    let styleElement = document.getElementById('theme-variables');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'theme-variables';
      document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = css;
  }
  
  /**
   * Load a theme-specific CSS file
   * @param {string} path - Path to CSS file
   * @returns {Promise<boolean>} - Success status
   */
  async loadCSS(path) {
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = path;
      link.id = `theme-css-${Date.now()}`;
      
      link.onload = () => resolve(true);
      link.onerror = () => {
        console.error(`ThemeAPI: Failed to load CSS file: ${path}`);
        resolve(false);
      };
      
      document.head.appendChild(link);
    });
  }
  
  /**
   * Private: Setup IPC handlers for main process communication
   */
  _setupIPCHandlers() {
    // Theme changed
    window.electronAPI.onThemeChanged((theme) => {
      this.currentTheme = theme;
      this.themeSettings = theme.settings;
      
      // Load the theme renderer
      this._loadThemeRenderer(theme.rendererPath);
      
      // Emit event
      this._emitEvent('theme:changed', theme);
    });
    
    // Theme settings updated
    window.electronAPI.onThemeSettingsChanged((data) => {
      if (this.currentTheme && data.themeName === this.currentTheme.name) {
        this.themeSettings = data.settings;
        this._emitEvent('theme:settings-updated', data.settings);
      }
    });
    
    // Theme events from main process
    window.electronAPI.onThemeEvent((event) => {
      this._handleMainEvent(event);
    });
  }
  
  /**
   * Private: Load a theme renderer
   * @param {string} rendererPath - Path to the renderer module
   */
  async _loadThemeRenderer(rendererPath) {
    try {
      // Clear any existing theme content
      this._clearThemeContent();
      
      // Import the renderer module
      const module = await import(rendererPath);
      
      // Get the renderer class
      const RendererClass = module.default;
      
      // Create an instance
      const renderer = new RendererClass();
      
      // Register the renderer
      this.registerRenderer(renderer);
      
      // Initialize the renderer
      const container = document.getElementById('theme-container');
      if (container && renderer.initialize) {
        await renderer.initialize(container, this);
      }
      
      console.log(`ThemeAPI: Loaded renderer from ${rendererPath}`);
    } catch (error) {
      console.error(`ThemeAPI: Failed to load renderer from ${rendererPath}`, error);
    }
  }
  
  /**
   * Private: Clear theme content
   */
  _clearThemeContent() {
    // Remove theme renderer
    this.themeRenderer = null;
    
    // Clear theme container
    const container = document.getElementById('theme-container');
    if (container) {
      container.innerHTML = '';
    }
    
    // Remove theme-specific styles
    const themeStyles = document.querySelectorAll('[id^="theme-css-"]');
    themeStyles.forEach(style => style.remove());
  }
  
  /**
   * Private: Handle a message from the main process
   * @param {Object} event - Event data
   */
  _handleMainEvent(event) {
    // Forward to renderer
    if (this.themeRenderer && typeof this.themeRenderer.onMainEvent === 'function') {
      this.themeRenderer.onMainEvent(event.eventName, event.data);
    }
    
    // Emit event
    this._emitEvent(event.eventName, event.data);
  }
  
  /**
   * Private: Emit an event to listeners
   * @param {string} eventName - Name of the event
   * @param {any} data - Event data
   */
  _emitEvent(eventName, data) {
    if (this.eventListeners.has(eventName)) {
      for (const callback of this.eventListeners.get(eventName)) {
        try {
          callback(data);
        } catch (error) {
          console.error(`ThemeAPI: Error in event listener for ${eventName}`, error);
        }
      }
    }
  }
  
  /**
   * Private: Invoke a method on the main process
   * @param {string} channel - IPC channel
   * @param {...any} args - Arguments to pass
   * @returns {Promise<any>} - Result from main process
   */
  async _invokeMain(channel, ...args) {
    if (!window.electronAPI) {
      console.error('ThemeAPI: electronAPI not available');
      return null;
    }
    
    try {
      return await window.electronAPI.invoke(channel, ...args);
    } catch (error) {
      console.error(`ThemeAPI: Error invoking ${channel}`, error);
      return null;
    }
  }
}

// Export a singleton instance
const themeAPI = new ThemeAPI();
export default themeAPI;