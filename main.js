// main.js
// Modules to control application life and create native browser window
// Add Tray, Menu, and Dialog
const { app, BrowserWindow, screen, ipcMain, Tray, Menu, dialog } = require('electron');
const path = require('path');
const https = require('https'); // Require the https module
const fs = require('fs'); // For file operations with .env
require('dotenv').config(); // Load .env file
const Store = require('electron-store'); // Add persistent storage

// Create the store for API token
const store = new Store({
    schema: {
        todoistApiKey: {
            type: 'string',
            default: ''
        }
    }
});

// --- Todoist Integration ---
let todoistTasks = []; // Array to hold tasks fetched from Todoist
let todoistTaskIds = []; // Array to hold task IDs corresponding to tasks
let todoistProjects = []; // Array to hold projects fetched from Todoist
let selectedProjectId = null; // ID of the project to filter by, null for all
let currentTaskIndex = 0;

// Get API key from store first, fallback to .env if needed
let TODOIST_API_KEY = store.get('todoistApiKey') || process.env.TODOIST_API_KEY;
const TODOIST_API_BASE_URL = 'https://api.todoist.com/rest/v2'; // Use v2 API base

// Function to fetch projects
function fetchTodoistProjects() {
    if (!TODOIST_API_KEY) {
        console.error('Todoist API key not found for fetching projects.');
        // Optionally notify the user or handle differently
        return;
    }

    const options = {
        headers: {
            'Authorization': `Bearer ${TODOIST_API_KEY}`
        }
    };

    console.log('Fetching projects from Todoist...');
    const req = https.get(`${TODOIST_API_BASE_URL}/projects`, options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode === 200) {
                try {
                    todoistProjects = JSON.parse(data);
                    console.log(`Fetched ${todoistProjects.length} projects.`);
                    // Send projects to renderer if window exists
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('projects-list', todoistProjects);
                    }
                    // Rebuild the tray menu now that projects are available
                    createTray();
                } catch (e) {
                    console.error('Error parsing Todoist projects response:', e);
                    todoistProjects = []; // Reset projects on error
                }
            } else {
                console.error(`Error fetching projects: Status Code ${res.statusCode}`);
                console.error('Response body:', data);
                todoistProjects = []; // Reset projects on error
            }
        });
    });

    req.on('error', (e) => {
        console.error('Error making request to Todoist for projects:', e);
        todoistProjects = []; // Reset projects on error
    });

    req.end();
}

// Function to save API key
function saveApiKey(apiKey) {
    console.log('Saving new API key...');
    try {
        // Save to electron-store
        store.set('todoistApiKey', apiKey);
        console.log('API key saved to user data');
        
        // Update the current TODOIST_API_KEY variable
        TODOIST_API_KEY = apiKey;
        
        // Try to save to .env as fallback for development, but don't error if it fails
        try {
            const envPath = path.join(__dirname, '.env');
            const envContent = `TODOIST_API_KEY=${apiKey}`;
            fs.writeFileSync(envPath, envContent);
            process.env.TODOIST_API_KEY = apiKey;
            console.log('API key also saved to .env file (development mode)');
        } catch (envError) {
            console.log('Could not save to .env file, but that\'s OK - using electron-store');
        }
        
        // Refresh data with the new API key
        fetchTodoistProjects();
        fetchTodoistTasks(selectedProjectId);
        
        return true;
    } catch (error) {
        console.error('Error saving API key:', error);
        dialog.showErrorBox(
            'Error Saving API Key',
            'Could not save your API key. Please try again.'
        );
        return false;
    }
}

// Function to check if API key exists and is valid
function apiKeyExists() {
    return !!(TODOIST_API_KEY);
}

// Function to clear API key
function clearApiKey() {
    console.log('Clearing API key...');
    try {
        // Clear from electron-store
        store.delete('todoistApiKey');
        console.log('API key cleared from user data');
        
        // Clear the API key variables
        TODOIST_API_KEY = '';
        process.env.TODOIST_API_KEY = '';
        
        // Try to clear .env as well (development mode), but don't error if it fails
        try {
            const envPath = path.join(__dirname, '.env');
            if (fs.existsSync(envPath)) {
                fs.writeFileSync(envPath, '');
                console.log('API key also cleared from .env file (development mode)');
            }
        } catch (envError) {
            console.log('Could not clear .env file, but that\'s OK');
        }
        
        // Reset data
        todoistTasks = [];
        todoistTaskIds = [];
        todoistProjects = [];
        currentTaskIndex = 0;
        
        // Notify the renderer that API key is missing
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('display-task', 'Click here to add your Todoist API key', 'api-key-missing', []);
        }
        
        return true;
    } catch (error) {
        console.error('Error clearing API key:', error);
        dialog.showErrorBox(
            'Error Clearing API Key',
            'Could not clear your API key. Please try again.'
        );
        return false;
    }
}

