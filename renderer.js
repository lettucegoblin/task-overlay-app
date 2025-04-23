// renderer.js
const taskContainer = document.getElementById('task-container');
const completeTaskBtn = document.getElementById('complete-task');
const addTaskBtn = document.getElementById('add-task');
const modal = document.getElementById('add-task-modal');
const closeModal = document.querySelector('.close-modal');
const newTaskInput = document.getElementById('new-task-content');
const projectSelect = document.getElementById('project-select');
const submitNewTaskBtn = document.getElementById('submit-new-task');

// --- State variables ---
let isRightMouseDown = false; // Tracks if the right mouse button is currently pressed
let lastMousePos = null; // Stores the last known mouse position {x, y} relative to screen
let currentTaskId = null; // Stores the ID of the currently displayed task
const DEFAULT_HEIGHT = 60; // Default window height
const EXPANDED_HEIGHT = 260; // Expanded window height when adding a task

// --- Initialize projects dropdown ---
function populateProjectsDropdown(projects) {
    // Clear all options except the first one
    while (projectSelect.options.length > 1) {
        projectSelect.remove(1);
    }

    // Add each project as an option
    if (projects && projects.length) {
        projects.forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            projectSelect.appendChild(option);
        });
    }
}

if (window.electronAPI) {
    console.log('Renderer: electronAPI is available.');

    // --- Task Display Listener ---
    window.electronAPI.onDisplayTask((taskText, taskId, projectsList) => {
        console.log("Renderer received task:", taskText, "ID:", taskId);
        
        // Get the button column
        const buttonColumn = document.getElementById('button-column');
        
        // Check if this is the API key missing message
        if (taskId === 'api-key-missing') {
            // Hide the button column until API key is set
            buttonColumn.style.display = 'none';
            
            // Replace text with an inline API key input
            taskContainer.innerHTML = `
                <div style="width: 100%;">
                    <input type="text" id="apiKeyInput" placeholder="Enter your Todoist API key" 
                        style="width: 80%; padding: 8px; background-color: rgba(60, 60, 80, 0.8); 
                        border: 1px solid rgba(80, 80, 100, 0.8); border-radius: 5px; color: white;">
                    <button id="saveApiKeyBtn" 
                        style="padding: 8px; background-color: rgba(50, 130, 50, 0.9); border: none; 
                        border-radius: 5px; color: white; cursor: pointer; margin-left: 5px;">Save</button>
                </div>
                <div style="font-size: 12px; margin-top: 5px;">
                    Find your API key in Todoist settings → Integrations
                </div>
            `;
            
            // Make sure the container doesn't act as a clickable element
            taskContainer.style.cursor = 'default';
            
            // Add event listeners to the newly created elements
            document.getElementById('saveApiKeyBtn').addEventListener('click', saveApiKey);
            document.getElementById('apiKeyInput').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    saveApiKey();
                }
            });
            
            // Store the API key missing state
            currentTaskId = 'api-key-missing';
            
            // Disable the complete task button as there's no real task
            completeTaskBtn.disabled = true;
            completeTaskBtn.title = "API key needed";
        } else {
            // Show the button column as API key is now set
            buttonColumn.style.display = 'flex';
            
            // Regular task display
            taskContainer.textContent = taskText || 'No task.';
            currentTaskId = taskId;
            
            // Restore cursor for task cycling
            taskContainer.style.cursor = 'pointer';
            
            // Update complete button state for normal tasks
            if (taskId) {
                completeTaskBtn.disabled = false;
                completeTaskBtn.title = "Mark task as complete";
            } else {
                completeTaskBtn.disabled = true;
                completeTaskBtn.title = "No active task";
            }
        }

        // Update projects dropdown if we received a projects list
        if (projectsList) {
            populateProjectsDropdown(projectsList);
        }
    });

    // Function to save API key from inline input
    function saveApiKey() {
        const apiKey = document.getElementById('apiKeyInput').value.trim();
        if (apiKey) {
            console.log("Renderer: Saving API key");
            window.electronAPI.saveApiKey(apiKey);
            // Replace the input with a loading message
            taskContainer.textContent = "Saving API key and loading tasks...";
        }
    }

    // --- Projects List Listener ---
    window.electronAPI.onProjectsReceived((projectsList) => {
        console.log("Renderer received projects list:", projectsList);
        populateProjectsDropdown(projectsList);
    });

    // --- Get initial projects list ---
    window.electronAPI.getProjects();

    // --- Click Listener for Task Cycling (LEFT CLICK ONLY) ---
    taskContainer.addEventListener('click', (event) => {
        // Skip click handling if we're dealing with the API key input
        if (currentTaskId === 'api-key-missing') {
            return; // Do nothing when showing the API key input
        }
        
        // Check if it was the primary button (usually left button)
        if (event.button === 0) {
            console.log("Renderer: Left-click detected, requesting next task.");
            window.electronAPI.getNextTask();
        }
    });

    // --- Complete Task Button ---
    completeTaskBtn.addEventListener('click', () => {
        if (currentTaskId) {
            console.log("Renderer: Complete task button clicked for ID:", currentTaskId);
            window.electronAPI.completeTask(currentTaskId);
        }
    });

    // --- Add Task Button and Modal ---
    addTaskBtn.addEventListener('click', () => {
        modal.style.display = 'block';
        newTaskInput.focus();
        
        // Save position and resize the window to the expanded height
        window.electronAPI.savePositionAndResize(EXPANDED_HEIGHT);
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        
        // Restore to original position and default height
        window.electronAPI.restorePositionAndResize();
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            
            // Restore to original position and default height
            window.electronAPI.restorePositionAndResize();
        }
    });

    // Submit new task
    submitNewTaskBtn.addEventListener('click', () => {
        const content = newTaskInput.value.trim();
        const projectId = projectSelect.value;
        
        if (content) {
            console.log("Renderer: Adding new task:", content, "to project:", projectId || "default");
            window.electronAPI.addNewTask(content, projectId);
            newTaskInput.value = '';
            modal.style.display = 'none';
            
            // Restore to original position and default height
            window.electronAPI.restorePositionAndResize();
        }
    });

    // Submit on Enter key in the input field
    newTaskInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            submitNewTaskBtn.click();
        }
    });

    // --- Right-Click Drag Handling ---

    // Prevent the default context menu on right-click within the container
    taskContainer.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    // Listen for mouse down events on the container
    taskContainer.addEventListener('mousedown', (event) => {
        // Check if the right mouse button was pressed (button code 2)
        if (event.button === 2) {
            console.log("Renderer: Right mouse down detected.");
            isRightMouseDown = true;
            // We need mouse position relative to the screen, not the window
            // Note: event.screenX/Y might be needed if clientX/Y doesn't work as expected across platforms/setups
            lastMousePos = { x: event.screenX, y: event.screenY };
            // Tell the main process to prepare for dragging
            window.electronAPI.startDrag();
            // Optional: Add a visual cue, like changing cursor or style
            taskContainer.style.cursor = 'grabbing';
        }
    });

    // Listen for mouse move events *globally* on the window
    // This ensures dragging continues even if the cursor leaves the task container briefly
    window.addEventListener('mousemove', (event) => {
        // Only proceed if the right mouse button is currently held down
        if (isRightMouseDown) {
            // Get current mouse position relative to screen
            const currentMousePos = { x: event.screenX, y: event.screenY };
             // Send the *current* screen coordinates to the main process
            window.electronAPI.sendDragData(currentMousePos);
             // Update last known position for potential future delta calculations if needed
            lastMousePos = currentMousePos;
        }
    });

    // Listen for mouse up events *globally* on the window
    // This ensures the drag ends even if the mouse button is released outside the container
    window.addEventListener('mouseup', (event) => {
        // Check if the right mouse button was released
        if (event.button === 2 && isRightMouseDown) {
            console.log("Renderer: Right mouse up detected.");
            isRightMouseDown = false;
            lastMousePos = null;
            // Tell the main process that dragging has finished
            window.electronAPI.endDrag();
            // Reset visual cue
            taskContainer.style.cursor = 'pointer'; // Or back to 'default' if preferred
        }
    });

    // Initial text
    taskContainer.textContent = 'Initializing...';

} else {
    console.error('Renderer: electronAPI is not available. Preload script might have failed.');
    taskContainer.textContent = 'Error: Could not load API.';
}
