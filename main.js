// main.js
// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load .env file

// Core services
const eventBus = require('./src/core/event-bus');
const settingsService = require('./src/core/settings-service');
const todoistService = require('./src/core/todoist-service');
const pomodoroService = require('./src/core/pomodoro-service');
const themeManager = require('./src/ui/theme-manager');

// Global references
let mainWindow;
let tray = null;
let boundaryCheckInterval;

// UI state variables
let isDragging = false;
let dragMouseStart = null;
let dragWindowStartBounds = null;
let originalWindowPosition = null;

/**
 * Create the main application window
 */
function createWindow() {
  // Get window settings from settings service
  const windowSettings = settingsService.getWindowSettings();
  const appearanceSettings = settingsService.getAppearanceSettings();
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: windowSettings.size.width || 350,
    height: windowSettings.size.height || 60,
    x: windowSettings.position.x,
    y: windowSettings.position.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false, // We control movement manually
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Set opacity based on settings
  updateTransparency();

  // Set click-through if enabled
  if (appearanceSettings.isClickThrough) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Prevent default context menu on right-click
  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault();
  });

  // Window close handler
  mainWindow.on('closed', () => {
    mainWindow = null;
    
    // Clear interval on close
    if (boundaryCheckInterval) {
      clearInterval(boundaryCheckInterval);
    }
  });

  // Window load handler
  mainWindow.webContents.on('did-finish-load', async () => {
    console.log('Window loaded');
    
    // Start boundary check
    startBoundaryCheck();
    
    // Initialize services
    await initializeServices();
  });
}

/**
 * Initialize the application services
 */
async function initializeServices() {
  console.log('Initializing services...');
  
  // Initialize todoist service
  await todoistService.fetchProjects();
  await todoistService.fetchTasks();
  
  // Initialize themes
  await themeManager.discoverThemes();
  await themeManager.loadSavedTheme();
}

/**
 * Start boundary check to keep window on screen
 */
function startBoundaryCheck() {
  if (boundaryCheckInterval) {
    clearInterval(boundaryCheckInterval);
  }
  
  // Check every 10 seconds
  boundaryCheckInterval = setInterval(checkAndAdjustBounds, 10000);
}

/**
 * Check and adjust window bounds to keep on screen
 */
function checkAndAdjustBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const screenBounds = primaryDisplay.workArea;
  const windowBounds = mainWindow.getBounds();

  let newX = windowBounds.x;
  let newY = windowBounds.y;

  // Check horizontal bounds
  if (windowBounds.x < screenBounds.x) {
    newX = screenBounds.x;
  } else if (windowBounds.x + windowBounds.width > screenBounds.x + screenBounds.width) {
    newX = screenBounds.x + screenBounds.width - windowBounds.width;
  }

  // Check vertical bounds
  if (windowBounds.y < screenBounds.y) {
    newY = screenBounds.y;
  } else if (windowBounds.y + windowBounds.height > screenBounds.y + screenBounds.height) {
    newY = screenBounds.y + screenBounds.height - windowBounds.height;
  }

  // If position needs adjustment, set the new bounds
  const roundedX = Math.round(newX);
  const roundedY = Math.round(newY);

  if (roundedX !== windowBounds.x || roundedY !== windowBounds.y) {
    console.log(`Adjusting bounds: offscreen detected. New pos: (${roundedX}, ${roundedY})`);
    
    mainWindow.setBounds({
      x: roundedX,
      y: roundedY,
      width: windowBounds.width,
      height: windowBounds.height
    });
    
    // Save the new position
    settingsService.saveWindowSettings({
      position: { x: roundedX, y: roundedY },
      size: { width: windowBounds.width, height: windowBounds.height }
    });
  }
}

/**
 * Update window transparency based on settings
 */
function updateTransparency() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  const settings = settingsService.getAppearanceSettings();
  
  if (settings.isClickThrough) {
    mainWindow.setOpacity(settings.clickThroughTransparency / 100);
  } else {
    mainWindow.setOpacity(settings.globalTransparency / 100);
  }
}

