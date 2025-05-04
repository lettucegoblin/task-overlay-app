/**
 * Event Bus - Central event system for loose coupling between components
 * 
 * This module provides a simple pub/sub system for broadcasting events
 * throughout the application. It allows components to communicate without
 * direct dependencies on each other.
 */

const { EventEmitter } = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners for different components
  }
  
  /**
   * Emit an event with data
   * @param {string} eventName - Name of the event
   * @param {any} data - Data to be passed with the event
   */
  publish(eventName, data) {
    console.log(`EventBus: Publishing ${eventName}`, data);
    this.emit(eventName, data);
  }
  
  /**
   * Subscribe to an event
   * @param {string} eventName - Name of the event to subscribe to
   * @param {Function} callback - Function to call when event is published
   * @returns {Function} - Function to unsubscribe
   */
  subscribe(eventName, callback) {
    console.log(`EventBus: Subscribing to ${eventName}`);
    this.on(eventName, callback);
    
    // Return unsubscribe function
    return () => {
      console.log(`EventBus: Unsubscribing from ${eventName}`);
      this.off(eventName, callback);
    };
  }
  
  /**
   * Subscribe to an event once
   * @param {string} eventName - Name of the event to subscribe to
   * @param {Function} callback - Function to call when event is published
   */
  subscribeOnce(eventName, callback) {
    console.log(`EventBus: Subscribing once to ${eventName}`);
    this.once(eventName, callback);
  }
}

// Export a singleton instance to be shared throughout the app
const eventBus = new EventBus();
module.exports = eventBus;