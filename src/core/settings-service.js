/**
 * Settings Service - Manages application settings
 * 
 * Central service for accessing and modifying application settings.
 * Uses electron-store for persistent storage.
 */

const Store = require('electron-store');
const eventBus = require('./event-bus');

// Event names
const EVENTS = {
  SETTINGS_CHANGED: 'settings:changed',
  THEME_CHANGED: 'settings:theme:changed',
  APPEARANCE_CHANGED: 'settings:appearance:changed'
};

class SettingsService {
  constructor() {
    // Define the schema for electron-store
    const schema = {
      // Window settings
      window: {
        type: 'object',
        properties: {
          position: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            }
          },
          size: {
            type: 'object',
            properties: {
              width: { type: 'number' },
              height: { type: 'number' }
            }
          }
        }
      },
      
      // Appearance settings
      appearance: {
        type: 'object',
        properties: {
          globalTransparency: { type: 'number', minimum: 10, maximum: 100 },
          clickThroughTransparency: { type: 'number', minimum: 10, maximum: 100 },
          isClickThrough: { type: 'boolean' }
        }
      },
      
      // Todoist settings
      todoist: {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          selectedProjectId: { type: ['string', 'null'] },
          currentTaskIndex: { type: 'number' }
        }
      },
      
      // Pomodoro settings
      pomodoro: {
        type: 'object',
        properties: {
          workTime: { type: 'number', minimum: 1, maximum: 60 },
          breakTime: { type: 'number', minimum: 1, maximum: 60 },
          workProjectId: { type: ['string', 'null'] },
          breakProjectId: { type: ['string', 'null'] },
          projectTaskMemory: { type: 'object' }
        }
      },
      
      // Theme settings
      theme: {
        type: 'object',
        properties: {
          currentTheme: { type: 'string', default: 'default' },
          themeSettings: { type: 'object' }
        }
      }
    };
    
    // Initialize the store
    this.store = new Store({ schema });
    
    console.log('SettingsService: Initialized');
  }
  
  // Get window settings
  getWindowSettings() {
    return this.store.get('window', {
      position: { x: null, y: null },
      size: { width: 350, height: 60 }
    });
  }
  
  // Save window settings
  saveWindowSettings(settings) {
    this.store.set('window', settings);
    eventBus.publish(EVENTS.SETTINGS_CHANGED, { area: 'window' });
    console.log('SettingsService: Saved window settings', settings);
  }
  
  // Get appearance settings
  getAppearanceSettings() {
    return this.store.get('appearance', {
      globalTransparency: 100,
      clickThroughTransparency: 80,
      isClickThrough: false
    });
  }
  
  // Save appearance settings
  saveAppearanceSettings(settings) {
    this.store.set('appearance', settings);
    eventBus.publish(EVENTS.APPEARANCE_CHANGED, settings);
    eventBus.publish(EVENTS.SETTINGS_CHANGED, { area: 'appearance' });
    console.log('SettingsService: Saved appearance settings', settings);
  }
  
  // Get Todoist settings
  getTodoistSettings() {
    return this.store.get('todoist', {
      apiKey: '',
      selectedProjectId: null,
      currentTaskIndex: 0
    });
  }
  
  // Save Todoist settings
  saveTodoistSettings(settings) {
    this.store.set('todoist', settings);
    eventBus.publish(EVENTS.SETTINGS_CHANGED, { area: 'todoist' });
    console.log('SettingsService: Saved Todoist settings');
  }
  
  // Get Todoist API key
  getTodoistApiKey() {
    return this.store.get('todoist.apiKey', '');
  }
  
  // Save Todoist API key
  saveTodoistApiKey(apiKey) {
    this.store.set('todoist.apiKey', apiKey);
    eventBus.publish(EVENTS.SETTINGS_CHANGED, { area: 'todoist', key: 'apiKey' });
    console.log('SettingsService: Saved Todoist API key');
  }
  
  // Get Pomodoro settings
  getPomodoroSettings() {
    return this.store.get('pomodoro', {
      workTime: 25,
      breakTime: 5,
      workProjectId: null,
      breakProjectId: null,
      projectTaskMemory: {}
    });
  }
  
  // Save Pomodoro settings
  savePomodoroSettings(settings) {
    this.store.set('pomodoro', settings);
    eventBus.publish(EVENTS.SETTINGS_CHANGED, { area: 'pomodoro' });
    console.log('SettingsService: Saved Pomodoro settings');
  }
  
  // Get theme settings
  getThemeSettings() {
    return this.store.get('theme', {
      currentTheme: 'default',
      themeSettings: {}
    });
  }
  
  // Save theme settings
  saveThemeSettings(settings) {
    this.store.set('theme', settings);
    eventBus.publish(EVENTS.THEME_CHANGED, settings);
    eventBus.publish(EVENTS.SETTINGS_CHANGED, { area: 'theme' });
    console.log('SettingsService: Saved theme settings', settings);
  }
  
  // Save current theme
  saveCurrentTheme(themeName) {
    this.store.set('theme.currentTheme', themeName);
    eventBus.publish(EVENTS.THEME_CHANGED, { currentTheme: themeName });
    eventBus.publish(EVENTS.SETTINGS_CHANGED, { area: 'theme', key: 'currentTheme' });
    console.log('SettingsService: Changed current theme to', themeName);
  }
  
  // Save theme-specific settings
  saveThemeSpecificSettings(themeName, settings) {
    this.store.set(`theme.themeSettings.${themeName}`, settings);
    eventBus.publish(EVENTS.THEME_CHANGED, { 
      currentTheme: this.getThemeSettings().currentTheme,
      themeSettings: { [themeName]: settings }
    });
    eventBus.publish(EVENTS.SETTINGS_CHANGED, { 
      area: 'theme', 
      key: 'themeSettings',
      themeName
    });
    console.log(`SettingsService: Saved settings for theme "${themeName}"`, settings);
  }
  
  // Get events
  getEvents() {
    return { ...EVENTS };
  }
}

// Export a singleton instance
const settingsService = new SettingsService();
module.exports = settingsService;