/**
 * Create the system tray
 */
function createTray() {
  // Destroy existing tray if it exists
  if (tray) {
    tray.destroy();
    tray = null;
  }

  // Create tray icon
  const iconPath = path.join(__dirname, 'assets/default/icon.png');
  try {
    // Use nativeImage to properly load the icon
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon);
  } catch (error) {
    console.error("Failed to create tray icon:", error);
    return;
  }

  // Build tray menu
  const contextMenu = Menu.buildFromTemplate(createTrayMenuTemplate());
  
  tray.setToolTip('Task Overlay App');
  tray.setContextMenu(contextMenu);
}

/**
 * Create the tray menu template
 */
function createTrayMenuTemplate() {
  // Build project submenu
  const projectSubmenu = createProjectSubmenu();
  
  // Build theme submenu
  const themeSubmenu = createThemeSubmenu();
  
  // Build transparency submenu
  const transparencySubmenu = createTransparencySubmenu();
  
  // Build Pomodoro submenu
  const pomodoroSubmenu = createPomodoroSubmenu();
  
  // Main menu template
  return [
    {
      label: 'Open Dev Tools',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.openDevTools();
        }
      }
    },
    {
      label: 'Refresh Tasks',
      click: () => {
        console.log('Manual task refresh triggered.');
        todoistService.fetchTasks();
      }
    },
    {
      label: 'Filter by Project',
      submenu: projectSubmenu
    },
    {
      label: 'Theme',
      submenu: themeSubmenu
    },
    {
      label: 'Transparency Settings',
      submenu: transparencySubmenu
    },
    {
      label: 'Toggle Click-Through',
      type: 'checkbox',
      checked: settingsService.getAppearanceSettings().isClickThrough,
      click: (menuItem) => {
        const isClickThrough = menuItem.checked;
        const settings = settingsService.getAppearanceSettings();
        
        // Update settings
        settingsService.saveAppearanceSettings({
          ...settings,
          isClickThrough
        });
        
        // Update window
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (!isDragging) {
            mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
          }
          
          updateTransparency();
        }
      }
    },
    {
      label: 'Pomodoro Settings',
      submenu: pomodoroSubmenu
    },
    {
      label: 'Clear API Token',
      click: () => {
        const choice = dialog.showMessageBoxSync({
          type: 'question',
          buttons: ['Yes', 'No'],
          title: 'Confirm',
          message: 'Are you sure you want to clear your API token?'
        });
        
        if (choice === 0) {
          todoistService.clearApiKey();
          createTray(); // Rebuild tray menu
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ];
}

/**
 * Create project submenu
 */
function createProjectSubmenu() {
  const selectedProjectId = todoistService.selectedProjectId;
  const projects = todoistService.projects || [];
  
  const submenu = [
    {
      label: 'All Projects',
      type: 'radio',
      checked: selectedProjectId === null,
      click: () => {
        todoistService.selectProject(null);
      }
    },
    { type: 'separator' }
  ];
  
  // Add projects
  projects.forEach(project => {
    submenu.push({
      label: project.name,
      type: 'radio',
      checked: selectedProjectId === project.id,
      click: () => {
        todoistService.selectProject(project.id);
      }
    });
  });
  
  return submenu;
}

/**
 * Create theme submenu
 */
function createThemeSubmenu() {
  const submenu = [];
  const activeTheme = themeManager.getActiveTheme();
  const themes = Array.from(themeManager.getAllThemes().values());
  
  // Add themes
  themes.forEach(theme => {
    submenu.push({
      label: theme.displayName,
      type: 'radio',
      checked: activeTheme && activeTheme.name === theme.name,
      click: () => {
        themeManager.activateTheme(theme.name);
      }
    });
  });
  
  return submenu;
}

/**
 * Create transparency submenu
 */
function createTransparencySubmenu() {
  const settings = settingsService.getAppearanceSettings();
  
  return [
    {
      label: 'Normal Transparency',
      submenu: Array.from({ length: 10 }, (_, i) => {
        const percentage = (i + 1) * 10;
        return {
          label: `${percentage}%`,
          type: 'radio',
          checked: settings.globalTransparency === percentage,
          click: () => {
            settingsService.saveAppearanceSettings({
              ...settings,
              globalTransparency: percentage
            });
            updateTransparency();
          }
        };
      })
    },
    {
      label: 'Click-Through Transparency',
      submenu: Array.from({ length: 10 }, (_, i) => {
        const percentage = (i + 1) * 10;
        return {
          label: `${percentage}%`,
          type: 'radio',
          checked: settings.clickThroughTransparency === percentage,
          click: () => {
            settingsService.saveAppearanceSettings({
              ...settings,
              clickThroughTransparency: percentage
            });
            updateTransparency();
          }
        };
      })
    }
  ];
}

/**
 * Create Pomodoro submenu
 */
function createPomodoroSubmenu() {
  const pomodoroState = pomodoroService.getState();
  const todoistProjects = todoistService.projects || [];
  
  // Generate minutes for dropdown
  const generateMinutesSubmenu = (current, callback) => {
    const submenu = [];
    for (let i = 1; i <= 60; i++) {
      submenu.push({
        label: `${i} minute${i > 1 ? 's' : ''}`,
        type: 'radio',
        checked: current === i,
        click: () => callback(i)
      });
    }
    return submenu;
  };
  
  // Generate project submenu for break project selection
  const generateProjectSubmenu = () => {
    const submenu = [];
    todoistProjects.forEach(project => {
      submenu.push({
        label: project.name,
        click: () => pomodoroService.setProjectRelationship(
          pomodoroState.workProjectId || todoistService.selectedProjectId,
          project.id
        )
      });
    });
    return submenu;
  };
  
  return [
    {
      label: pomodoroState.isActive ? 'Pause Pomodoro' : 'Start Pomodoro',
      click: () => {
        pomodoroService.toggle();
      }
    },
    {
      label: 'Reset Pomodoro',
      click: () => {
        pomodoroService.reset();
      }
    },
    { type: 'separator' },
    {
      label: 'Work Time',
      submenu: generateMinutesSubmenu(pomodoroState.workTime, (minutes) => {
        pomodoroService.setWorkTime(minutes);
      })
    },
    {
      label: 'Break Time',
      submenu: generateMinutesSubmenu(pomodoroState.breakTime, (minutes) => {
        pomodoroService.setBreakTime(minutes);
      })
    },
    { type: 'separator' },
    {
      label: 'Set Break Project for Current Project',
      submenu: generateProjectSubmenu()
    }
  ];
}

// --- IPC Handlers ---

// Next task
ipcMain.on('get-next-task', (event) => {
  console.log('Main: Received get-next-task');
  const task = todoistService.nextTask();
  
  if (task) {
    event.sender.send('display-task', 
      task.content, 
      task.id,
      todoistService.projects);
  } else {
    event.sender.send('display-task', 'No tasks available.', null, todoistService.projects);
  }
});

// Window resize
ipcMain.on('resize-window', (event, height) => {
  console.log(`Main: Received resize-window to height ${height}px`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    const bounds = mainWindow.getBounds();
    
    mainWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: height
    });
    
    // Save the new size
    settingsService.saveWindowSettings({
      position: { x: bounds.x, y: bounds.y },
      size: { width: bounds.width, height: height }
    });
    
    // Check bounds
    checkAndAdjustBounds();
  }
});

