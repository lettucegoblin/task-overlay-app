/**
 * Default Theme - Standard minimal task overlay
 * 
 * Implements the default application theme.
 * Maintains the original minimal UI while using the new theme architecture.
 */

const BaseTheme = require('./base-theme');
const eventBus = require('../../core/event-bus');

class DefaultTheme extends BaseTheme {
  constructor(themeManager) {
    super(themeManager);
    
    this.name = 'default';
    this.displayName = 'Minimal';
    this.description = 'Default minimal task overlay theme';
    
    // Default settings
    this.settings = {
      globalTransparency: 100,
      clickThroughTransparency: 80,
      textColor: '#e0e0e0',
      backgroundColor: 'rgba(20, 20, 40, 0.85)',
      workBackgroundColor: 'rgba(60, 20, 40, 0.85)',
      breakBackgroundColor: 'rgba(20, 60, 40, 0.85)'
    };
  }
  
  /**
   * Initialize the theme
   */
  async initialize() {
    console.log(`DefaultTheme: Initializing "${this.name}" theme`);
    return Promise.resolve();
  }
  
  /**
   * Activate the theme
   */
  async activate() {
    console.log(`DefaultTheme: Activating "${this.name}" theme`);
    
    // When activating, we send theme settings to the renderer via IPC
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('theme-changed', {
        name: this.name,
        displayName: this.displayName,
        settings: this.settings
      });
    }
    
    return Promise.resolve();
  }
  
  /**
   * Deactivate the theme
   */
  async deactivate() {
    console.log(`DefaultTheme: Deactivating "${this.name}" theme`);
    
    // No DOM manipulation here - just cleanup any theme-specific resources
    
    // Call parent deactivate to clean up event listeners
    await super.deactivate();
    
    return Promise.resolve();
  }
  
  /**
   * Display a task
   */
  displayTask(task) {
    console.log(`DefaultTheme: Displaying task`, task);
    
    // Instead of directly manipulating the DOM,
    // we just forward the task to the renderer process
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('theme-display-task', {
        theme: this.name,
        task: task
      });
    }
  }
  
  /**
   * Update Pomodoro state
   */
  updatePomodoro(state) {
    console.log(`DefaultTheme: Updating Pomodoro state`, state);
    
    // Instead of directly manipulating the DOM,
    // we forward the state to the renderer process
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('theme-update-pomodoro', {
        theme: this.name,
        state: state
      });
    }
  }
  
  /**
   * Show a notification
   */
  showNotification(notification) {
    console.log(`DefaultTheme: Showing notification`, notification);
    
    // Forward notification to the renderer process
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('theme-show-notification', {
        theme: this.name,
        notification: notification
      });
    }
  }
  
  /**
   * Get theme settings
   */
  getSettings() {
    return { ...this.settings };
  }
  
  /**
   * Update theme settings
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    console.log(`DefaultTheme: Updated settings`, this.settings);
    
    // Send updated settings to renderer
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('theme-settings-changed', {
        theme: this.name,
        settings: this.settings
      });
    }
  }
}

module.exports = DefaultTheme;