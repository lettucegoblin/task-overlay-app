/**
 * Todoist Service - Handles Todoist API interactions
 * 
 * Abstracts all Todoist API interactions and state management.
 * Uses the event bus to notify components of changes.
 */

const https = require('https');
const eventBus = require('./event-bus');
const settingsService = require('./settings-service');

// Event names
const EVENTS = {
  TASKS_LOADED: 'todoist:tasks:loaded',
  PROJECTS_LOADED: 'todoist:projects:loaded',
  TASK_COMPLETED: 'todoist:task:completed',
  TASK_ADDED: 'todoist:task:added',
  API_ERROR: 'todoist:api:error',
  PROJECT_SELECTED: 'todoist:project:selected'
};

// API constants
const API_BASE_URL = 'https://api.todoist.com/rest/v2';

class TodoistService {
  constructor() {
    // State
    this.tasks = [];
    this.taskIds = [];
    this.projects = [];
    this.selectedProjectId = null;
    this.currentTaskIndex = 0;
    this.apiKey = '';
    
    // Load settings
    this._loadSettings();
    
    console.log('TodoistService: Initialized');
  }
  
  // Load settings from the settings service
  _loadSettings() {
    const settings = settingsService.getTodoistSettings();
    
    this.apiKey = settings.apiKey || '';
    this.selectedProjectId = settings.selectedProjectId || null;
    this.currentTaskIndex = settings.currentTaskIndex || 0;
    
    console.log('TodoistService: Loaded settings');
  }
  
  // Save settings to the settings service
  _saveSettings() {
    settingsService.saveTodoistSettings({
      apiKey: this.apiKey,
      selectedProjectId: this.selectedProjectId,
      currentTaskIndex: this.currentTaskIndex
    });
    
    console.log('TodoistService: Saved settings');
  }
  
  // Get the current task (or null if none)
  getCurrentTask() {
    if (this.tasks.length === 0) {
      return null;
    }
    
    return {
      content: this.tasks[this.currentTaskIndex],
      id: this.taskIds[this.currentTaskIndex]
    };
  }
  
  // Move to the next task
  nextTask() {
    if (this.tasks.length === 0) {
      return null;
    }
    
    this.currentTaskIndex = (this.currentTaskIndex + 1) % this.tasks.length;
    
    // Save the current task index
    this._saveSettings();
    
    // Get the current task
    const currentTask = this.getCurrentTask();
    
    // Publish event
    eventBus.publish(EVENTS.TASKS_LOADED, {
      tasks: this.tasks,
      taskIds: this.taskIds,
      currentTaskIndex: this.currentTaskIndex,
      currentTask
    });
    
    console.log('TodoistService: Moved to next task', currentTask);
    
    return currentTask;
  }
  
  // Set the current task index
  setCurrentTaskIndex(index) {
    if (index < 0 || index >= this.tasks.length) {
      console.error(`TodoistService: Invalid task index ${index}`);
      return null;
    }
    
    this.currentTaskIndex = index;
    
    // Save the current task index
    this._saveSettings();
    
    // Get the current task
    const currentTask = this.getCurrentTask();
    
    // Publish event
    eventBus.publish(EVENTS.TASKS_LOADED, {
      tasks: this.tasks,
      taskIds: this.taskIds,
      currentTaskIndex: this.currentTaskIndex,
      currentTask
    });
    
    console.log('TodoistService: Set current task index', index);
    
    return currentTask;
  }
  
  // Check if API key exists
  hasApiKey() {
    return this.apiKey.length > 0;
  }
  
  // Set API key
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    
    // Save settings
    this._saveSettings();
    
    console.log('TodoistService: Set API key');
    
