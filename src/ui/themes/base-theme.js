/**
 * Base Theme Interface
 * 
 * Defines the interface that all themes must implement.
 * This ensures consistent behavior across different visual themes.
 */

class BaseTheme {
  constructor(themeManager) {
    this.themeManager = themeManager;
    this.name = 'base';
    this.displayName = 'Base Theme';
    this.description = 'Base theme interface - not meant to be used directly';
    
    // Store refs to dom elements
    this.elements = {};
    
    // Store event listeners for cleanup
    this.listeners = [];
    
    console.log(`BaseTheme: Initialized "${this.name}" theme`);
  }
  
  /**
   * Initialize the theme
   * Called when the theme is first loaded
   * @returns {Promise} - Resolves when initialization is complete
   */
  async initialize() {
    console.log(`BaseTheme: "${this.name}" theme initialized`);
    return Promise.resolve();
  }
  
  /**
   * Activate the theme
   * Called when the theme is selected and should become active
   * @returns {Promise} - Resolves when activation is complete
   */
  async activate() {
    console.log(`BaseTheme: "${this.name}" theme activated`);
    return Promise.resolve();
  }
  
  /**
   * Deactivate the theme
   * Called when another theme is selected and this one should be deactivated
   * @returns {Promise} - Resolves when deactivation is complete
   */
  async deactivate() {
    console.log(`BaseTheme: "${this.name}" theme deactivated`);
    
    // Clean up event listeners
    this.removeAllEventListeners();
    
    return Promise.resolve();
  }
  
  /**
   * Update the theme
   * Called when the theme should update its display (e.g., on task change)
   * @param {Object} data - Data to update the theme with
   * @returns {Promise} - Resolves when update is complete
   */
  async update(data) {
    console.log(`BaseTheme: "${this.name}" theme updated with data`, data);
    return Promise.resolve();
  }
  
  /**
   * Load theme-specific styles
   * @returns {Promise} - Resolves when styles are loaded
   */
  async loadStyles() {
    console.log(`BaseTheme: "${this.name}" theme styles loaded`);
    return Promise.resolve();
  }
  
  /**
   * Unload theme-specific styles
   * @returns {Promise} - Resolves when styles are unloaded
   */
  async unloadStyles() {
    console.log(`BaseTheme: "${this.name}" theme styles unloaded`);
    return Promise.resolve();
  }
  
  /**
   * Load theme-specific assets
   * @returns {Promise} - Resolves when assets are loaded
   */
  async loadAssets() {
    console.log(`BaseTheme: "${this.name}" theme assets loaded`);
    return Promise.resolve();
  }
  
  /**
   * Get theme settings
   * @returns {Object} - Theme settings
   */
  getSettings() {
    return {};
  }
  
  /**
   * Update theme settings
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    console.log(`BaseTheme: "${this.name}" theme settings updated`, settings);
  }
  
  /**
   * Handle a task display update
   * @param {Object} task - The task to display
   */
  displayTask(task) {
    console.log(`BaseTheme: "${this.name}" displaying task`, task);
  }
  
  /**
   * Handle a task completion
   * @param {Object} task - The completed task
   */
  completeTask(task) {
    console.log(`BaseTheme: "${this.name}" completed task`, task);
  }
  
  /**
   * Handle a new task addition
   * @param {Object} task - The new task
   */
  addTask(task) {
    console.log(`BaseTheme: "${this.name}" added task`, task);
  }
  
  /**
   * Handle a Pomodoro state update
   * @param {Object} state - The new Pomodoro state
   */
  updatePomodoro(state) {
    console.log(`BaseTheme: "${this.name}" updated Pomodoro state`, state);
  }
  
  /**
   * Handle a Pomodoro work period start
   */
  startWorkPeriod() {
    console.log(`BaseTheme: "${this.name}" started work period`);
  }
  
  /**
   * Handle a Pomodoro break period start
   */
  startBreakPeriod() {
    console.log(`BaseTheme: "${this.name}" started break period`);
  }
  
  /**
   * Show a notification
   * @param {Object} notification - The notification to show
   */
  showNotification(notification) {
    console.log(`BaseTheme: "${this.name}" showing notification`, notification);
  }
  
  /**
   * Handle window resize
   * @param {Object} size - The new window size
   */
  handleResize(size) {
    console.log(`BaseTheme: "${this.name}" handling resize`, size);
  }
  
  /**
   * Add an event listener that will be automatically removed on deactivation
   * @param {Element} element - DOM element to attach listener to
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   * @param {Object} options - Event listener options
   */
  addEventListener(element, event, callback, options) {
    element.addEventListener(event, callback, options);
    
    // Store for cleanup
    this.listeners.push({
      element,
      event,
      callback,
      options
    });
  }
  
  /**
   * Remove a specific event listener
   * @param {Element} element - DOM element to remove listener from
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   * @param {Object} options - Event listener options
   */
  removeEventListener(element, event, callback, options) {
    element.removeEventListener(event, callback, options);
    
    // Remove from stored listeners
    this.listeners = this.listeners.filter(listener => {
      return !(
        listener.element === element &&
        listener.event === event &&
        listener.callback === callback
      );
    });
  }
  
  /**
   * Remove all event listeners
   */
  removeAllEventListeners() {
    this.listeners.forEach(listener => {
      listener.element.removeEventListener(
        listener.event,
        listener.callback,
        listener.options
      );
    });
    
    this.listeners = [];
  }
}

module.exports = BaseTheme;