// Save position and resize
ipcMain.on('save-position-and-resize', (event, height) => {
  console.log(`Main: Received save-position-and-resize to height ${height}px`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Save the current position
    originalWindowPosition = mainWindow.getBounds();
    
    // Apply new height
    mainWindow.setBounds({
      x: originalWindowPosition.x,
      y: originalWindowPosition.y,
      width: originalWindowPosition.width,
      height: height
    });
    
    // Check bounds
    checkAndAdjustBounds();
  }
});

// Restore position and resize
ipcMain.on('restore-position-and-resize', (event) => {
  console.log('Main: Received restore-position-and-resize');
  if (mainWindow && !mainWindow.isDestroyed() && originalWindowPosition) {
    // Restore original position and default height
    mainWindow.setBounds({
      x: originalWindowPosition.x,
      y: originalWindowPosition.y,
      width: originalWindowPosition.width,
      height: 60 // Default height
    });
    
    // Save the restored size
    settingsService.saveWindowSettings({
      position: { x: originalWindowPosition.x, y: originalWindowPosition.y },
      size: { width: originalWindowPosition.width, height: 60 }
    });
  }
});

// Complete task
ipcMain.on('complete-task', (event, taskId) => {
  console.log('Main: Received complete-task for ID:', taskId);
  if (taskId) {
    todoistService.completeTask(taskId);
  }
});

