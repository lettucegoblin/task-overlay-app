/**
 * Default Theme - Standard minimal task overlay
 * 
 * Implements the default application theme.
 * Maintains the original minimal UI while using the new theme architecture.
 */

const BaseTheme = require('./base-theme');
const eventBus = require('../../core/event-bus');
const { ipcRenderer } = require('electron');
const { ipcMain } = require('electron');

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
    
    // Load theme-specific styles
    await this.loadStyles();
    
    return Promise.resolve();
  }
  
  /**
   * Activate the theme
   */
  async activate() {
    console.log(`DefaultTheme: Activating "${this.name}" theme`);
    
    // Notify the renderer process to load the theme styles
    if (global.mainWindow && !global.mainWindow.isDestroyed()) {
      global.mainWindow.webContents.send('load-theme-styles', this.name);
    } else {
      console.error('DefaultTheme: Main window is not available to send theme styles.');
    }
    
    return Promise.resolve();
  }
  
  /**
   * Deactivate the theme
   */
  async deactivate() {
    console.log(`DefaultTheme: Deactivating "${this.name}" theme`);
    
    // Remove theme class from body
    document.body.classList.remove('theme-default');
    
    // Call parent deactivate to clean up event listeners
    await super.deactivate();
    
    return Promise.resolve();
  }
  
  /**
   * Load theme-specific styles
   */
  async loadStyles() {
    console.log(`DefaultTheme: Loading styles for "${this.name}" theme`);
    
    // The default theme uses the built-in styles.css, so no need to load anything
    
    return Promise.resolve();
  }
  
  /**
   * Display a task
   */
  displayTask(task) {
    console.log(`DefaultTheme: Displaying task`, task);
    
    if (!this.elements.taskContainer) return;
    
    if (task) {
      this.elements.taskContainer.textContent = task.content || 'No task.';
      this.elements.taskContainer.dataset.taskId = task.id || '';
      
      // Enable/disable complete button based on task ID
      if (task.id) {
        this.elements.completeTaskButton.disabled = false;
        this.elements.completeTaskButton.title = "Mark task as complete";
      } else {
        this.elements.completeTaskButton.disabled = true;
        this.elements.completeTaskButton.title = "No active task";
      }
    } else {
      this.elements.taskContainer.textContent = 'No tasks available.';
      this.elements.taskContainer.dataset.taskId = '';
      this.elements.completeTaskButton.disabled = true;
    }
  }
  
  /**
   * Update Pomodoro state
   */
  updatePomodoro(state) {
    console.log(`DefaultTheme: Updating Pomodoro state`, state);
    
    if (!this.elements.timerDisplay || !this.elements.pomodoroButton) return;
    
    // Update timer display
    this.elements.timerDisplay.textContent = this._formatTime(state.timeRemaining);
    
    // Update button appearance
    if (state.isActive) {
      this.elements.pomodoroButton.textContent = '⏸'; // Pause symbol
      this.elements.pomodoroButton.classList.add('active');
      this.elements.pomodoroButton.title = 'Pause Pomodoro timer';
    } else {
      this.elements.pomodoroButton.textContent = '▶'; // Play symbol
      this.elements.pomodoroButton.classList.remove('active');
      this.elements.pomodoroButton.title = 'Start Pomodoro timer';
    }
    
    // Update mode styling
    document.body.classList.remove('work-mode', 'break-mode');
    if (state.isBreak) {
      document.body.classList.add('break-mode');
    } else {
      document.body.classList.add('work-mode');
    }
  }
  
  /**
   * Show a notification
   */
  showNotification(notification) {
    console.log(`DefaultTheme: Showing notification`, notification);
    
    // For systems that support native notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.body,
        silent: false
      });
    }
    
    // For custom in-app notifications
    const notificationElement = document.createElement('div');
    notificationElement.className = 'theme-notification';
    notificationElement.textContent = `${notification.title} ${notification.body}`;
    document.body.appendChild(notificationElement);
    
    // Show the notification
    setTimeout(() => {
      notificationElement.classList.add('show');
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notificationElement.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notificationElement);
      }, 300);
    }, 5000);
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
    
    // Apply settings to UI
    this._applySettings();
  }
  
  /**
   * Private: Set up event listeners
   */
  _setupEventListeners() {
    // Task click (for cycling tasks)
    this.addEventListener(this.elements.taskContainer, 'click', (event) => {
      // Skip if right button or if missing task ID
      if (event.button !== 0) return;
      
      // Request next task via IPC
      window.electronAPI.getNextTask();
    });
    
    // Complete task button
    this.addEventListener(this.elements.completeTaskButton, 'click', () => {
      const taskId = this.elements.taskContainer.dataset.taskId;
      if (taskId) {
        window.electronAPI.completeTask(taskId);
      }
    });
    
    // Pomodoro button
    this.addEventListener(this.elements.pomodoroButton, 'click', () => {
      window.electronAPI.startPomodoro();
    });
  }
  
  /**
   * Private: Apply settings to UI
   */
  _applySettings() {
    // Apply transparency
    document.body.style.opacity = this.settings.globalTransparency / 100;
    
    // Apply colors
    this.elements.taskContainer.style.backgroundColor = this.settings.backgroundColor;
    this.elements.taskContainer.style.color = this.settings.textColor;
    
    // Apply work/break mode colors via CSS variables
    document.documentElement.style.setProperty('--work-background-color', this.settings.workBackgroundColor);
    document.documentElement.style.setProperty('--break-background-color', this.settings.breakBackgroundColor);
  }
  
  /**
   * Private: Format seconds into MM:SS
   */
  _formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

module.exports = DefaultTheme;