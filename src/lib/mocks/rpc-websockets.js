/**
 * Enhanced mock implementation of rpc-websockets for client-side usage
 * This prevents build errors with missing dependencies while providing better logging
 */
class WebSocketClient {
  constructor(address, options = {}) {
    console.log('WebSocketClient initialized', { address, options });
    this.address = address;
    this.options = options;
    this.isConnected = false;
    this.listeners = {};
  }
  
  connect() {
    console.log('WebSocketClient connect called');
    this.isConnected = true;
    
    // Trigger onopen event if registered
    if (this.listeners.open) {
      this.listeners.open.forEach(callback => {
        setTimeout(() => callback(), 0);
      });
    }
    
    return Promise.resolve();
  }
  
  disconnect() {
    console.log('WebSocketClient disconnect called');
    this.isConnected = false;
    
    // Trigger onclose event if registered
    if (this.listeners.close) {
      this.listeners.close.forEach(callback => {
        setTimeout(() => callback(), 0);
      });
    }
    
    return Promise.resolve();
  }
  
  on(event, callback) {
    console.log('WebSocketClient on called', { event });
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  off(event, callback) {
    console.log('WebSocketClient off called', { event });
    if (!this.listeners[event]) return;
    
    if (callback) {
      // Remove specific callback
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      // Remove all callbacks for this event
      delete this.listeners[event];
    }
  }
  
  call(method, params = []) {
    console.log('WebSocketClient call', { method, params });
    // Simulate async response
    return Promise.resolve(null);
  }
  
  notify(method, params = []) {
    console.log('WebSocketClient notify', { method, params });
    return Promise.resolve();
  }
  
  subscribe(event) {
    console.log('WebSocketClient subscribe', { event });
    return Promise.resolve(1);
  }
  
  unsubscribe(subscription) {
    console.log('WebSocketClient unsubscribe', { subscription });
    return Promise.resolve(true);
  }
  
  close() {
    console.log('WebSocketClient close called');
    this.isConnected = false;
    
    // Trigger onclose event if registered
    if (this.listeners.close) {
      this.listeners.close.forEach(callback => {
        setTimeout(() => callback(), 0);
      });
    }
  }
}

// Export mock client
module.exports = WebSocketClient;
module.exports.default = WebSocketClient;

// Export for specific path imports
module.exports.client = WebSocketClient;
module.exports.dist = {
  lib: {
    client: WebSocketClient,
    client: {
      websocket: WebSocketClient
    }
  }
};

// Export class as MockWebSocketClient for named imports
module.exports.MockWebSocketClient = WebSocketClient;
