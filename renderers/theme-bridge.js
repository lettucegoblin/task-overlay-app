// renderers/theme-bridge.js
// Bridge between main process themes and renderer UI

// Current theme state
let currentTheme = {
  name: 'default',
  displayName: 'Minimal',
  settings: {
    textColor: '#e0e0e0',
    backgroundColor: 'rgba(20, 20, 40, 0.85)',
    workBackgroundColor: 'rgba(60, 20, 40, 0.85)',
    breakBackgroundColor: 'rgba(20, 60, 40, 0.85)'
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Theme bridge initialized');
  
  // Set up event listeners for theme events
  setupThemeListeners();
  
  // Apply default theme initially
  applyTheme(currentTheme);
});

// Set up event listeners for theme-related events
function setupThemeListeners() {
  // Listen for theme changes
  if (window.electronAPI) {
    window.electronAPI.onThemeChanged((theme) => {
      console.log('Theme changed:', theme);
      currentTheme = theme;
      applyTheme(theme);
    });
    
    // Listen for theme-specific task display
    window.electronAPI.onThemeDisplayTask((data) => {
      console.log('Theme display task:', data);
      // This is handled by the main renderer.js
    });
    
    // Listen for theme-specific Pomodoro updates
    window.electronAPI.onThemeUpdatePomodoro((data) => {
      console.log('Theme update Pomodoro:', data);
      // Most of this is handled by the main renderer.js
      
      // Apply theme-specific styles based on Pomodoro state
      if (data.state.isBreak) {
        document.body.classList.add('break-mode');
        document.body.classList.remove('work-mode');
      } else {
        document.body.classList.add('work-mode');
        document.body.classList.remove('break-mode');
      }
    });
    
    // Listen for theme notifications
    window.electronAPI.onThemeNotification((data) => {
      console.log('Theme notification:', data);
      showThemeNotification(data.notification);
    });
  }
}

// Apply theme settings to the UI
function applyTheme(theme) {
  console.log(`Applying theme: ${theme.name}`);
  
  // Set theme class on body
  document.body.className = '';
  document.body.classList.add(`theme-${theme.name}`);
  
  // Apply CSS variables for theme colors
  document.documentElement.style.setProperty('--background-color', theme.settings.backgroundColor);
  document.documentElement.style.setProperty('--text-color', theme.settings.textColor);
  document.documentElement.style.setProperty('--work-background-color', theme.settings.workBackgroundColor);
  document.documentElement.style.setProperty('--break-background-color', theme.settings.breakBackgroundColor);
  
  // Apply theme-specific styling
  if (theme.name === 'default') {
    applyDefaultTheme();
  } else if (theme.name === 'farming') {
    applyFarmingTheme();
  }
}

// Apply default theme styling
function applyDefaultTheme() {
  // Default styling is handled by CSS variables and base styles
}

// Apply farming theme styling
function applyFarmingTheme() {
  // Would implement farming-specific DOM changes here
  // For now just use default styling
}

// Show a theme notification
function showThemeNotification(notification) {
  // Create notification element
  const notificationElement = document.createElement('div');
  notificationElement.className = 'theme-notification';
  notificationElement.textContent = `${notification.title} ${notification.body}`;
  document.body.appendChild(notificationElement);
  
  // Show notification with animation
  setTimeout(() => {
    notificationElement.classList.add('show');
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    notificationElement.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notificationElement);
    }, 300);
  }, 5000);
}