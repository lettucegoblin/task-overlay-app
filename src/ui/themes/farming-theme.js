/**
 * Farming Theme - Visualize productivity as managing a farm
 * 
 * This theme turns task management into a farming game.
 * Work periods represent planting/tending, break periods represent harvesting.
 * Tasks completed earn resources and help grow crops.
 */

const GameThemeTemplate = require('./game-theme-template');

class FarmingTheme extends GameThemeTemplate {
  constructor(themeManager) {
    super(themeManager);
    
    this.name = 'farming';
    this.displayName = 'Farming Adventure';
    this.description = 'Grow a virtual farm as you complete tasks';
    
    // Farming-specific state
    this.farmState = {
      coins: 0,
      crops: [],
      level: 1,
      plotsUnlocked: 2,
      maxPlots: 9,
      currentSeason: 'spring',
      daysPassed: 0
    };
    
    // Crop types
    this.cropTypes = [
      { id: 'corn', name: 'Corn', growTime: 3, value: 15, unlockLevel: 1 },
      { id: 'tomato', name: 'Tomato', growTime: 4, value: 25, unlockLevel: 1 },
      { id: 'wheat', name: 'Wheat', growTime: 2, value: 10, unlockLevel: 1 },
      { id: 'carrot', name: 'Carrot', growTime: 3, value: 20, unlockLevel: 2 },
      { id: 'strawberry', name: 'Strawberry', growTime: 5, value: 40, unlockLevel: 3 }
    ];
    
    // Current selected plot and crop
    this.selectedPlot = null;
    this.selectedCrop = null;
    
    // Override base settings
    this.settings = {
      ...this.settings,
      autoPlant: true,
      weatherEffects: true,
      cropRotation: false
    };
  }
  
  /**
   * Load assets specific to farming theme
   */
  async loadAssets() {
    // In a complete implementation, this would load images for:
    // - Farm background (different seasons)
    // - Crop sprites (different growth stages)
    // - Farmer character
    // - Weather effects
    // - UI elements
    
    console.log('FarmingTheme: Assets loaded');
    return Promise.resolve();
  }
  
  /**
   * Create the farm UI
   */
  _createGameUI(container) {
    container.innerHTML = `
      <div class="farm-header">
        <div class="farm-stats">
          <div class="farm-stat"><img src="coin.png" class="farm-icon" /> <span id="farm-coins">0</span></div>
          <div class="farm-stat">Day <span id="farm-day">1</span></div>
          <div class="farm-stat">Level <span id="farm-level">1</span></div>
        </div>
        <div class="farm-timer" id="farm-timer">00:00</div>
      </div>
      <div class="farm-main">
        <div class="farm-scene" id="farm-scene">
          <div class="farm-land" id="farm-land">
            ${this._generatePlots()}
          </div>
          <div class="farm-character" id="farm-character"></div>
          <div class="farm-weather" id="farm-weather"></div>
        </div>
      </div>
      <div class="farm-footer">
        <div class="farm-task-container">
          <div class="farm-task-label">Current Task:</div>
          <div class="farm-task" id="farm-task">No active task</div>
        </div>
        <div class="farm-controls">
          <button id="game-complete-btn" class="farm-btn farm-btn-harvest">Harvest (Complete Task)</button>
          <button id="game-next-btn" class="farm-btn farm-btn-next">Next Task</button>
        </div>
      </div>
    `;
    
    // After creating the UI, set up crop selection panel
    this._createCropSelector();
  }
  
  /**
   * Generate plot elements
   */
  _generatePlots() {
    let plotsHTML = '';
    
    for (let i = 0; i < this.farmState.maxPlots; i++) {
      const isUnlocked = i < this.farmState.plotsUnlocked;
      plotsHTML += `
        <div class="farm-plot ${isUnlocked ? 'unlocked' : 'locked'}" 
             data-plot-id="${i}" 
             id="farm-plot-${i}">
          ${isUnlocked ? '' : '<div class="farm-plot-lock">🔒</div>'}
        </div>
      `;
    }
    
    return plotsHTML;
  }
  
