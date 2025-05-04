// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // --- Task Operations ---
    getNextTask: () => {
        console.log('Preload: Sending get-next-task');
        ipcRenderer.send('get-next-task');
    },
    onDisplayTask: (callback) => {
        ipcRenderer.on('display-task', (_event, value, taskId, projectsList) => callback(value, taskId, projectsList));
    },
    completeTask: (taskId) => {
        console.log('Preload: Sending complete-task', taskId);
        ipcRenderer.send('complete-task', taskId);
    },
    addNewTask: (content, projectId) => {
        console.log('Preload: Sending add-task', content, projectId);
        ipcRenderer.send('add-task', { content, projectId });
    },

    // --- Project Operations ---
    getProjects: () => {
        console.log('Preload: Sending get-projects');
        ipcRenderer.send('get-projects');
    },
    onProjectsReceived: (callback) => {
        ipcRenderer.on('projects-list', (_event, projectsList) => callback(projectsList));
    },
    getSelectedProjectId: () => {
        console.log('Preload: Requesting selected project ID');
        return ipcRenderer.sendSync('get-selected-project-id');
    },
    onProjectChanged: (callback) => {
        ipcRenderer.on('project-changed', (_event, projectId) => callback(projectId));
    },
    
    // --- API Key Operations ---
    requestApiKey: () => {
        console.log('Preload: Sending request-api-key');
        ipcRenderer.send('request-api-key');
    },
    saveApiKey: (apiKey) => {
        console.log('Preload: Sending save-api-key');
        ipcRenderer.send('save-api-key', apiKey);
    },
    
    // --- Window Operations ---
    savePositionAndResize: (height) => {
        console.log('Preload: Sending save-position-and-resize', height);
        ipcRenderer.send('save-position-and-resize', height);
    },
    restorePositionAndResize: () => {
        console.log('Preload: Sending restore-position-and-resize');
        ipcRenderer.send('restore-position-and-resize');
    },

    // --- Dragging Communication ---
    startDrag: () => {
        console.log('Preload: Sending start-drag');
        ipcRenderer.send('start-drag');
    },
    sendDragData: (mousePos) => {
        // No console log here to avoid flooding during drag
        ipcRenderer.send('dragging', mousePos);
    },
    endDrag: () => {
        console.log('Preload: Sending end-drag');
        ipcRenderer.send('end-drag');
    },

    // --- Pomodoro Operations ---
    startPomodoro: () => {
        console.log('Preload: Sending start-pomodoro');
        ipcRenderer.send('start-pomodoro');
    },
    resetPomodoro: () => {
        console.log('Preload: Sending reset-pomodoro');
        ipcRenderer.send('reset-pomodoro');
    },
    getPomodoroState: () => {
        console.log('Preload: Sending get-pomodoro-state');
        ipcRenderer.send('get-pomodoro-state');
    },
    onPomodoroUpdate: (callback) => {
        ipcRenderer.on('pomodoro-update', (_event, state) => callback(state));
    },
    onShowNotification: (callback) => {
        ipcRenderer.on('show-notification', (_event, notification) => callback(notification));
    },
    
    // --- NEW Theme Operations ---
    getAvailableThemes: async () => {
        console.log('Preload: Requesting available themes');
        return await ipcRenderer.invoke('get-available-themes');
    },
    onThemesReceived: (callback) => {
        ipcRenderer.on('themes-list', (_event, themesList) => callback(themesList));
    },
    onThemeChanged: (callback) => {
        ipcRenderer.on('theme-changed', (_event, theme) => callback(theme));
    },
    onThemeDisplayTask: (callback) => {
        ipcRenderer.on('theme-display-task', (_event, data) => callback(data));
    },
    onThemeUpdatePomodoro: (callback) => {
        ipcRenderer.on('theme-update-pomodoro', (_event, data) => callback(data));
    },
    onThemeNotification: (callback) => {
        ipcRenderer.on('theme-show-notification', (_event, data) => callback(data));
    },
    onThemeSettingsChanged: (callback) => {
        ipcRenderer.on('theme-settings-changed', (_event, data) => callback(data));
    },
    getActiveTheme: () => {
        console.log('Preload: Requesting active theme');
        return ipcRenderer.sendSync('get-active-theme');
    },
    setActiveTheme: (themeName) => {
        console.log('Preload: Sending set-active-theme', themeName);
        ipcRenderer.send('set-active-theme', themeName);
    },
    getThemeSettings: (themeName) => {
        console.log('Preload: Requesting theme settings for', themeName);
        return ipcRenderer.sendSync('get-theme-settings', themeName);
    },
    saveThemeSettings: (themeName, settings) => {
        console.log('Preload: Sending save-theme-settings', themeName, settings);
        ipcRenderer.send('save-theme-settings', themeName, settings);
    },
    
    // --- NEW App Settings Operations ---
    getAppSettings: () => {
        console.log('Preload: Requesting app settings');
        return ipcRenderer.sendSync('get-app-settings');
    },
    saveAppSettings: (settings) => {
        console.log('Preload: Sending save-app-settings', settings);
        ipcRenderer.send('save-app-settings', settings);
    },
    onSettingsChanged: (callback) => {
        ipcRenderer.on('settings-changed', (_event, settings) => callback(settings));
    }
});

console.log('Preload script loaded.');