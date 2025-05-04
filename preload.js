// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Task cycling (unchanged)
    getNextTask: () => {
        console.log('Preload: Sending get-next-task');
        ipcRenderer.send('get-next-task');
    },
    onDisplayTask: (callback) => {
        ipcRenderer.on('display-task', (_event, value, taskId, projectsList) => callback(value, taskId, projectsList));
    },

    // --- Todoist Task Operations ---
    completeTask: (taskId) => {
        console.log('Preload: Sending complete-task', taskId);
        ipcRenderer.send('complete-task', taskId);
    },
    addNewTask: (content, projectId) => {
        console.log('Preload: Sending add-task', content, projectId);
        ipcRenderer.send('add-task', { content, projectId });
    },
    getProjects: () => {
        console.log('Preload: Sending get-projects');
        ipcRenderer.send('get-projects');
    },
    onProjectsReceived: (callback) => {
        ipcRenderer.on('projects-list', (_event, projectsList) => callback(projectsList));
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
    // Send message to main process to indicate drag start
    startDrag: () => {
        console.log('Preload: Sending start-drag');
        ipcRenderer.send('start-drag');
    },
    // Send message to main process with current mouse position during drag
    sendDragData: (mousePos) => {
        // No console log here to avoid flooding during drag
        ipcRenderer.send('dragging', mousePos); // Pass mouse position object
    },
    // Send message to main process to indicate drag end
    endDrag: () => {
        console.log('Preload: Sending end-drag');
        ipcRenderer.send('end-drag');
    },

    // Expose a method to get the selected project ID
    getSelectedProjectId: () => {
        console.log('Preload: Requesting selected project ID');
        return ipcRenderer.sendSync('get-selected-project-id');
    },

    // Expose a method to listen for project changes
    onProjectChanged: (callback) => {
        ipcRenderer.on('project-changed', (_event, projectId) => callback(projectId));
    }
});

console.log('Preload script loaded.');