// Modified function to fetch tasks, accepting an optional projectId
function fetchTodoistTasks(projectId = null) {
    if (!apiKeyExists()) {
        console.error('Todoist API key not found in .env file.');
        mainWindow?.webContents.send('display-task', 'Click here to add your Todoist API key', 'api-key-missing', todoistProjects);
        todoistTasks = ['Click here to add your Todoist API key'];
        todoistTaskIds = ['api-key-missing'];
        currentTaskIndex = 0;
        return;
    }

    let apiUrl = `${TODOIST_API_BASE_URL}/tasks`;
    if (projectId) {
        apiUrl += `?project_id=${projectId}`;
        console.log(`Fetching tasks for project ID: ${projectId}...`);
    } else {
        console.log('Fetching all tasks from Todoist...');
    }

    const options = {
        headers: {
            'Authorization': `Bearer ${TODOIST_API_KEY}`
        }
    };

    const req = https.get(apiUrl, options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            if (res.statusCode === 200) {
                try {
                    const fetchedTasks = JSON.parse(data);
                    // Store both task content and IDs
                    todoistTasks = fetchedTasks.map(task => task.content);
                    todoistTaskIds = fetchedTasks.map(task => task.id);
                    console.log(`Fetched ${todoistTasks.length} tasks.`);
                    currentTaskIndex = 0; // Reset index
                    if (mainWindow && !mainWindow.isDestroyed() && todoistTasks.length > 0) {
                        // Pass task content, ID, and projects list
                        mainWindow.webContents.send('display-task', 
                            todoistTasks[currentTaskIndex], 
                            todoistTaskIds[currentTaskIndex], 
                            todoistProjects);
                    } else if (mainWindow && !mainWindow.isDestroyed()) {
                         mainWindow.webContents.send('display-task', 'No tasks found.', null, todoistProjects);
                    }
                } catch (e) {
                    console.error('Error parsing Todoist response:', e);
                    mainWindow?.webContents.send('display-task', 'Error: Parse Failed', null, todoistProjects);
                    todoistTasks = ['Error: Parse Failed'];
                    todoistTaskIds = [''];
                    currentTaskIndex = 0;
                }
            } else {
                console.error(`Error fetching tasks: Status Code ${res.statusCode}`);
                console.error('Response body:', data);
                mainWindow?.webContents.send('display-task', `Error: ${res.statusCode}`, null, todoistProjects);
                todoistTasks = [`Error: ${res.statusCode}`];
                todoistTaskIds = [''];
                currentTaskIndex = 0;
            }
        });
    });

    req.on('error', (e) => {
        console.error('Error making request to Todoist:', e);
        mainWindow?.webContents.send('display-task', 'Error: Request Failed', null, todoistProjects);
        todoistTasks = ['Error: Request Failed'];
        todoistTaskIds = [''];
        currentTaskIndex = 0;
    });

    req.end();
}

// Function to complete a task
function completeTask(taskId) {
    if (!TODOIST_API_KEY || !taskId) {
        console.error('Cannot complete task: Missing API key or task ID');
        return;
    }

    console.log(`Marking task ${taskId} as complete...`);
    
    const options = {
        method: 'POST',
        hostname: 'api.todoist.com',
        path: `/rest/v2/tasks/${taskId}/close`,
        headers: {
            'Authorization': `Bearer ${TODOIST_API_KEY}`,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        console.log(`Complete task status: ${res.statusCode}`);
        
        if (res.statusCode === 204) {
            console.log('Task completed successfully');
            // Remove the completed task from our arrays
            const index = todoistTaskIds.indexOf(taskId);
            if (index > -1) {
                todoistTaskIds.splice(index, 1);
                todoistTasks.splice(index, 1);
                
                // Adjust current index if needed
                if (currentTaskIndex >= todoistTasks.length) {
                    currentTaskIndex = 0;
                }
                
                // Show next task if available
                if (todoistTasks.length > 0) {
                    mainWindow?.webContents.send('display-task', 
                        todoistTasks[currentTaskIndex], 
                        todoistTaskIds[currentTaskIndex],
                        todoistProjects);
                } else {
                    mainWindow?.webContents.send('display-task', 'No tasks remaining', null, todoistProjects);
                    // Optionally refresh tasks if none remain
                    fetchTodoistTasks(selectedProjectId);
                }
            }
        } else {
            console.error('Failed to complete task');
            // Handle error - maybe show notification to user
        }
    });

    req.on('error', (e) => {
        console.error('Error completing task:', e);
    });

    req.end();
}