  /**
   * Create crop selection panel
   */
  _createCropSelector() {
    const cropSelector = document.createElement('div');
    cropSelector.id = 'crop-selector';
    cropSelector.className = 'crop-selector';
    
    let cropButtonsHTML = '';
    
    // Only show crops available at current level
    const availableCrops = this.cropTypes.filter(crop => 
      crop.unlockLevel <= this.farmState.level
    );
    
    availableCrops.forEach(crop => {
      cropButtonsHTML += `
        <div class="crop-option" data-crop-id="${crop.id}">
          <div class="crop-icon crop-${crop.id}"></div>
          <div class="crop-info">
            <div class="crop-name">${crop.name}</div>
            <div class="crop-stats">
              <span class="crop-time">🕒 ${crop.growTime}</span>
              <span class="crop-value">💰 ${crop.value}</span>
            </div>
          </div>
        </div>
      `;
    });
    
    cropSelector.innerHTML = `
      <h3>Select Crop to Plant</h3>
      <div class="crop-options">
        ${cropButtonsHTML}
      </div>
      <button id="crop-cancel" class="farm-btn">Cancel</button>
    `;
    
    // Add to container but hide initially
    const container = document.getElementById('game-container');
    container.appendChild(cropSelector);
    cropSelector.style.display = 'none';
  }
  
  /**
   * Set up event listeners specific to farming theme
   */
  _setupEventListeners() {
    // Call parent to set up basic listeners
    super._setupEventListeners();
    
    // Set up plot click listeners
    const plots = document.querySelectorAll('.farm-plot.unlocked');
    plots.forEach(plot => {
      this.addEventListener(plot, 'click', (e) => {
        const plotId = e.currentTarget.dataset.plotId;
        this._handlePlotClick(plotId);
      });
    });
    
    // Set up crop selector listeners
    const cropOptions = document.querySelectorAll('.crop-option');
    cropOptions.forEach(option => {
      this.addEventListener(option, 'click', (e) => {
        const cropId = e.currentTarget.dataset.cropId;
        this._selectCrop(cropId);
      });
    });
    
    // Cancel crop selection
    const cancelButton = document.getElementById('crop-cancel');
    if (cancelButton) {
      this.addEventListener(cancelButton, 'click', () => {
        this._hideCropSelector();
      });
    }
  }
  
  /**
   * Handle plot click
   */
  _handlePlotClick(plotId) {
    // Store selected plot
    this.selectedPlot = plotId;
    
    // Check if plot already has a crop
    const plot = this.farmState.crops.find(crop => crop.plotId === plotId);
    
    if (plot) {
      // If mature, harvest
      if (plot.stage >= this.cropTypes.find(c => c.id === plot.cropId).growTime) {
        this._harvestCrop(plotId);
      } else {
        // Otherwise show info
        this.showNotification({
          title: 'Growing Crop',
          body: `${plot.name} - Growth: ${plot.stage}/${this.cropTypes.find(c => c.id === plot.cropId).growTime}`
        });
      }
    } else {
      // Show crop selector to plant
      this._showCropSelector();
    }
  }
  
  /**
   * Show crop selector panel
   */
  _showCropSelector() {
    const selector = document.getElementById('crop-selector');
    if (selector) {
      selector.style.display = 'block';
    }
  }
  
  /**
   * Hide crop selector panel
   */
  _hideCropSelector() {
    const selector = document.getElementById('crop-selector');
    if (selector) {
      selector.style.display = 'none';
    }
    this.selectedPlot = null;
  }
  
  /**
   * Select crop to plant
   */
  _selectCrop(cropId) {
    if (this.selectedPlot === null) return;
    
    const cropType = this.cropTypes.find(crop => crop.id === cropId);
    if (!cropType) return;
    
    // Plant the crop
    this._plantCrop(this.selectedPlot, cropId);
    
    // Hide selector
    this._hideCropSelector();
  }
  
