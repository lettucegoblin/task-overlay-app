/**
 * Game Theme Template
 * 
 * Base class for game-like themes that visualize productivity as a game.
 * Provides common functionality for game-based theme implementations.
 */

const BaseTheme = require('./base-theme');
const path = require('path');

class GameThemeTemplate extends BaseTheme {
  constructor(themeManager) {
    super(themeManager);
    
    this.name = 'game-template';
    this.displayName = 'Game Template';
    this.description = 'Template for game-like themes';
    
    // Game state
    this.gameState = {
      score: 0,
      level: 1,
      character: {
        hp: 100,
        maxHp: 100,
        exp: 0,
        nextLevelExp: 100
      },
      assets: [],
      inventory: []
    };
    
    // Animation state
    this.animationState = {
      currentAnimation: null,
      isAnimating: false,
      animationFrameId: null
    };
    
    // Settings
    this.settings = {
      soundEnabled: true,
      animationsEnabled: true,
      difficultySetting: 'normal',
      gameSpeed: 1.0,
      showTutorial: true
    };
    
    // Timestamp tracking
    this.lastUpdateTime = Date.now();
    this.gameTime = 0;
    
    // Performance tracking
    this.tasksCompleted = 0;
    this.pomodorosCompleted = 0;
    this.streakDays = 0;
  }
  
  /**
   * Initialize the game theme
   */
  async initialize() {
    console.log(`GameTheme: Initializing "${this.name}" theme`);
    
    // Load game assets
    await this.loadAssets();
    
    // Load game-specific styles
    await this.loadStyles();
    
    // Initialize game systems
    this._initializeGameSystems();
    
    return Promise.resolve();
  }
  
  /**
   * Activate the game theme
   */
  async activate() {
    console.log(`GameTheme: Activating "${this.name}" theme`);
    
    // Expand the window to game dimensions
    window.electronAPI.savePositionAndResize(350);
    
    // Replace the main container with game UI
    this._createGameInterface();
    
    // Start the game loop
    this._startGameLoop();
    
    // Setup event listeners
    this._setupEventListeners();
    
    // Add theme class to body
    document.body.classList.add(`theme-${this.name}`);
    
    return Promise.resolve();
  }
  
  /**
   * Deactivate the game theme
   */
  async deactivate() {
    console.log(`GameTheme: Deactivating "${this.name}" theme`);
    
    // Stop the game loop
    this._stopGameLoop();
    
    // Remove game interface
    this._removeGameInterface();
    
    // Restore window size
    window.electronAPI.restorePositionAndResize();
    
    // Remove theme class from body
    document.body.classList.remove(`theme-${this.name}`);
    
    // Call parent deactivate to clean up event listeners
    await super.deactivate();
    
    return Promise.resolve();
  }
  
  /**
   * Load theme-specific styles
   */
  async loadStyles() {
    console.log(`GameTheme: Loading styles for "${this.name}" theme`);
    
    // Create a style element for the game theme
    const styleElement = document.createElement('style');
    styleElement.id = `${this.name}-theme-styles`;
    
    // Add theme-specific CSS
    styleElement.textContent = this._getThemeCSS();
    
    // Add to document
    document.head.appendChild(styleElement);
    
    return Promise.resolve();
  }
  
  /**
   * Unload theme-specific styles
   */
  async unloadStyles() {
    console.log(`GameTheme: Unloading styles for "${this.name}" theme`);
    
    // Remove the theme style element
    const styleElement = document.getElementById(`${this.name}-theme-styles`);
    if (styleElement) {
      styleElement.remove();
    }
    
    return Promise.resolve();
  }
  
  /**
   * Load game assets
   */
  async loadAssets() {
    console.log(`GameTheme: Loading assets for "${this.name}" theme`);
    
    // Implementation should load sprites, sounds, etc.
    
    return Promise.resolve();
  }
  
  /**
   * Display a task in the game context
   */
  displayTask(task) {
    console.log(`GameTheme: Displaying task in game`, task);
    
    // Implementation should update the game UI with the task
    
    // Store current task ID for completion
    if (task) {
      this.currentTaskId = task.id;
    } else {
      this.currentTaskId = null;
    }
  }
  
  /**
   * Complete a task with game feedback
   */
  completeTask(task) {
    console.log(`GameTheme: Completing task in game`, task);
    
    // Increment counter
    this.tasksCompleted++;
    
    // Add points to score
    this._addPoints(100);
    
    // Add experience to character
    this._addExperience(25);
    
    // Play completion animation
    this._playAnimation('taskComplete');
    
    // Play sound effect
    this._playSound('taskComplete');
    
    // Show reward notification
    this.showNotification({
      title: 'Task Complete!',
      body: '+100 points, +25 XP'
    });
  }
  
  /**
   * Update Pomodoro state in game context
   */
  updatePomodoro(state) {
    console.log(`GameTheme: Updating Pomodoro in game`, state);
    
    // Update timer display in game UI
    const timerElement = document.getElementById('game-timer');
    if (timerElement) {
      timerElement.textContent = this._formatTime(state.timeRemaining);
    }
    
    // Update timer visual indicators
    this._updateTimerVisuals(state);
  }
  
