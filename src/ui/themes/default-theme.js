/**
 * Default Theme - Main process implementation
 * 
 * Implements the default minimal theme for the application.
 * Refactored to use the new theme system architecture.
 */

class DefaultTheme {
  constructor() {
    this.name = 'default';
    this.displayName = 'Minimal';
    this.description = 'Default minimal task overlay theme';
    
    // Services
    this.themeManager = null;
    this.services = null;
    
    // State
    this.state = {
      currentTask: null,
      pomodoroState: null,
      isBreakMode: false
    };
    
    // Settings with defaults
    this.settings = {
      textColor: '#e0e0e0',
      backgroundColor: 'rgba(20, 20, 40, 0.85)',
      workBackgroundColor: 'rgba(60, 20, 40, 0.85)',
      breakBackgroundColor: 'rgba(20, 60, 40, 0.85)',
      autoStartNextPhase: false,
      globalTransparency: 100,
      clickThroughTransparency: 80
    };
    
    console.log('DefaultTheme: Constructed');
  }
  
  /**
   * Initialize the theme
   * @param {Object} themeManager - ThemeManager instance
   * @param {Object} services - Core services
   */
  initialize(themeManager, services) {
    this.themeManager = themeManager;
    this.services = services;
    
    // Load settings
    const savedSettings = themeManager.getThemeSettings(this.name);
    this.settings = { ...this.settings, ...savedSettings };
    
    console.log('DefaultTheme: Initialized');
  }
  
  /**
   * Activate the theme
   */
  async activate() {
    console.log('DefaultTheme: Activated');
    
    // Get current state
    const currentTask = this.services.todoist.getCurrentTask();
    if (currentTask) {
      this.state.currentTask = currentTask;
    }
    
    const pomodoroState = this.services.pomodoro.getState();
    if (pomodoroState) {
      this.state.pomodoroState = pomodoroState;
      this.state.isBreakMode = pomodoroState.isBreak;
    }
    
    return Promise.resolve();
  }
  
  /**
   * Deactivate the theme
   */
  async deactivate() {
    console.log('DefaultTheme: Deactivated');
    return Promise.resolve();
  }
  
  /**
   * Update theme settings
   * @param {Object} settings - New settings
   */
  updateSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    console.log('DefaultTheme: Settings updated', this.settings);
  }
  
  /**
   * Handle tasks loaded event
   * @param {Object} data - Tasks data
   */
  onTasksLoaded(data) {
    // Update local state if needed
    if (data.currentTask) {
      this.state.currentTask = data.currentTask;
    }
  }
  
  /**
   * Handle current task update
   * @param {Object} task - Current task
   */
  onCurrentTask(task) {
    this.state.currentTask = task;
    
    // Send task to renderer
    this.themeManager.sendToRenderer('theme:event', {
      themeName: this.name,
      eventName: 'task:updated',
      data: task
    });
  }
  
  /**
   * Handle task completion
   * @param {Object} data - Task completion data
   */
  onTaskCompleted(data) {
    // Send completion event to renderer
    this.themeManager.sendToRenderer('theme:event', {
      themeName: this.name,
      eventName: 'task:completed',
      data
    });
  }
  
  /**
   * Handle task addition
   * @param {Object} data - Task addition data
   */
  onTaskAdded(data) {
    // Send task added event to renderer
    this.themeManager.sendToRenderer('theme:event', {
      themeName: this.name,
      eventName: 'task:added',
      data
    });
  }
  
  /**
   * Handle Pomodoro tick
   * @param {Object} state - Pomodoro state
   */
  onPomodoroTick(state) {
    this.state.pomodoroState = state;
    
    // Send timer update to renderer
    this.themeManager.sendToRenderer('theme:event', {
      themeName: this.name,
      eventName: 'pomodoro:tick',
      data: state
    });
  }
  
  /**
   * Handle Pomodoro timer completion
   * @param {Object} data - Completion data
   */
  onPomodoroCompleted(data) {
    console.log('DefaultTheme: Pomodoro completed', data);
    
    // Send completion event to renderer
    this.themeManager.sendToRenderer('theme:event', {
      themeName: this.name,
      eventName: 'pomodoro:completed',
      data: {
        wasBreak: data.wasBreak,
        nextMode: data.nextMode,
        title: data.wasBreak ? 'Break Completed' : 'Work Completed',
        body: data.wasBreak ? 'Time to work!' : 'Time for a break!'
      }
    });
    
    // Auto-start next phase if enabled
    if (this.settings.autoStartNextPhase) {
      setTimeout(() => {
        this.services.pomodoro.startNextPhase();
      }, 1000);
    }
  }
  
  /**
   * Handle work mode start
   * @param {Object} state - Pomodoro state
   */
  onWorkStarted(state) {
    this.state.pomodoroState = state;
    this.state.isBreakMode = false;
    
    // Send work started event to renderer
    this.themeManager.sendToRenderer('theme:event', {
      themeName: this.name,
      eventName: 'pomodoro:work-started',
      data: {
        state,
        title: 'Back to Work!',
        body: `Time for a ${state.workTime} minute work session.`
      }
    });
  }
  
  /**
   * Handle break mode start
   * @param {Object} state - Pomodoro state
   */
  onBreakStarted(state) {
    this.state.pomodoroState = state;
    this.state.isBreakMode = true;
    
    // Send break started event to renderer
    this.themeManager.sendToRenderer('theme:event', {
      themeName: this.name,
      eventName: 'pomodoro:break-started',
      data: {
        state,
        title: 'Break Time!',
        body: `Time for a ${state.breakTime} minute break.`
      }
    });
  }
  
  /**
   * Handle theme settings changed
   * @param {Object} data - Settings data
   */
  onThemeSettingsChanged(data) {
    if (data && data.themeSettings && data.themeSettings[this.name]) {
      this.updateSettings(data.themeSettings[this.name]);
    }
  }
  
  /**
   * Handle renderer events
   * @param {string} eventName - Event name
   * @param {any} data - Event data
   */
  onRendererEvent(eventName, data) {
    console.log(`DefaultTheme: Received renderer event ${eventName}`, data);
    
    switch (eventName) {
      case 'pomodoro:start-next-phase':
        this.services.pomodoro.startNextPhase();
        break;
        
      case 'settings:update':
        this.updateSettings(data);
        break;
        
      case 'task:next':
        // Request next task
        this.services.todoist.nextTask();
        break;
        
      case 'transparency:update':
        // Update transparency settings
        const appearanceSettings = this.services.settings.getAppearanceSettings();
        this.services.settings.saveAppearanceSettings({
          ...appearanceSettings,
          ...data
        });
        break;
    }
  }
}

// Create and export the theme
const defaultTheme = {
  name: 'default',
  displayName: 'Minimal',
  description: 'Default minimal task overlay theme',
  mainModule: new DefaultTheme(),
  rendererPath: './themes/default.js',
  settings: {
    textColor: '#e0e0e0',
    backgroundColor: 'rgba(20, 20, 40, 0.85)',
    workBackgroundColor: 'rgba(60, 20, 40, 0.85)',
    breakBackgroundColor: 'rgba(20, 60, 40, 0.85)',
    autoStartNextPhase: false,
    globalTransparency: 100,
    clickThroughTransparency: 80
  }
};

module.exports = defaultTheme;