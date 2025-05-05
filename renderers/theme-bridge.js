// renderers/theme-bridge.js
// Bridge between main process themes and renderer UI
// Updated for the new theme system architecture

/**
 * Theme Bridge
 * Acts as a compatibility layer for themes, bridging between the old
 * and new theme systems during transition
 */

// Import the theme API
import themeAPI from './theme-api.js';

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Theme bridge initializing');
  
  // Set up theme container
  setupThemeContainer();
  
  // Initialize the theme API
  initThemeAPI();
});

/**
 * Set up the theme container in the DOM
 */
function setupThemeContainer() {
  // Check if there's already a theme container
  let themeContainer = document.getElementById('theme-container');
  
  if (!themeContainer) {
    // Create a theme container
    themeContainer = document.createElement('div');
    themeContainer.id = 'theme-container';
    themeContainer.style.width = '100%';
    themeContainer.style.height = '100%';
    
    // Find the app container
    const appContainer = document.querySelector('.app-container');
    
    if (appContainer) {
      // Save the original content
      const originalContent = appContainer.innerHTML;
      
      // Clear and add theme container
      appContainer.innerHTML = '';
      appContainer.appendChild(themeContainer);
      
      // Store original content in case we need to restore it
      window.originalAppContent = originalContent;
    } else {
      // If no app container, add theme container to body
      document.body.appendChild(themeContainer);
    }
    
    console.log('Theme bridge: Created theme container');
  }
}

/**
 * Initialize the Theme API
 */
async function initThemeAPI() {
  try {
    // Initialize the theme API
    await themeAPI.initialize();
    
    // Set up listeners
    setupThemeListeners();
    
    console.log('Theme bridge: Initialized Theme API');
  } catch (error) {
    console.error('Theme bridge: Failed to initialize Theme API', error);
  }
}

/**
 * Set up listeners for theme events
 */
function setupThemeListeners() {
  // Listen for theme changes
  themeAPI.onMainMessage('theme:changed', (theme) => {
    console.log('Theme bridge: Theme changed', theme);
  });
  
  // Listen for theme settings changes
  themeAPI.onMainMessage('theme:settings-updated', (settings) => {
    console.log('Theme bridge: Theme settings updated', settings);
  });
  
  // Forward window variables to theme API for compatibility
  themeAPI.onMainMessage('task:updated', (task) => {
    window.currentTaskId = task.id;
  });
  
  themeAPI.onMainMessage('projects-updated', (projects) => {
    window.projectsList = projects;
  });
  
  // Legacy event listeners for backward compatibility
  setupLegacyListeners();
}

/**
 * Set up legacy listeners for backward compatibility
 */
function setupLegacyListeners() {
  if (window.electronAPI) {
    const originalMethods = {
      onDisplayTask: window.electronAPI.onDisplayTask,
      onProjectsReceived: window.electronAPI.onProjectsReceived,
      onPomodoroUpdate: window.electronAPI.onPomodoroUpdate,
      onShowNotification: window.electronAPI.onShowNotification
    };

    // Wrap the original method without overwriting it
    if (originalMethods.onDisplayTask) {
      themeAPI.onMainMessage('task:updated', (task) => {
        originalMethods.onDisplayTask((content, id, projectsList) => {
          content = task.content;
          id = task.id;
          projectsList = window.projectsList;
        });
      });
    }

    if (originalMethods.onProjectsReceived) {
      themeAPI.onMainMessage('projects-updated', (projects) => {
        originalMethods.onProjectsReceived((callbackProjects) => {
          callbackProjects = projects;
        });
      });
    }

    if (originalMethods.onPomodoroUpdate) {
      themeAPI.onMainMessage('pomodoro:tick', (state) => {
        originalMethods.onPomodoroUpdate((callbackState) => {
          callbackState = state;
        });
      });
    }

    if (originalMethods.onShowNotification) {
      themeAPI.onMainMessage('notification:show', (notification) => {
        originalMethods.onShowNotification((callbackNotification) => {
          callbackNotification = notification;
        });
      });
    }
  }

  console.log('Theme bridge: Set up legacy listeners');
}

/**
 * Apply theme-specific CSS variables
 * @param {Object} theme - Theme object with settings
 */
function applyThemeVariables(theme) {
  if (!theme || !theme.settings) return;
  
  const settings = theme.settings;
  
  // Set CSS variables
  document.documentElement.style.setProperty('--background-color', settings.backgroundColor);
  document.documentElement.style.setProperty('--text-color', settings.textColor);
  document.documentElement.style.setProperty('--work-background-color', settings.workBackgroundColor);
  document.documentElement.style.setProperty('--break-background-color', settings.breakBackgroundColor);
  
  // Apply theme class to body
  document.body.className = '';
  document.body.classList.add(`theme-${theme.name}`);
  
  console.log('Theme bridge: Applied theme variables');
}

// Export the theme API for direct use
export default themeAPI;