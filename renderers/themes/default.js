/**
 * Default Theme - Renderer implementation
 * 
 * Implements the default minimal theme UI.
 */

class DefaultThemeRenderer {
  constructor() {
    // Theme data
    this.name = 'default';
    this.displayName = 'Minimal';
    
    // Theme API reference
    this.themeAPI = null;
    
    // DOM elements
    this.container = null;
    this.elements = {};
    
    // State
    this.currentTask = null;
    this.pomodoroState = null;
    
    // Event listeners
    this.listeners = [];
    
    console.log('DefaultThemeRenderer: Constructed');
  }
  
  /**
   * Initialize the theme renderer
   * @param {HTMLElement} container - Container element
   * @param {Object} themeAPI - ThemeAPI instance
   */
  async initialize(container, themeAPI) {
    console.log('DefaultThemeRenderer: Initializing');
    
    this.container = container;
    this.themeAPI = themeAPI;
    
    // Create theme UI
    this._createUI();
    
    // Setup event listeners
    this._setupEventListeners();
    
    // Apply theme settings
    this._applyThemeSettings();
    
    // Request initial data
    this.themeAPI.nextTask();
    
    console.log('DefaultThemeRenderer: Initialized');
  }
  
  /**
   * Handle events from the main process
   * @param {string} eventName - Event name
   * @param {any} data - Event data
   */
  onMainEvent(eventName, data) {
    console.log(`DefaultThemeRenderer: Received main event ${eventName}`, data);
    
    switch (eventName) {
      case 'task:updated':
        this._updateTaskDisplay(data);
        break;
        
      case 'task:completed':
        this._handleTaskCompletion(data);
        break;
        
      case 'pomodoro:tick':
        this._updateTimerDisplay(data);
        break;
        
      case 'pomodoro:completed':
        this._handlePomodoroCompletion(data);
        break;
        
      case 'pomodoro:work-started':
        this._setWorkMode(data);
        break;
        
      case 'pomodoro:break-started':
        this._setBreakMode(data);
        break;
    }
  }
  
  /**
   * Create the theme UI
   */
  _createUI() {
    // Create app container with task and button column
    this.container.innerHTML = `
      <div class="app-container">
        <div id="task-container" title="Click to see next task">
          Loading tasks...
        </div>
        <div id="button-column">
          <!-- Pomodoro button -->
          <button id="pomodoro-button" class="task-button" title="Start/pause Pomodoro timer">▶</button>
          <!-- Timer display -->
          <div id="timer-display" title="Time remaining">--:--</div>
          <!-- Complete task button -->
          <button id="complete-task" class="task-button" title="Mark task as complete">✓</button>
          <!-- Add task button -->
          <button id="add-task" class="task-button" title="Add new task">+</button>
        </div>
      </div>
      
      <div id="add-task-modal" class="modal">
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h3>Add New Task</h3>
          <input type="text" id="new-task-content" placeholder="Enter task...">
          <select id="project-select">
            <option value="">Select Project...</option>
          </select>
          <button id="submit-new-task">Add Task</button>
        </div>
      </div>
    `;
    
    // Store references to elements
    this.elements = {
      taskContainer: document.getElementById('task-container'),
      completeTaskBtn: document.getElementById('complete-task'),
      addTaskBtn: document.getElementById('add-task'),
      pomodoroBtn: document.getElementById('pomodoro-button'),
      timerDisplay: document.getElementById('timer-display'),
      modal: document.getElementById('add-task-modal'),
      closeModal: document.querySelector('.close-modal'),
      newTaskInput: document.getElementById('new-task-content'),
      projectSelect: document.getElementById('project-select'),
      submitNewTaskBtn: document.getElementById('submit-new-task')
    };
    
    // Disable complete button initially
    this.elements.completeTaskBtn.disabled = true;
    
    // Populate projects dropdown if available
    this._populateProjectsDropdown(this.themeAPI.getProjects());
  }
  