  /**
   * Start a work period in the game
   */
  startWorkPeriod(state) {
    console.log(`GameTheme: Starting work period in game`, state);
    
    // Play transition animation
    this._playAnimation('startWork');
    
    // Update game state for work mode
    this._setGameMode('work');
  }
  
  /**
   * Start a break period in the game
   */
  startBreakPeriod(state) {
    console.log(`GameTheme: Starting break period in game`, state);
    
    // Increment counter
    this.pomodorosCompleted++;
    
    // Add points to score
    this._addPoints(250);
    
    // Add experience to character
    this._addExperience(50);
    
    // Play transition animation
    this._playAnimation('startBreak');
    
    // Update game state for break mode
    this._setGameMode('break');
  }
  
  /**
   * Show a notification in the game context
   */
  showNotification(notification) {
    console.log(`GameTheme: Showing notification in game`, notification);
    
    // Create game notification element
    const notificationElement = document.createElement('div');
    notificationElement.className = 'game-notification';
    
    // Add content
    const titleElement = document.createElement('div');
    titleElement.className = 'game-notification-title';
    titleElement.textContent = notification.title;
    
    const bodyElement = document.createElement('div');
    bodyElement.className = 'game-notification-body';
    bodyElement.textContent = notification.body;
    
    notificationElement.appendChild(titleElement);
    notificationElement.appendChild(bodyElement);
    
    // Add to game container
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      gameContainer.appendChild(notificationElement);
      
      // Show with animation
      setTimeout(() => {
        notificationElement.classList.add('show');
      }, 10);
      
      // Remove after delay
      setTimeout(() => {
        notificationElement.classList.remove('show');
        setTimeout(() => {
          notificationElement.remove();
        }, 500);
      }, 5000);
    }
  }
  
  /**
   * Update game state and UI
   * Called each frame by the game loop
   */
  update(deltaTime) {
    // Update game time
    this.gameTime += deltaTime;
    
    // Update animations
    this._updateAnimations(deltaTime);
    
    // Update game-specific logic
    this._updateGameLogic(deltaTime);
    
    // Render the game
    this._renderGame();
  }
  
  /**
   * Private: Initialize game systems
   */
  _initializeGameSystems() {
    // Override in implementation
    console.log(`GameTheme: Game systems initialized`);
  }
  
  /**
   * Private: Create game interface
   */
  _createGameInterface() {
    // Get the app container
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) return;
    
    // Store original content for restoration
    this.originalContent = appContainer.innerHTML;
    
    // Clear the container
    appContainer.innerHTML = '';
    
    // Create game container
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-container';
    gameContainer.className = 'game-container';
    
    // Create UI elements (implementation specific)
    this._createGameUI(gameContainer);
    
    // Add to app container
    appContainer.appendChild(gameContainer);
  }
  
  /**
   * Private: Create game UI
   */
  _createGameUI(container) {
    // Override in implementation
    console.log(`GameTheme: Game UI created`);
    
    // Basic example structure
    container.innerHTML = `
      <div class="game-header">
        <div class="game-score">Score: <span id="game-score">0</span></div>
        <div class="game-timer" id="game-timer">00:00</div>
      </div>
      <div class="game-main">
        <div class="game-scene" id="game-scene"></div>
      </div>
      <div class="game-footer">
        <div class="game-task" id="game-task">No active task</div>
        <div class="game-controls">
          <button id="game-complete-btn" class="game-btn">Complete</button>
          <button id="game-next-btn" class="game-btn">Next</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Private: Remove game interface
   */
  _removeGameInterface() {
    // Get the app container
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) return;
    
    // Restore original content
    if (this.originalContent) {
      appContainer.innerHTML = this.originalContent;
    }
  }
  
  /**
   * Private: Start the game loop
   */
  _startGameLoop() {
    // Store the last update timestamp
    this.lastUpdateTime = Date.now();
    
    // Create the game loop function
    const gameLoop = () => {
      // Calculate delta time (time since last frame in seconds)
      const currentTime = Date.now();
      const deltaTime = (currentTime - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = currentTime;
      
      // Update the game
      this.update(deltaTime);
      
      // Schedule the next frame
      this.gameLoopId = requestAnimationFrame(gameLoop);
    };
    
    // Start the loop
    this.gameLoopId = requestAnimationFrame(gameLoop);
    
    console.log(`GameTheme: Game loop started`);
  }
  
  /**
   * Private: Stop the game loop
   */
  _stopGameLoop() {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
      console.log(`GameTheme: Game loop stopped`);
    }
  }
  
  /**
   * Private: Setup event listeners for game UI
   */
  _setupEventListeners() {
    // Get UI elements
    const completeButton = document.getElementById('game-complete-btn');
    const nextButton = document.getElementById('game-next-btn');
    
    // Complete task button
    if (completeButton) {
      this.addEventListener(completeButton, 'click', () => {
        if (this.currentTaskId) {
          window.electronAPI.completeTask(this.currentTaskId);
        }
      });
    }
    
    // Next task button
    if (nextButton) {
      this.addEventListener(nextButton, 'click', () => {
        window.electronAPI.getNextTask();
      });
    }
  }
  
  /**
   * Private: Format time for display
   */
  _formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Private: Add points to score
   */
  _addPoints(points) {
    this.gameState.score += points;
    
    // Update score display
    const scoreElement = document.getElementById('game-score');
    if (scoreElement) {
      scoreElement.textContent = this.gameState.score;
      
      // Add animation class
      scoreElement.classList.add('score-change');
      
      // Remove animation class after animation completes
      setTimeout(() => {
        scoreElement.classList.remove('score-change');
      }, 1000);
    }
  }
  
  /**
   * Private: Add experience to character
   */
  _addExperience(exp) {
    this.gameState.character.exp += exp;
    
    // Check for level up
    if (this.gameState.character.exp >= this.gameState.character.nextLevelExp) {
      this._levelUp();
    }
    
    // Update exp display
    this._updateCharacterUI();
  }
  
  /**
   * Private: Level up character
   */
  _levelUp() {
    // Increase level
    this.gameState.character.level += 1;
    
    // Reset exp and increase next level requirement
    this.gameState.character.exp -= this.gameState.character.nextLevelExp;
    this.gameState.character.nextLevelExp = Math.floor(this.gameState.character.nextLevelExp * 1.5);
    
    // Increase max HP
    this.gameState.character.maxHp += 20;
    this.gameState.character.hp = this.gameState.character.maxHp;
    
    // Play level up animation
    this._playAnimation('levelUp');
    
    // Show level up notification
    this.showNotification({
      title: 'Level Up!',
      body: `You reached level ${this.gameState.character.level}!`
    });
    
    // Update character UI
    this._updateCharacterUI();
  }
  
  /**
   * Private: Update character UI
   */
  _updateCharacterUI() {
    // Override in implementation
  }
  
  /**
   * Private: Play animation
   */
  _playAnimation(animationName) {
    this.animationState.currentAnimation = animationName;
    this.animationState.isAnimating = true;
    
    console.log(`GameTheme: Playing animation "${animationName}"`);
    
    // Implementation should handle the specific animation
  }
  
  /**
   * Private: Update animations
   */
  _updateAnimations(deltaTime) {
    // Override in implementation
  }
  
  /**
   * Private: Play sound effect
   */
  _playSound(soundName) {
    if (!this.settings.soundEnabled) return;
    
    console.log(`GameTheme: Playing sound "${soundName}"`);
    
    // Implementation should play the specific sound
  }
  
  /**
   * Private: Update timer visuals
   */
  _updateTimerVisuals(state) {
    // Override in implementation
  }
  
  /**
   * Private: Set game mode (work/break)
   */
  _setGameMode(mode) {
    // Override in implementation
    console.log(`GameTheme: Setting game mode to "${mode}"`);
  }
  
  /**
   * Private: Update game logic
   */
  _updateGameLogic(deltaTime) {
    // Override in implementation
  }
  
  /**
   * Private: Render the game
   */
  _renderGame() {
    // Override in implementation
  }
  
  /**
   * Private: Get theme CSS
   */
  _getThemeCSS() {
    return `
      /* Base Game Theme CSS */
      body {
        overflow: hidden;
      }
      
      .game-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background-color: #222;
        color: white;
      }
      
      .game-header {
        display: flex;
        justify-content: space-between;
        padding: 5px 10px;
        background-color: rgba(0, 0, 0, 0.5);
      }
      
      .game-main {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      
      .game-scene {
        width: 100%;
        height: 100%;
        position: relative;
      }
      
      .game-footer {
        display: flex;
        flex-direction: column;
        padding: 5px;
        background-color: rgba(0, 0, 0, 0.5);
      }
      
      .game-task {
        padding: 5px;
        margin-bottom: 5px;
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }
      
      .game-controls {
        display: flex;
        justify-content: space-between;
      }
      
      .game-btn {
        padding: 5px 10px;
        background-color: #444;
        border: none;
        border-radius: 3px;
        color: white;
        cursor: pointer;
      }
      
      .game-btn:hover {
        background-color: #555;
      }
      
      .game-notification {
        position: absolute;
        top: 10px;
        right: 10px;
        background-color: rgba(0, 0, 0, 0.7);
        border-left: 3px solid #ffcc00;
        padding: 10px;
        border-radius: 3px;
        max-width: 80%;
        transform: translateX(110%);
        transition: transform 0.3s ease-out;
      }
      
      .game-notification.show {
        transform: translateX(0);
      }
      
      .game-notification-title {
        font-weight: bold;
        margin-bottom: 5px;
        color: #ffcc00;
      }
      
      .score-change {
        animation: pulse 1s ease-in-out;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); color: #ffcc00; }
        100% { transform: scale(1); }
      }
    `;
  }
}

module.exports = GameThemeTemplate;