// Add task
ipcMain.on('add-task', (event, taskData) => {
  console.log('Main: Received add-task:', taskData);
  if (taskData && taskData.content) {
    todoistService.addTask(taskData.content, taskData.projectId);
  }
});

// Get projects
ipcMain.on('get-projects', (event) => {
  console.log('Main: Received get-projects');
  event.sender.send('projects-list', todoistService.projects);
});

// Save API key
ipcMain.on('save-api-key', (event, apiKey) => {
  console.log('Main: Received save-api-key');
  if (apiKey) {
    todoistService.setApiKey(apiKey);
  }
});

// Get selected project ID
ipcMain.on('get-selected-project-id', (event) => {
  event.returnValue = todoistService.selectedProjectId;
});

// Start/pause Pomodoro
ipcMain.on('start-pomodoro', () => {
  console.log('Main: Received start-pomodoro');
  pomodoroService.toggle();
});

// Reset Pomodoro
ipcMain.on('reset-pomodoro', () => {
  console.log('Main: Received reset-pomodoro');
  pomodoroService.reset();
});

// Get Pomodoro state
ipcMain.on('get-pomodoro-state', (event) => {
  console.log('Main: Received get-pomodoro-state');
  event.reply('pomodoro-update', pomodoroService.getState());
});

// Get available themes
ipcMain.on('get-available-themes', async (event) => {
  if (themeManager.getAllThemes().size === 0) {
    await themeManager.discoverThemes();
  }

  const themes = Array.from(themeManager.getAllThemes().entries()).map(([name, theme]) => ({
    name,
    displayName: theme.displayName,
    description: theme.description
  }));

  event.reply('themes-list', themes);
});

// Get active theme
ipcMain.on('get-active-theme', (event) => {
  const activeTheme = themeManager.getActiveTheme();

  if (!activeTheme) {
    event.returnValue = null;
    return;
  }

  event.returnValue = {
    name: activeTheme.name,
    displayName: activeTheme.displayName,
    description: activeTheme.description
  };
});

// Set active theme
ipcMain.on('set-active-theme', async (event, themeName) => {
  if (!themeManager.hasTheme(themeName)) {
    event.reply('theme-activated', { success: false, error: 'Theme not found' });
    return;
  }

  try {
    await themeManager.activateTheme(themeName);
    event.reply('theme-activated', { success: true });
  } catch (error) {
    console.error('Error activating theme:', error);
    event.reply('theme-activated', { success: false, error: error.message });
  }
});

// Get theme settings
ipcMain.on('get-theme-settings', (event, themeName) => {
  const theme = themeManager.getTheme(themeName);

  if (!theme) {
    event.returnValue = null;
    return;
  }

  event.returnValue = theme.getSettings();
});

// Save theme settings
ipcMain.handle('save-theme-settings', (event, themeName, settings) => {
  const theme = themeManager.getTheme(themeName);
  
  if (!theme) {
    return { success: false, error: 'Theme not found' };
  }
  
  try {
    theme.updateSettings(settings);
    return { success: true };
  } catch (error) {
    console.error('Error saving theme settings:', error);
    return { success: false, error: error.message };
  }
});