  /**
   * Set up event listeners
   */
  _setupEventListeners() {
    // Task container click (for next task)
    this._addListener(this.elements.taskContainer, 'click', (event) => {
      // Only handle left-clicks
      if (event.button === 0) {
        this.themeAPI.nextTask();
      }
    });
    
    // Complete task button
    this._addListener(this.elements.completeTaskBtn, 'click', () => {
      this.themeAPI.completeTask();
    });
    
    // Add task button
    this._addListener(this.elements.addTaskBtn, 'click', () => {
      this._showAddTaskModal();
    });
    
    // Close modal button
    this._addListener(this.elements.closeModal, 'click', () => {
      this._hideAddTaskModal();
    });
    
    // Click outside modal to close
    this._addListener(window, 'click', (event) => {
      if (event.target === this.elements.modal) {
        this._hideAddTaskModal();
      }
    });
    
    // Submit new task button
    this._addListener(this.elements.submitNewTaskBtn, 'click', () => {
      this._submitNewTask();
    });
    
    // Submit on Enter key
    this._addListener(this.elements.newTaskInput, 'keydown', (event) => {
      if (event.key === 'Enter') {
        this._submitNewTask();
      }
    });
    
    // Pomodoro button
    this._addListener(this.elements.pomodoroBtn, 'click', () => {
      this.themeAPI.togglePomodoro();
    });
    
    // Prevent context menu on right-click
    this._addListener(this.elements.taskContainer, 'contextmenu', (event) => {
      event.preventDefault();
    });
    
    // Right-click drag handling for task container
    this._setupDragHandling();
  }
  
  /**
   * Set up drag handling for the task container
   */
  _setupDragHandling() {
    let isRightMouseDown = false;
    let lastMousePos = null;
    
    // Mouse down
    this._addListener(this.elements.taskContainer, 'mousedown', (event) => {
      // Only handle right-clicks
      if (event.button === 2) {
        isRightMouseDown = true;
        lastMousePos = { x: event.screenX, y: event.screenY };
        
        // Tell main process to prepare for dragging
        window.electronAPI.startDrag();
        
        // Change cursor
        this.elements.taskContainer.style.cursor = 'grabbing';
      }
    });
    
    // Mouse move
    this._addListener(window, 'mousemove', (event) => {
      if (isRightMouseDown) {
        const currentMousePos = { x: event.screenX, y: event.screenY };
        window.electronAPI.sendDragData(currentMousePos);
        lastMousePos = currentMousePos;
      }
    });
    
    // Mouse up
    this._addListener(window, 'mouseup', (event) => {
      if (event.button === 2 && isRightMouseDown) {
        isRightMouseDown = false;
        lastMousePos = null;
        
        // Tell main process that dragging has finished
        window.electronAPI.endDrag();
        
        // Reset cursor
        this.elements.taskContainer.style.cursor = 'pointer';
      }
    });
  }
  
  /**
   * Apply theme settings
   */
  _applyThemeSettings() {
    const settings = this.themeAPI.themeSettings;
    
    // Create CSS variables
    this.themeAPI.createCSSVariables({
      'background-color': settings.backgroundColor,
      'text-color': settings.textColor,
      'work-background-color': settings.workBackgroundColor,
      'break-background-color': settings.breakBackgroundColor
    });
    
    console.log('DefaultThemeRenderer: Applied theme settings');
  }
  
  /**
   * Update task display
   * @param {Object} task - Task data
   */
  _updateTaskDisplay(task) {
    this.currentTask = task;
    
    // Update task container
    if (this.elements.taskContainer) {
      this.elements.taskContainer.textContent = task.content || 'No tasks available.';
    }
    
    // Update complete button state
    if (this.elements.completeTaskBtn) {
      if (task.id) {
        this.elements.completeTaskBtn.disabled = false;
        this.elements.completeTaskBtn.title = 'Mark task as complete';
      } else {
        this.elements.completeTaskBtn.disabled = true;
        this.elements.completeTaskBtn.title = 'No active task';
      }
    }
  }
  
  /**
   * Handle task completion
   * @param {Object} data - Task completion data
   */
  _handleTaskCompletion(data) {
    // Show completion notification
    this.themeAPI.showNotification('Task Completed', 'Great job!');
  }
  
  /**
   * Update timer display
   * @param {Object} state - Pomodoro state
   */
  _updateTimerDisplay(state) {
    this.pomodoroState = state;
    
    // Update timer display
    if (this.elements.timerDisplay) {
      this.elements.timerDisplay.textContent = this.themeAPI.formatTime(state.timeRemaining);
    }
    
    // Update button appearance
    if (this.elements.pomodoroBtn) {
      if (state.isActive) {
        this.elements.pomodoroBtn.textContent = '⏸'; // Pause symbol
        this.elements.pomodoroBtn.classList.add('active');
        this.elements.pomodoroBtn.title = 'Pause Pomodoro timer';
      } else {
        this.elements.pomodoroBtn.textContent = '▶'; // Play symbol
        this.elements.pomodoroBtn.classList.remove('active');
        this.elements.pomodoroBtn.title = 'Start Pomodoro timer';
      }
    }
  }
  
