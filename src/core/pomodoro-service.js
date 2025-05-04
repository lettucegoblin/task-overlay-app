/**
 * Pomodoro Service - Core timer functionality
 * 
 * Manages the Pomodoro timer state and logic, completely decoupled from UI.
 * Communicates state changes via the event bus.
 */

const eventBus = require('./event-bus');
const settingsService = require('./settings-service');

// Event names - defined as constants for consistency
const EVENTS = {
  TIMER_STARTED: 'pomodoro:timer:started',
  TIMER_PAUSED: 'pomodoro:timer:paused',
  TIMER_RESET: 'pomodoro:timer:reset',
  TIMER_TICK: 'pomodoro:timer:tick',
  TIMER_COMPLETED: 'pomodoro:timer:completed',
  WORK_STARTED: 'pomodoro:work:started',
  BREAK_STARTED: 'pomodoro:break:started',
  SETTINGS_CHANGED: 'pomodoro:settings:changed'
};

class PomodoroService {
  constructor() {
    // Default state
    this.state = {
      isActive: false,
      isBreak: false,
      timeRemaining: 0, // in seconds
      workTime: 25, // in minutes
      breakTime: 5, // in minutes
      workProjectId: null,
      breakProjectId: null,
      projectTaskMemory: {}
    };
    
    this.timerInterval = null;
    
    // Load settings
    this.loadSettings();
  }
  
  // Load settings from storage
  loadSettings() {
    const settings = settingsService.getPomodoroSettings();
    
    this.state.workTime = settings.workTime || 25;
    this.state.breakTime = settings.breakTime || 5;
    this.state.workProjectId = settings.workProjectId || null;
    this.state.breakProjectId = settings.breakProjectId || null;
    this.state.projectTaskMemory = settings.projectTaskMemory || {};
    
    // Initialize timeRemaining based on the current mode
    this.state.timeRemaining = this.state.isBreak ? 
      this.state.breakTime * 60 : 
      this.state.workTime * 60;
    
    console.log('PomodoroService: Loaded settings', this.state);
  }
  
  // Save settings to storage
  saveSettings() {
    settingsService.savePomodoroSettings({
      workTime: this.state.workTime,
      breakTime: this.state.breakTime,
      workProjectId: this.state.workProjectId,
      breakProjectId: this.state.breakProjectId,
      projectTaskMemory: this.state.projectTaskMemory
    });
    
    console.log('PomodoroService: Saved settings');
  }
  
  // Get the current state
  getState() {
    return { ...this.state }; // Return a copy to prevent direct mutation
  }
  
  // Start the timer
  start() {
    if (this.state.isActive) {
      return; // Already running
    }
    
    this.state.isActive = true;
    
    // Start the timer interval
    this.timerInterval = setInterval(() => {
      this._tick();
    }, 1000);
    
    // Publish the event
    eventBus.publish(EVENTS.TIMER_STARTED, this.getState());
    
    console.log(`PomodoroService: Started ${this.state.isBreak ? 'break' : 'work'} timer`);
  }
  
  // Pause the timer
  pause() {
    if (!this.state.isActive) {
      return; // Not running
    }
    
    this.state.isActive = false;
    
    // Clear the interval
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Publish the event
    eventBus.publish(EVENTS.TIMER_PAUSED, this.getState());
    
    console.log('PomodoroService: Paused timer');
  }
  
  // Reset the timer
  reset() {
    // Clear the interval if running
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Reset state
    this.state.isActive = false;
    this.state.isBreak = false;
    this.state.timeRemaining = this.state.workTime * 60;
    
    // Publish the event
    eventBus.publish(EVENTS.TIMER_RESET, this.getState());
    
    console.log('PomodoroService: Reset timer');
  }
  
  // Toggle between start and pause
  toggle() {
    if (this.state.isActive) {
      this.pause();
    } else {
      this.start();
    }
  }
  
  // Set the work time (in minutes)
  setWorkTime(minutes) {
    if (minutes < 1 || minutes > 60) {
      console.error('PomodoroService: Work time must be between 1 and 60 minutes');
      return;
    }
    
    this.state.workTime = minutes;
    
    // If we're in work mode and not active, update the time remaining
    if (!this.state.isBreak && !this.state.isActive) {
      this.state.timeRemaining = minutes * 60;
    }
    
    // Save settings
    this.saveSettings();
    
    // Publish the event
    eventBus.publish(EVENTS.SETTINGS_CHANGED, this.getState());
    
    console.log(`PomodoroService: Set work time to ${minutes} minutes`);
  }
  
  // Set the break time (in minutes)
  setBreakTime(minutes) {
    if (minutes < 1 || minutes > 60) {
      console.error('PomodoroService: Break time must be between 1 and 60 minutes');
      return;
    }
    
    this.state.breakTime = minutes;
    
    // If we're in break mode and not active, update the time remaining
    if (this.state.isBreak && !this.state.isActive) {
      this.state.timeRemaining = minutes * 60;
    }
    
    // Save settings
    this.saveSettings();
    
    // Publish the event
    eventBus.publish(EVENTS.SETTINGS_CHANGED, this.getState());
    
    console.log(`PomodoroService: Set break time to ${minutes} minutes`);
  }
  