// Function to add a new task
function addNewTask(content, projectId) {
    if (!TODOIST_API_KEY || !content) {
        console.error('Cannot add task: Missing API key or task content');
        return;
    }

    console.log(`Adding new task: "${content}"${projectId ? ` to project ${projectId}` : ''}`);
    
    const postData = JSON.stringify({
        content: content,
        project_id: projectId || null
    });
    
    const options = {
        method: 'POST',
        hostname: 'api.todoist.com',
        path: '/rest/v2/tasks',
        headers: {
            'Authorization': `Bearer ${TODOIST_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let resData = '';
        
        res.on('data', (chunk) => {
            resData += chunk;
        });
        
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('Task added successfully');
                // Refresh tasks to include the new one
                fetchTodoistTasks(selectedProjectId);
            } else {
                console.error(`Failed to add task: ${res.statusCode}`);
                console.error('Response:', resData);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Error adding task:', e);
    });

    req.write(postData);
    req.end();
}
// --- End of Todoist Integration ---

// --- REMOVE Hardcoded Tasks ---
/*
const tasks = [
    "Review project proposal",
    "Prepare presentation slides",
    "Schedule team meeting",
    "Update documentation",
    "Deploy staging build",
    "Check email for urgent requests",
    "Take a short break!",
    "Plan tomorrow's priorities"
];
*/
// --- End of Removal ---

let mainWindow; // Reference to the main window object
let boundaryCheckInterval; // To store the interval ID
let tray = null; // Reference to the tray icon
let isClickThrough = false; // Track click-through state

// Variables to track dragging state
let isDragging = false;
let dragMouseStart = null; // { x, y } relative to screen
let dragWindowStartBounds = null; // { x, y, width, height }

// --- Added at top level with other state variables ---
let originalWindowPosition = null; // To store the window position before resizing

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const windowWidth = 350;
    const windowHeight = 160;
    const padding = 20;
    const windowX = width - windowWidth - padding;
    const windowY = height - windowHeight - padding;

    mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: windowX,
        y: windowY,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        // We will control movability manually via right-click drag
        movable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    // --- Make window click-through initially ---
    // Allows clicks to pass through the window to what's underneath.
    // `forward: true` forwards mouse move events even when ignored.
    if (isClickThrough) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }

    // --- Prevent default context menu on right-click ---
    mainWindow.webContents.on('context-menu', (event) => {
        event.preventDefault();
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (boundaryCheckInterval) {
            clearInterval(boundaryCheckInterval); // Clear interval on close
        }
    });

    mainWindow.webContents.on('did-finish-load', () => {
        // Fetch projects first, then tasks
        fetchTodoistProjects(); // Fetch projects to build menu
        // Initial task fetch (all projects)
        fetchTodoistTasks(selectedProjectId); // Use the current filter (initially null)
        // Start boundary check after window loads
        startBoundaryCheck();
    });
}

// --- Screen Boundary Check ---
function checkAndAdjustBounds() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const screenBounds = primaryDisplay.workArea; // Use workArea to avoid taskbars/docks
    const windowBounds = mainWindow.getBounds();

    let newX = windowBounds.x;
    let newY = windowBounds.y;

    // Check horizontal bounds
    if (windowBounds.x < screenBounds.x) {
        newX = screenBounds.x; // Nudge onto screen from left
    } else if (windowBounds.x + windowBounds.width > screenBounds.x + screenBounds.width) {
        newX = screenBounds.x + screenBounds.width - windowBounds.width; // Nudge onto screen from right
    }

    // Check vertical bounds
    if (windowBounds.y < screenBounds.y) {
        newY = screenBounds.y; // Nudge onto screen from top
    } else if (windowBounds.y + windowBounds.height > screenBounds.y + screenBounds.height) {
        newY = screenBounds.y + screenBounds.height - windowBounds.height; // Nudge onto screen from bottom
    }

    // If position needs adjustment, set the new bounds
    // Use Math.round to avoid potential floating point issues with setBounds
    const roundedX = Math.round(newX);
    const roundedY = Math.round(newY);

    if (roundedX !== windowBounds.x || roundedY !== windowBounds.y) {
        console.log(`Adjusting bounds: offscreen detected. New pos: (${roundedX}, ${roundedY})`);
        // Only set bounds if changed to prevent unnecessary updates
         mainWindow.setBounds({
            x: roundedX,
            y: roundedY,
            width: windowBounds.width,
            height: windowBounds.height
        });
    }
}

function startBoundaryCheck() {
    if (boundaryCheckInterval) {
        clearInterval(boundaryCheckInterval); // Clear existing interval if any
    }
    // Check every 10 seconds (10000 milliseconds)
    boundaryCheckInterval = setInterval(checkAndAdjustBounds, 10000);
}


// --- Inter-Process Communication (IPC) ---

// Listen for task requests
ipcMain.on('get-next-task', (event) => {
    console.log('Main: Received get-next-task');
    if (todoistTasks.length > 0) {
        currentTaskIndex = (currentTaskIndex + 1) % todoistTasks.length;
        event.sender.send('display-task', 
            todoistTasks[currentTaskIndex], 
            todoistTaskIds[currentTaskIndex],
            todoistProjects);
    } else {
        // Optionally try fetching again if no tasks are available
        console.log('No tasks available, attempting fetch again.');
        fetchTodoistTasks(); // Attempt to fetch again
        event.sender.send('display-task', 'Fetching tasks...', null, todoistProjects); // Inform renderer
    }
});

// Listen for window resize requests
ipcMain.on('resize-window', (event, height) => {
    console.log(`Main: Received resize-window to height ${height}px`);
    if (mainWindow && !mainWindow.isDestroyed()) {
        // Get current window bounds
        const bounds = mainWindow.getBounds();
        // Set new height while maintaining other dimensions
        mainWindow.setBounds({
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: height
        });
        // Optionally adjust bounds if the window is moved off-screen
        checkAndAdjustBounds();
    }
});

// on save-api-key
ipcMain.on('save-api-key', (event, apiKey) => {
    console.log('Main: Received save-api-key:', apiKey);
    if (apiKey) {
        saveApiKey(apiKey); // Save the API key
    }
    else {
        console.error('API key is missing or empty');
    }
});

// Listen for save position and resize
ipcMain.on('save-position-and-resize', (event, height) => {
    console.log(`Main: Received save-position-and-resize to height ${height}px`);
    if (mainWindow && !mainWindow.isDestroyed()) {
        // Save the current position
        originalWindowPosition = mainWindow.getBounds();
        console.log(`Saving original position: x=${originalWindowPosition.x}, y=${originalWindowPosition.y}`);
        
        // Apply new height
        mainWindow.setBounds({
            x: originalWindowPosition.x,
            y: originalWindowPosition.y,
            width: originalWindowPosition.width,
            height: height
        });

        checkAndAdjustBounds(); // Check bounds after resizing
    }
});

// Listen for restore position and resize
ipcMain.on('restore-position-and-resize', (event) => {
    console.log('Main: Received restore-position-and-resize');
    if (mainWindow && !mainWindow.isDestroyed() && originalWindowPosition) {
        console.log(`Restoring to original position: x=${originalWindowPosition.x}, y=${originalWindowPosition.y}`);
        
        // Restore original position and default height
        mainWindow.setBounds({
            x: originalWindowPosition.x,
            y: originalWindowPosition.y,
            width: originalWindowPosition.width,
            height: 60 // Default height
        });
    }
});

// Listen for complete task requests
ipcMain.on('complete-task', (event, taskId) => {
    console.log('Main: Received complete-task for ID:', taskId);
    if (taskId) {
        completeTask(taskId);
    } else {
        console.error('Task ID missing');
    }
});

// Listen for add task requests
ipcMain.on('add-task', (event, taskData) => {
    console.log('Main: Received add-task:', taskData);
    if (taskData && taskData.content) {
        addNewTask(taskData.content, taskData.projectId);
    } else {
        console.error('Task data missing');
    }
});

// Listen for get projects requests
ipcMain.on('get-projects', (event) => {
    console.log('Main: Received get-projects');
    // Send current projects immediately if available
    if (todoistProjects.length > 0) {
        event.sender.send('projects-list', todoistProjects);
    } else {
        // Try to fetch projects
        fetchTodoistProjects();
    }
});

// Listen for request to prompt for API key
ipcMain.on('request-api-key', (event) => {
    console.log('Main: Received request-api-key');
    promptForApiKey();
});

// --- Drag Handling ---

// Renderer signals start of right-click drag
ipcMain.on('start-drag', (event) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    console.log("Main: Received start-drag");
    isDragging = true;
    // Make the window interactable for dragging
    mainWindow.setIgnoreMouseEvents(false);
    // Get initial mouse position (relative to screen) and window bounds
    dragMouseStart = screen.getCursorScreenPoint();
    dragWindowStartBounds = mainWindow.getBounds();
});

// Renderer sends mouse movement data during drag
ipcMain.on('dragging', (event, mousePos) => {
    if (!isDragging || !mainWindow || mainWindow.isDestroyed() || !dragMouseStart || !dragWindowStartBounds) return;

    // Calculate mouse delta since drag start
    const deltaX = mousePos.x - dragMouseStart.x;
    const deltaY = mousePos.y - dragMouseStart.y;

    // Calculate new window top-left position
    const newX = dragWindowStartBounds.x + deltaX;
    const newY = dragWindowStartBounds.y + deltaY;

     // Use Math.round to ensure integer values for setBounds
    const roundedX = Math.round(newX);
    const roundedY = Math.round(newY);


    // Update window position smoothly
     mainWindow.setBounds({
        x: roundedX,
        y: roundedY,
        width: dragWindowStartBounds.width, // Keep original size
        height: dragWindowStartBounds.height
    });
});

// Renderer signals end of drag (right mouse button up)
ipcMain.on('end-drag', (event) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    console.log("Main: Received end-drag");
    isDragging = false;
    dragMouseStart = null;
    dragWindowStartBounds = null;
    // Make window click-through again *if* it's supposed to be
    if (isClickThrough) {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
    }

    // Optional: Perform a final boundary check immediately after drag
    checkAndAdjustBounds();
});

// --- Tray Icon Setup ---
function createTray() {
    // Destroy existing tray if it exists to rebuild the menu
    if (tray) {
        tray.destroy();
        tray = null;
    }

    const iconPath = path.join(__dirname, 'icon.png');
    try {
        tray = new Tray(iconPath);
    } catch (error) {
        console.error("Failed to create tray icon:", error);
        console.error("Ensure 'icon.png' exists at:", iconPath);
        // Handle the error appropriately, maybe exit or notify user
        return; // Stop if tray creation fails
    }

    // Build project submenu items
    const projectSubmenu = [
        {
            label: 'All Projects',
            type: 'radio', // Use radio buttons for single selection
            checked: selectedProjectId === null, // Checked if no project is selected
            click: () => {
                console.log('Filter set to: All Projects');
                selectedProjectId = null;
                fetchTodoistTasks(selectedProjectId); // Fetch all tasks
            }
        },
        { type: 'separator' }
    ];

    todoistProjects.forEach(project => {
        projectSubmenu.push({
            label: project.name,
            type: 'radio',
            id: `project-${project.id}`, // Optional: Assign unique ID
            checked: selectedProjectId === project.id, // Checked if this project is selected
            click: () => {
                console.log(`Filter set to project: ${project.name} (ID: ${project.id})`);
                selectedProjectId = project.id;
                fetchTodoistTasks(selectedProjectId); // Fetch tasks for this project
            }
        });
    });

    const contextMenuTemplate = [
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
                fetchTodoistTasks(selectedProjectId); // Refresh based on current filter
            }
        },
        {
            label: 'Filter by Project',
            submenu: projectSubmenu // Add the dynamic submenu
        },
        {
            label: 'Toggle Click-Through',
            type: 'checkbox',
            checked: isClickThrough,
            click: () => {
                isClickThrough = !isClickThrough;
                if (mainWindow && !mainWindow.isDestroyed()) {
                    if (!isDragging) {
                        mainWindow.setIgnoreMouseEvents(isClickThrough, { forward: true });
                    }
                    // Update the menu item's checked status visually
                    // Find the item dynamically instead of relying on index
                    const toggleItem = contextMenu.items.find(item => item.label === 'Toggle Click-Through');
                    if (toggleItem) toggleItem.checked = isClickThrough;
                    console.log(`Click-through toggled: ${isClickThrough}`);
                }
            }
        },
        {
            label: 'Clear API Token',
            click: () => {
                console.log('Clearing API token triggered.');
                const choice = dialog.showMessageBoxSync({
                    type: 'question',
                    buttons: ['Yes', 'No'],
                    title: 'Confirm',
                    message: 'Are you sure you want to clear your API token?'
                });
                
                if (choice === 0) { // Yes
                    if (clearApiKey()) {
                        // Rebuild the tray menu after changing token
                        createTray();
                    }
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

    const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);

    tray.setToolTip('Task Overlay App');
    tray.setContextMenu(contextMenu);
}

// --- Application Lifecycle ---

app.whenReady().then(() => {
    createWindow();
    createTray() //is now called after projects are fetched in did-finish-load
    // fetchTodoistProjects(); // Moved to did-finish-load
});

app.on('window-all-closed', () => {
    // On macOS it's common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    // On other platforms, we usually quit directly.
    // We also need to destroy the tray icon.
    if (tray) {
        tray.destroy();
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Ensure tray is destroyed on explicit quit as well
app.on('before-quit', () => {
    if (tray) {
        tray.destroy();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