  /**
   * Plant a crop on a plot
   */
  _plantCrop(plotId, cropId) {
    const cropType = this.cropTypes.find(crop => crop.id === cropId);
    
    // Add crop to farm state
    this.farmState.crops.push({
      plotId: plotId,
      cropId: cropId,
      name: cropType.name,
      plantedTime: this.gameTime,
      stage: 0,
      mature: false
    });
    
    // Update plot appearance
    this._updatePlot(plotId);
    
    // Play planting animation
    this._moveCharacterToPlot(plotId, 'plant');
    
    // Show notification
    this.showNotification({
      title: 'Crop Planted',
      body: `You planted ${cropType.name}`
    });
  }
  
  /**
   * Update the appearance of a plot based on its state
   */
  _updatePlot(plotId) {
    const plotElement = document.getElementById(`farm-plot-${plotId}`);
    if (!plotElement) return;
    
    // Find crop in this plot
    const crop = this.farmState.crops.find(c => c.plotId == plotId);
    
    if (!crop) {
      // Empty plot
      plotElement.innerHTML = '';
      plotElement.className = 'farm-plot unlocked';
    } else {
      // Plot with crop
      const cropType = this.cropTypes.find(c => c.id === crop.cropId);
      const growthPercent = (crop.stage / cropType.growTime) * 100;
      const isMature = crop.stage >= cropType.growTime;
      
      // Update class
      plotElement.className = `farm-plot unlocked ${isMature ? 'mature' : 'growing'}`;
      
      // Update content with crop and growth stage
      plotElement.innerHTML = `
        <div class="crop crop-${crop.cropId} stage-${Math.min(crop.stage, cropType.growTime)}"></div>
        <div class="growth-indicator">
          <div class="growth-bar" style="width: ${growthPercent}%"></div>
        </div>
      `;
    }
  }
  
  /**
   * Harvest a crop from a plot
   */
  _harvestCrop(plotId) {
    // Find crop
    const cropIndex = this.farmState.crops.findIndex(c => c.plotId == plotId);
    if (cropIndex === -1) return;
    
    const crop = this.farmState.crops[cropIndex];
    const cropType = this.cropTypes.find(c => c.id === crop.cropId);
    
    // Make sure it's mature
    if (crop.stage < cropType.growTime) {
      this.showNotification({
        title: 'Not Ready',
        body: `${crop.name} needs more time to grow`
      });
      return;
    }
    
    // Remove crop
    this.farmState.crops.splice(cropIndex, 1);
    
    // Add coins
    this._addCoins(cropType.value);
    
    // Play harvesting animation
    this._moveCharacterToPlot(plotId, 'harvest');
    
    // Update plot appearance
    this._updatePlot(plotId);
    
    // Show notification
    this.showNotification({
      title: 'Crop Harvested',
      body: `You harvested ${crop.name} for ${cropType.value} coins!`
    });
  }
  
  /**
   * Add coins to farm
   */
  _addCoins(amount) {
    this.farmState.coins += amount;
    
    // Update display
    const coinsElement = document.getElementById('farm-coins');
    if (coinsElement) {
      coinsElement.textContent = this.farmState.coins;
      
      // Add animation
      coinsElement.classList.add('coins-changed');
      setTimeout(() => {
        coinsElement.classList.remove('coins-changed');
      }, 1000);
    }
    
    // Check if we can unlock a new plot
    this._checkForPlotUnlock();
  }
  
  /**
   * Check if we can unlock a new plot
   */
  _checkForPlotUnlock() {
    if (this.farmState.plotsUnlocked < this.farmState.maxPlots) {
      // Cost increases with each plot
      const unlockCost = 100 * Math.pow(2, this.farmState.plotsUnlocked - 2);
      
      if (this.farmState.coins >= unlockCost) {
        // Unlock a new plot
        this.farmState.plotsUnlocked += 1;
        this.farmState.coins -= unlockCost;
        
        // Update UI
        this._regeneratePlots();
        
        // Show notification
        this.showNotification({
          title: 'New Plot Unlocked!',
          body: `You unlocked a new plot of land!`
        });
      }
    }
  }
  