  /**
   * Handle Pomodoro completion
   * @param {Object} data - Completion data
   */
  _handlePomodoroCompletion(data) {
    // Show notification
    if (data.wasBreak) {
      this.themeAPI.showNotification('Break Completed', 'Back to work!');
    } else {
      this.themeAPI.showNotification('Work Completed', 'Time for a break!');
    }
    
    // If not auto-starting, show a "Start Next Phase" button
    if (!this.themeAPI.themeSettings.autoStartNextPhase) {
      this._showStartNextPhaseButton(data.wasBreak);
    }
  }
  
  /**
   * Show a button to start the next Pomodoro phase
   * @param {boolean} wasBreak - Whether the completed phase was a break
   */
  _showStartNextPhaseButton(wasBreak) {
    // Create the button if it doesn't exist
    let nextPhaseBtn = document.getElementById('next-phase-btn');
    
    if (!nextPhaseBtn) {
      nextPhaseBtn = document.createElement('button');
      nextPhaseBtn.id = 'next-phase-btn';
      nextPhaseBtn.className = 'next-phase-button';
      nextPhaseBtn.textContent = wasBreak ? 'Start Work' : 'Start Break';
      
      // Position near the timer
      const timerRect = this.elements.timerDisplay.getBoundingClientRect();
      nextPhaseBtn.style.position = 'absolute';
      nextPhaseBtn.style.top = `${timerRect.bottom + 10}px`;
      nextPhaseBtn.style.left = `${timerRect.left}px`;
      
      // Add click handler
      nextPhaseBtn.addEventListener('click', () => {
        this.themeAPI.startNextPhase();
        nextPhaseBtn.remove();
      });
      
      // Add to document
      document.body.appendChild(nextPhaseBtn);
    }
  }
  
  /**
   * Set work mode
   * @param {Object} state - Pomodoro state
   */
  _setWorkMode(state) {
    // Remove any class for break mode
    document.body.classList.remove('break-mode');
    
    // Add class for work mode
    document.body.classList.add('work-mode');
    
    // Update state
    this.pomodoroState = state;
    
    // Update timer display
    this._updateTimerDisplay(state);
  }
  
  /**
   * Set break mode
   * @param {Object} state - Pomodoro state
   */
  _setBreakMode(state) {
    // Remove any class for work mode
    document.body.classList.remove('work-mode');
    
    // Add class for break mode
    document.body.classList.add('break-mode');
    
    // Update state
    this.pomodoroState = state;
    
    // Update timer display
    this._updateTimerDisplay(state);
  }
  
  /**
   * Show the add task modal
   */
  _showAddTaskModal() {
    if (this.elements.modal) {
      this.elements.modal.style.display = 'block';
      this.elements.newTaskInput.focus();
      
      // Resize window for modal
      window.electronAPI.savePositionAndResize(260); // Height for modal
    }
  }
  
  /**
   * Hide the add task modal
   */
  _hideAddTaskModal() {
    if (this.elements.modal) {
      this.elements.modal.style.display = 'none';
      this.elements.newTaskInput.value = '';
      
      // Restore window size
      window.electronAPI.restorePositionAndResize();
    }
  }
  
  /**
   * Submit a new task
   */
  _submitNewTask() {
    const content = this.elements.newTaskInput.value.trim();
    const projectId = this.elements.projectSelect.value;
    
    if (content) {
      this.themeAPI.addTask(content, projectId);
      this._hideAddTaskModal();
    }
  }
  
  /**
   * Populate the projects dropdown
   * @param {Array} projects - Projects list
   */
  _populateProjectsDropdown(projects) {
    if (!this.elements.projectSelect) return;
    
    // Clear existing options except the first
    while (this.elements.projectSelect.options.length > 1) {
      this.elements.projectSelect.remove(1);
    }
    
    // Add project options
    if (projects && projects.length) {
      projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        this.elements.projectSelect.appendChild(option);
      });
    }
  }
  
  /**
   * Add an event listener and store it for cleanup
   * @param {Element} element - DOM element
   * @param {string} event - Event name
   * @param {Function} callback - Event callback
   */
  _addListener(element, event, callback) {
    element.addEventListener(event, callback);
    
    // Store for cleanup
    this.listeners.push({ element, event, callback });
  }
  
  /**
   * Clean up event listeners
   */
  cleanup() {
    // Remove all event listeners
    this.listeners.forEach(({ element, event, callback }) => {
      element.removeEventListener(event, callback);
    });
    
    this.listeners = [];
    
    console.log('DefaultThemeRenderer: Cleaned up');
  }
}

// Export the theme renderer
export default DefaultThemeRenderer;