  // Set the work project ID
  setWorkProjectId(projectId) {
    this.state.workProjectId = projectId;
    
    // Save settings
    this.saveSettings();
    
    // Publish the event
    eventBus.publish(EVENTS.SETTINGS_CHANGED, this.getState());
    
    console.log(`PomodoroService: Set work project ID to ${projectId}`);
  }
  
  // Set the break project ID
  setBreakProjectId(projectId) {
    this.state.breakProjectId = projectId;
    
    // Save settings
    this.saveSettings();
    
    // Publish the event
    eventBus.publish(EVENTS.SETTINGS_CHANGED, this.getState());
    
    console.log(`PomodoroService: Set break project ID to ${projectId}`);
  }
  
  // Remember the current task for a project
  rememberTaskForProject(projectId, taskIndex) {
    if (projectId !== null && taskIndex !== undefined) {
      this.state.projectTaskMemory[projectId] = taskIndex;
      
      // Save settings
      this.saveSettings();
      
      console.log(`PomodoroService: Remembered task index ${taskIndex} for project ${projectId}`);
    }
  }
  
  // Get the remembered task for a project
  getTaskForProject(projectId) {
    return this.state.projectTaskMemory[projectId];
  }
  
  // Set project relationship (work project with its break project)
  setProjectRelationship(workProjectId, breakProjectId) {
    this.state.workProjectId = workProjectId;
    this.state.breakProjectId = breakProjectId;
    
    // Save settings
    this.saveSettings();
    
    // Publish the event
    eventBus.publish(EVENTS.SETTINGS_CHANGED, this.getState());
    
    console.log(`PomodoroService: Set project relationship - Work: ${workProjectId}, Break: ${breakProjectId}`);
  }
  
  // Private method to handle timer ticks
  _tick() {
    if (!this.state.isActive) {
      return;
    }
    
    this.state.timeRemaining--;
    
    // Publish tick event
    eventBus.publish(EVENTS.TIMER_TICK, this.getState());
    
    // Check if the timer is complete
    if (this.state.timeRemaining <= 0) {
      this._handleTimerComplete();
    }
  }
  
  // Private method to handle timer completion
  _handleTimerComplete() {
    // Clear the interval
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Publish the event
    eventBus.publish(EVENTS.TIMER_COMPLETED, {
      wasBreak: this.state.isBreak,
      nextMode: !this.state.isBreak ? 'break' : 'work'
    });
    
    // Toggle between work and break
    this.state.isBreak = !this.state.isBreak;
    
    // Set the new time based on the mode
    this.state.timeRemaining = this.state.isBreak ? 
      this.state.breakTime * 60 : 
      this.state.workTime * 60;
    
    // Publish the appropriate event for the new mode
    if (this.state.isBreak) {
      eventBus.publish(EVENTS.BREAK_STARTED, this.getState());
    } else {
      eventBus.publish(EVENTS.WORK_STARTED, this.getState());
    }
    
    console.log(`PomodoroService: Timer completed, switched to ${this.state.isBreak ? 'break' : 'work'} mode`);
    
    // Restart the timer automatically
    this.start();
  }

  /**
   * Handle timer completion without automatic transition
   * Similar to the existing _handleTimerComplete but without auto-starting
   */
  _handleTimerCompleteWithoutAutoStart() {
    // Clear the interval
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    // Publish the event
    eventBus.publish(EVENTS.TIMER_COMPLETED, {
      wasBreak: this.state.isBreak,
      nextMode: !this.state.isBreak ? 'break' : 'work'
    });

    console.log(`PomodoroService: Timer completed, but not auto-transitioning`);
  }

  /**
   * Start the next phase of the Pomodoro timer
   * This allows themes to control when to transition between work and break
   */
  startNextPhase() {
    console.log('PomodoroService: Starting next phase manually');

    // Toggle between work and break
    this.state.isBreak = !this.state.isBreak;

    // Set the new time based on the mode
    this.state.timeRemaining = this.state.isBreak ? 
      this.state.breakTime * 60 : 
      this.state.workTime * 60;

    // Publish the appropriate event for the new mode
    if (this.state.isBreak) {
      eventBus.publish(EVENTS.BREAK_STARTED, this.getState());
    } else {
      eventBus.publish(EVENTS.WORK_STARTED, this.getState());
    }

    console.log(`PomodoroService: Switched to ${this.state.isBreak ? 'break' : 'work'} mode`);

    // Start the timer automatically
    this.start();
  }
  
  // Get event names - useful for external components to subscribe
  getEvents() {
    return { ...EVENTS }; // Return a copy to prevent modification
  }
}

// Export a singleton instance
const pomodoroService = new PomodoroService();
module.exports = pomodoroService;