  /**
   * Regenerate all plots after unlocking
   */
  _regeneratePlots() {
    const landElement = document.getElementById('farm-land');
    if (landElement) {
      landElement.innerHTML = this._generatePlots();
      
      // Re-attach event listeners
      this._setupEventListeners();
      
      // Update all plots
      for (let i = 0; i < this.farmState.maxPlots; i++) {
        this._updatePlot(i);
      }
    }
  }
  
  /**
   * Move character to a plot
   */
  _moveCharacterToPlot(plotId, action) {
    const character = document.getElementById('farm-character');
    const plot = document.getElementById(`farm-plot-${plotId}`);
    
    if (!character || !plot) return;
    
    // Get plot position
    const plotRect = plot.getBoundingClientRect();
    const sceneRect = document.getElementById('farm-scene').getBoundingClientRect();
    
    // Calculate position relative to scene
    const targetX = plotRect.left - sceneRect.left + (plotRect.width / 2) - (character.offsetWidth / 2);
    const targetY = plotRect.top - sceneRect.top + (plotRect.height / 2) - (character.offsetHeight / 2);
    
    // Set character position
    character.style.left = `${targetX}px`;
    character.style.top = `${targetY}px`;
    
    // Add action class
    character.className = `farm-character ${action}`;
    
    // After animation completes, reset
    setTimeout(() => {
      character.className = 'farm-character';
    }, 1000);
  }
  
  /**
   * Display a task
   */
  displayTask(task) {
    // Store current task ID
    if (task) {
      this.currentTaskId = task.id;
      
      // Update task display
      const taskElement = document.getElementById('farm-task');
      if (taskElement) {
        taskElement.textContent = task.content || 'No task';
      }
      
      // Enable complete button if there's a task
      const completeButton = document.getElementById('game-complete-btn');
      if (completeButton) {
        completeButton.disabled = !task.id;
      }
    }
  }
  
  /**
   * Complete a task (harvest a random crop)
   */
  completeTask(task) {
    // Increment counter
    this.tasksCompleted++;
    
    // Find mature crops
    const matureCrops = this.farmState.crops.filter(crop => {
      const cropType = this.cropTypes.find(c => c.id === crop.cropId);
      return crop.stage >= cropType.growTime;
    });
    
    if (matureCrops.length > 0) {
      // Harvest a random mature crop
      const crop = matureCrops[Math.floor(Math.random() * matureCrops.length)];
      this._harvestCrop(crop.plotId);
    } else {
      // No mature crops, just add coins
      this._addCoins(50);
      
      // Show notification
      this.showNotification({
        title: 'Task Completed!',
        body: `You earned 50 coins!`
      });
    }
    
    // Maybe level up
    if (this.tasksCompleted % 5 === 0) {
      this._levelUp();
    }
  }
  
  /**
   * Level up the farm
   */
  _levelUp() {
    this.farmState.level += 1;
    
    // Update level display
    const levelElement = document.getElementById('farm-level');
    if (levelElement) {
      levelElement.textContent = this.farmState.level;
    }
    
    // Check for newly unlocked crops
    const newCrops = this.cropTypes.filter(crop => crop.unlockLevel === this.farmState.level);
    
    // Update crop selector with new crops
    if (newCrops.length > 0) {
      this._createCropSelector();
    }
    
    // Show level up notification
    this.showNotification({
      title: 'Level Up!',
      body: `Your farm is now level ${this.farmState.level}!${newCrops.length > 0 ? ' New crops unlocked!' : ''}`
    });
  }
  
  /**
   * Update timer visuals
   */
  _updateTimerVisuals(state) {
    // Update timer display
    const timerElement = document.getElementById('farm-timer');
    if (timerElement) {
      timerElement.textContent = this._formatTime(state.timeRemaining);
      
      // Update class based on work/break
      timerElement.className = `farm-timer ${state.isBreak ? 'break-time' : 'work-time'}`;
    }
    
    // Change background based on time remaining (sunset effect during work)
    if (!state.isBreak) {
      const totalSeconds = state.workTime * 60;
      const remainingPercent = state.timeRemaining / totalSeconds;
      const scene = document.getElementById('farm-scene');
      
      if (scene) {
        // More orange/red as time passes
        const hue = Math.floor(40 + (1 - remainingPercent) * 20);
        const saturation = Math.floor(70 + (1 - remainingPercent) * 30);
        const brightness = Math.floor(100 - (1 - remainingPercent) * 20);
        
        scene.style.filter = `hue-rotate(${hue}deg) saturate(${saturation}%) brightness(${brightness}%)`;
      }
    } else {
      // Reset during break
      const scene = document.getElementById('farm-scene');
      if (scene) {
        scene.style.filter = '';
      }
    }
  }
  
