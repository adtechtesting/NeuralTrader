// Mock implementation for rpc-websockets to avoid build errors
class WebSocketMock {
  constructor() {
    this.isConnected = false;
    this.listeners = {};
  }

  connect() {
    this.isConnected = true;
    return Promise.resolve();
  }

  disconnect() {
    this.isConnected = false;
    return Promise.resolve();
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  call() {
    return Promise.resolve(null);
  }

  notify() {
    return Promise.resolve();
  }

  subscribe() {
    return Promise.resolve(1);
  }

  unsubscribe() {
    return Promise.resolve(true);
  }
}

// Export a mock class that can replace the websocket client
module.exports = WebSocketMock;
module.exports.default = WebSocketMock;