// Get app settings
ipcMain.on('get-app-settings', (event) => {
  event.returnValue = {
    appearance: settingsService.getAppearanceSettings(),
    window: settingsService.getWindowSettings(),
    pomodoro: settingsService.getPomodoroSettings()
  };
});

// Save app settings
ipcMain.handle('save-app-settings', (event, settings) => {
  try {
    if (settings.appearance) {
      settingsService.saveAppearanceSettings(settings.appearance);
    }
    
    if (settings.window) {
      settingsService.saveWindowSettings(settings.window);
    }
    
    if (settings.pomodoro) {
      settingsService.savePomodoroSettings(settings.pomodoro);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error saving app settings:', error);
    return { success: false, error: error.message };
  }
});

// --- Drag Handling ---

// Start drag
ipcMain.on('start-drag', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  isDragging = true;
  
  // Make the window interactable for dragging
  const settings = settingsService.getAppearanceSettings();
  if (settings.isClickThrough) {
    mainWindow.setIgnoreMouseEvents(false);
  }
  
  // Get initial mouse position and window bounds
  const { screen } = require('electron');
  dragMouseStart = screen.getCursorScreenPoint();
  dragWindowStartBounds = mainWindow.getBounds();
});

// Dragging
ipcMain.on('dragging', (event, mousePos) => {
  if (!isDragging || !mainWindow || mainWindow.isDestroyed() || !dragMouseStart || !dragWindowStartBounds) return;

  // Calculate mouse delta since drag start
  const deltaX = mousePos.x - dragMouseStart.x;
  const deltaY = mousePos.y - dragMouseStart.y;

  // Calculate new window position
  const newX = dragWindowStartBounds.x + deltaX;
  const newY = dragWindowStartBounds.y + deltaY;

  // Update window position
  mainWindow.setBounds({
    x: Math.round(newX),
    y: Math.round(newY),
    width: dragWindowStartBounds.width,
    height: dragWindowStartBounds.height
  });
});

// End drag
ipcMain.on('end-drag', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  isDragging = false;
  
  // Make window click-through again if it's supposed to be
  const settings = settingsService.getAppearanceSettings();
  if (settings.isClickThrough) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  }
  
  // Save the new position
  const bounds = mainWindow.getBounds();
  settingsService.saveWindowSettings({
    position: { x: bounds.x, y: bounds.y },
    size: { width: bounds.width, height: bounds.height }
  });
  
  // Reset drag state
  dragMouseStart = null;
  dragWindowStartBounds = null;
  
  // Check bounds
  checkAndAdjustBounds();
});

// --- Event Listeners ---

// Subscribe to Pomodoro events
eventBus.subscribe(pomodoroService.getEvents().TIMER_TICK, (state) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pomodoro-update', state);
  }
});

// Forward Pomodoro timer completion events
eventBus.subscribe(pomodoroService.getEvents().TIMER_COMPLETED, (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const title = data.nextMode === 'break' ? 'Break Time!' : 'Back to Work!';
    const body = data.nextMode === 'break' 
      ? `Time for a ${pomodoroService.getState().breakTime} minute break.` 
      : `Time for a ${pomodoroService.getState().workTime} minute work session.`;
    
    mainWindow.webContents.send('show-notification', { title, body });
  }
});

// Forward settings changes
eventBus.subscribe(settingsService.getEvents().SETTINGS_CHANGED, (data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('settings-changed', data);
  }
  
  // Rebuild tray menu if needed
  if (data.area === 'todoist' || data.area === 'theme' || data.area === 'pomodoro') {
    createTray();
  }
});

// --- Application Lifecycle ---

// App ready
app.whenReady().then(async () => {
  createWindow();
  await themeManager.discoverThemes();
  createTray();
  updateTransparency();
});

// Window all closed
app.on('window-all-closed', () => {
  if (tray) {
    tray.destroy();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// App activate (macOS)
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// App before quit
app.on('before-quit', () => {
  if (tray) {
    tray.destroy();
  }
});