  /**
   * Set game mode (work/break)
   */
  _setGameMode(mode) {
    // Toggle body class
    document.body.classList.remove('work-mode', 'break-mode');
    document.body.classList.add(`${mode}-mode`);
    
    if (mode === 'break') {
      // During break:
      // 1. Advance all crops by 1 growth stage
      this.farmState.crops.forEach(crop => {
        const cropType = this.cropTypes.find(c => c.id === crop.cropId);
        if (crop.stage < cropType.growTime) {
          crop.stage += 1;
        }
      });
      
      // 2. Update all plots to show new growth
      for (let i = 0; i < this.farmState.plotsUnlocked; i++) {
        this._updatePlot(i);
      }
      
      // 3. Advance game day
      this.farmState.daysPassed += 1;
      const dayElement = document.getElementById('farm-day');
      if (dayElement) {
        dayElement.textContent = this.farmState.daysPassed + 1; // 1-indexed
      }
      
      // 4. Automatic planting on empty plots if enabled
      if (this.settings.autoPlant) {
        this._autoPlantEmptyPlots();
      }
    }
  }
  
  /**
   * Auto-plant empty plots
   */
  _autoPlantEmptyPlots() {
    // Find all empty plots
    const emptyPlotIds = [];
    for (let i = 0; i < this.farmState.plotsUnlocked; i++) {
      const hasPlot = this.farmState.crops.some(crop => crop.plotId == i);
      if (!hasPlot) {
        emptyPlotIds.push(i);
      }
    }
    
    // If any empty plots and we have unlocked crops
    if (emptyPlotIds.length > 0) {
      // Get available crops
      const availableCrops = this.cropTypes.filter(crop => 
        crop.unlockLevel <= this.farmState.level
      );
      
      if (availableCrops.length > 0) {
        // Plant a random crop in each empty plot
        emptyPlotIds.forEach(plotId => {
          const randomCrop = availableCrops[Math.floor(Math.random() * availableCrops.length)];
          this._plantCrop(plotId, randomCrop.id);
        });
      }
    }
  }
  
  /**
   * Update game logic
   */
  _updateGameLogic(deltaTime) {
    // Nothing to do in this simplified version
  }
  