    // Attempt to fetch projects and tasks to verify the key
    this.fetchProjects();
  }
  
  // Clear API key
  clearApiKey() {
    this.apiKey = '';
    this.tasks = [];
    this.taskIds = [];
    this.projects = [];
    this.selectedProjectId = null;
    this.currentTaskIndex = 0;
    
    // Save settings
    this._saveSettings();
    
    // Publish events
    eventBus.publish(EVENTS.TASKS_LOADED, {
      tasks: [],
      taskIds: [],
      currentTaskIndex: 0,
      currentTask: null
    });
    
    eventBus.publish(EVENTS.PROJECTS_LOADED, {
      projects: []
    });
    
    console.log('TodoistService: Cleared API key and data');
  }
  
  // Select a project
  selectProject(projectId) {
    this.selectedProjectId = projectId;
    
    // Save settings
    this._saveSettings();
    
    // Publish event
    eventBus.publish(EVENTS.PROJECT_SELECTED, {
      projectId: this.selectedProjectId
    });
    
    console.log(`TodoistService: Selected project ${projectId}`);
    
    // Fetch tasks for this project
    this.fetchTasks();
  }
  
  // Fetch projects from Todoist
  fetchProjects() {
    if (!this.hasApiKey()) {
      console.error('TodoistService: No API key available');
      eventBus.publish(EVENTS.API_ERROR, {
        message: 'API key missing',
        code: 'NO_API_KEY'
      });
      return;
    }
    
    const options = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    };
    
    console.log('TodoistService: Fetching projects from Todoist...');
    
    const req = https.get(`${API_BASE_URL}/projects`, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => { 
        data += chunk; 
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            this.projects = JSON.parse(data);
            
            console.log(`TodoistService: Fetched ${this.projects.length} projects`);
            
            // Publish event
            eventBus.publish(EVENTS.PROJECTS_LOADED, {
              projects: this.projects
            });
            
            // Fetch tasks if we have a selected project
            this.fetchTasks();
          } catch (e) {
            console.error('TodoistService: Error parsing projects response', e);
            
            this.projects = [];
            
            // Publish error event
            eventBus.publish(EVENTS.API_ERROR, {
              message: 'Failed to parse projects response',
              code: 'PARSE_ERROR',
              error: e
            });
          }
        } else {
          console.error(`TodoistService: Error fetching projects: Status Code ${res.statusCode}`, data);
          
          this.projects = [];
          
          // Publish error event
          eventBus.publish(EVENTS.API_ERROR, {
            message: `Failed to fetch projects: ${res.statusCode}`,
            code: 'API_ERROR',
            status: res.statusCode,
            response: data
          });
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('TodoistService: Error making request to Todoist for projects', e);
      
      this.projects = [];
      
      // Publish error event
      eventBus.publish(EVENTS.API_ERROR, {
        message: 'Network error fetching projects',
        code: 'NETWORK_ERROR',
        error: e
      });
    });
    
    req.end();
  }
  
  // Fetch tasks from Todoist
  fetchTasks() {
    if (!this.hasApiKey()) {
      console.error('TodoistService: No API key available');
      eventBus.publish(EVENTS.API_ERROR, {
        message: 'API key missing',
        code: 'NO_API_KEY'
      });
      return;
    }
    
    let apiUrl = `${API_BASE_URL}/tasks`;
    
    // Filter by project if selected
    if (this.selectedProjectId) {
      apiUrl += `?project_id=${this.selectedProjectId}`;
      console.log(`TodoistService: Fetching tasks for project ID: ${this.selectedProjectId}...`);
    } else {
      console.log('TodoistService: Fetching all tasks from Todoist...');
    }
    
    const options = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
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
            this.tasks = fetchedTasks.map(task => task.content);
            this.taskIds = fetchedTasks.map(task => task.id);
            
            // Reset task index if needed
            if (this.currentTaskIndex >= this.tasks.length) {
              this.currentTaskIndex = 0;
            }
            
            console.log(`TodoistService: Fetched ${this.tasks.length} tasks`);
            
            // Get the current task
            const currentTask = this.getCurrentTask();
            
            // Publish event
            eventBus.publish(EVENTS.TASKS_LOADED, {
              tasks: this.tasks,
              taskIds: this.taskIds,
              currentTaskIndex: this.currentTaskIndex,
              currentTask
            });
            
            // Save settings
            this._saveSettings();
          } catch (e) {
            console.error('TodoistService: Error parsing tasks response', e);
            
            this.tasks = [];
            this.taskIds = [];
            
            // Publish error event
            eventBus.publish(EVENTS.API_ERROR, {
              message: 'Failed to parse tasks response',
              code: 'PARSE_ERROR',
              error: e
            });
            
            // Publish empty tasks event
            eventBus.publish(EVENTS.TASKS_LOADED, {
              tasks: [],
              taskIds: [],
              currentTaskIndex: 0,
              currentTask: null
            });
          }
        } else {
          console.error(`TodoistService: Error fetching tasks: Status Code ${res.statusCode}`, data);
          
          this.tasks = [];
          this.taskIds = [];
          
          // Publish error event
          eventBus.publish(EVENTS.API_ERROR, {
            message: `Failed to fetch tasks: ${res.statusCode}`,
            code: 'API_ERROR',
            status: res.statusCode,
            response: data
          });
          
          // Publish empty tasks event
          eventBus.publish(EVENTS.TASKS_LOADED, {
            tasks: [],
            taskIds: [],
            currentTaskIndex: 0,
            currentTask: null
          });
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('TodoistService: Error making request to Todoist for tasks', e);
      
      this.tasks = [];
      this.taskIds = [];
      
      // Publish error event
      eventBus.publish(EVENTS.API_ERROR, {
        message: 'Network error fetching tasks',
        code: 'NETWORK_ERROR',
        error: e
      });
      
      // Publish empty tasks event
      eventBus.publish(EVENTS.TASKS_LOADED, {
        tasks: [],
        taskIds: [],
        currentTaskIndex: 0,
        currentTask: null
      });
    });
    
    req.end();
  }
  
  // Complete a task
  completeTask(taskId) {
    if (!this.hasApiKey()) {
      console.error('TodoistService: No API key available');
      eventBus.publish(EVENTS.API_ERROR, {
        message: 'API key missing',
        code: 'NO_API_KEY'
      });
      return;
    }
    
    if (!taskId) {
      console.error('TodoistService: No task ID provided');
      return;
    }
    
    console.log(`TodoistService: Marking task ${taskId} as complete...`);
    
    const options = {
      method: 'POST',
      hostname: 'api.todoist.com',
      path: `/rest/v2/tasks/${taskId}/close`,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      console.log(`TodoistService: Complete task status: ${res.statusCode}`);
      
      if (res.statusCode === 204) {
        console.log('TodoistService: Task completed successfully');
        
        // Remove the completed task from our arrays
        const index = this.taskIds.indexOf(taskId);
        if (index > -1) {
          this.taskIds.splice(index, 1);
          this.tasks.splice(index, 1);
          
          // Adjust current index if needed
          if (this.currentTaskIndex >= this.tasks.length) {
            this.currentTaskIndex = 0;
          }
          
          // Publish event
          eventBus.publish(EVENTS.TASK_COMPLETED, { taskId });
          
          // Also publish updated tasks
          const currentTask = this.getCurrentTask();
          eventBus.publish(EVENTS.TASKS_LOADED, {
            tasks: this.tasks,
            taskIds: this.taskIds,
            currentTaskIndex: this.currentTaskIndex,
            currentTask
          });
          
          // Save settings
          this._saveSettings();
        }
      } else {
        console.error('TodoistService: Failed to complete task');
        
        // Publish error event
        eventBus.publish(EVENTS.API_ERROR, {
          message: 'Failed to complete task',
          code: 'API_ERROR',
          status: res.statusCode
        });
      }
    });
    
    req.on('error', (e) => {
      console.error('TodoistService: Error completing task', e);
      
      // Publish error event
      eventBus.publish(EVENTS.API_ERROR, {
        message: 'Network error completing task',
        code: 'NETWORK_ERROR',
        error: e
      });
    });
    
    req.end();
  }
  
  // Add a new task
  addTask(content, projectId) {
    if (!this.hasApiKey()) {
      console.error('TodoistService: No API key available');
      eventBus.publish(EVENTS.API_ERROR, {
        message: 'API key missing',
        code: 'NO_API_KEY'
      });
      return;
    }
    
    if (!content) {
      console.error('TodoistService: No task content provided');
      return;
    }
    
    console.log(`TodoistService: Adding new task "${content}"${projectId ? ` to project ${projectId}` : ''}`);
    
    const postData = JSON.stringify({
      content: content,
      project_id: projectId || null
    });
    
    const options = {
      method: 'POST',
      hostname: 'api.todoist.com',
      path: '/rest/v2/tasks',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
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
          console.log('TodoistService: Task added successfully');
          
          // Publish event
          eventBus.publish(EVENTS.TASK_ADDED, { content, projectId });
          
          // Refresh tasks to include the new one
          this.fetchTasks();
        } else {
          console.error(`TodoistService: Failed to add task: ${res.statusCode}`, resData);
          
          // Publish error event
          eventBus.publish(EVENTS.API_ERROR, {
            message: 'Failed to add task',
            code: 'API_ERROR',
            status: res.statusCode,
            response: resData
          });
        }
      });
    });
    
    req.on('error', (e) => {
      console.error('TodoistService: Error adding task', e);
      
      // Publish error event
      eventBus.publish(EVENTS.API_ERROR, {
        message: 'Network error adding task',
        code: 'NETWORK_ERROR',
        error: e
      });
    });
    
    req.write(postData);
    req.end();
  }
  
  // Get events
  getEvents() {
    return { ...EVENTS };
  }
}

// Export a singleton instance
const todoistService = new TodoistService();
module.exports = todoistService;