  /**
   * Get theme CSS
   */
  _getThemeCSS() {
    // Extend the base game CSS with farming-specific styles
    return `
      ${super._getThemeCSS()}
      
      /* Farming theme specific CSS */
      .farm-container {
        background-color: #87CEEB; /* Sky blue background */
      }
      
      .farm-header {
        display: flex;
        justify-content: space-between;
        padding: 5px 10px;
        background-color: rgba(139, 69, 19, 0.7); /* Brown semi-transparent */
        color: white;
      }
      
      .farm-stats {
        display: flex;
        gap: 15px;
      }
      
      .farm-stat {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      
      .farm-icon {
        width: 16px;
        height: 16px;
      }
      
      .farm-timer {
        font-weight: bold;
      }
      
      .farm-timer.work-time {
        color: #FF9900; /* Orange for work time */
      }
      
      .farm-timer.break-time {
        color: #66FF66; /* Green for break time */
      }
      
      .farm-main {
        flex: 1;
        position: relative;
        overflow: hidden;
      }
      
      .farm-scene {
        width: 100%;
        height: 100%;
        position: relative;
        background-color: #8BC34A; /* Light green grass */
        transition: filter 0.5s ease;
      }
      
      .farm-land {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 10px;
        padding: 20px;
        height: calc(100% - 40px);
      }
      
      .farm-plot {
        background-color: #795548; /* Brown soil */
        border-radius: 5px;
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
      }
      
      .farm-plot.locked {
        background-color: #424242; /* Dark gray */
        cursor: not-allowed;
      }
      
      .farm-plot-lock {
        font-size: 24px;
        color: white;
      }
      
      .farm-plot.mature {
        animation: pulsate 2s infinite;
      }
      
      .crop {
        position: absolute;
        width: 80%;
        height: 80%;
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
      }
      
      .growth-indicator {
        position: absolute;
        bottom: 5px;
        left: 10%;
        width: 80%;
        height: 5px;
        background-color: rgba(0, 0, 0, 0.3);
        border-radius: 2px;
      }
      
      .growth-bar {
        height: 100%;
        background-color: #4CAF50; /* Green */
        border-radius: 2px;
        transition: width 0.5s ease;
      }
      
      .farm-character {
        position: absolute;
        width: 30px;
        height: 40px;
        background-color: #FF5722; /* Orange for visibility */
        transition: left 0.5s ease, top 0.5s ease;
      }
      
      .farm-character.plant::after {
        content: "🌱";
        position: absolute;
        top: -20px;
        left: 5px;
        font-size: 20px;
      }
      
      .farm-character.harvest::after {
        content: "✂️";
        position: absolute;
        top: -20px;
        left: 5px;
        font-size: 20px;
      }
      
      .farm-footer {
        display: flex;
        flex-direction: column;
        padding: 10px;
        background-color: rgba(139, 69, 19, 0.7); /* Brown semi-transparent */
        color: white;
      }
      
      .farm-task-container {
        margin-bottom: 10px;
      }
      
      .farm-task-label {
        font-size: 12px;
        opacity: 0.8;
      }
      
      .farm-task {
        padding: 5px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
        margin-top: 2px;
      }
      
      .farm-controls {
        display: flex;
        justify-content: space-between;
      }
      
      .farm-btn {
        padding: 8px 15px;
        background-color: #8BC34A; /* Green */
        border: none;
        border-radius: 5px;
        color: white;
        cursor: pointer;
        font-weight: bold;
      }
      
      .farm-btn:hover {
        background-color: #9CCC65; /* Lighter green */
      }
      
      .farm-btn:disabled {
        background-color: #BDBDBD; /* Gray */
        cursor: not-allowed;
      }
      
      .farm-btn-harvest {
        background-color: #FF9800; /* Orange */
      }
      
      .farm-btn-harvest:hover {
        background-color: #FFA726; /* Lighter orange */
      }
      
      .crop-selector {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(51, 51, 51, 0.95);
        border-radius: 10px;
        padding: 15px;
        width: 80%;
        max-width: 300px;
        z-index: 100;
        color: white;
      }
      
      .crop-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin: 15px 0;
      }
      
      .crop-option {
        display: flex;
        background-color: rgba(255, 255, 255, 0.1);
        padding: 8px;
        border-radius: 5px;
        cursor: pointer;
      }
      
      .crop-option:hover {
        background-color: rgba(255, 255, 255, 0.2);
      }
      
      .crop-icon {
        width: 40px;
        height: 40px;
        background-color: rgba(0, 0, 0, 0.3);
        border-radius: 5px;
        margin-right: 10px;
      }
      
      .crop-info {
        flex: 1;
      }
      
      .crop-name {
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .crop-stats {
        display: flex;
        gap: 10px;
        font-size: 12px;
      }
      
      .coins-changed {
        animation: pulse 1s ease-in-out;
        color: gold;
      }
      
      /* Break mode styles */
      body.break-mode .farm-scene {
        filter: brightness(1.2) saturate(1.2);
      }
      
      /* Work mode styles */
      body.work-mode .farm-scene {
        /* Base styling is handled dynamically in _updateTimerVisuals */
      }
      
      @keyframes pulsate {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); box-shadow: 0 0 10px rgba(255, 255, 0, 0.5); }
        100% { transform: scale(1); }
      }
    `;
  }
}

module.exports = FarmingTheme;