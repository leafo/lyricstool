
const DB_NAME = 'lyricsTool';
const STORE_NAME = 'configStore';

import { useState, useEffect } from 'react';

class ConfigEventEmitter {
  constructor() {
    this.listeners = {};
  }

  // Subscribe to a config key
  subscribe(key, callback) {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  }

  // Unsubscribe from a config key
  unsubscribe(key, callback) {
    if (this.listeners[key]) {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    }
  }

  // Emit an event for a config key
  emit(key, value) {
    [key, '*'].forEach(key => {
      if (this.listeners[key]) {
        this.listeners[key].forEach(callback => callback(value));
      }
    });
  }
}

class Config {
  constructor() {
    this.eventEmitter = new ConfigEventEmitter();
    this.getDb();
  }

  async getDb() {
    if (this.db) return this.db;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.openDatabase();
    this.db = await this.loadPromise;
    delete this.loadPromise;
    return this.db;
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject('Database error: ' + event.target.errorCode);
      };
    });
  }

  async get(key) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject('Get error: ' + event.target.errorCode);
      };
    });
  }

  async getValue(key) {
    const result = await this.get(key);
    return result?.value || null;
  }

  async set(key, value) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key, value });

      request.onsuccess = () => {
        this.eventEmitter.emit(key, value);
        resolve(true);
      };

      request.onerror = (event) => {
        reject('Set error: ' + event.target.errorCode);
      };
    });
  }

  async getFull() {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event) => {
        const allConfigs = event.target.result.reduce((acc, { key, value }) => {
          acc[key] = value;
          return acc;
        }, {});
        resolve(allConfigs);
      };

      request.onerror = (event) => {
        reject('Get full error: ' + event.target.errorCode);
      };
    });
  }
}

export const config = new Config();

export const useFullConfig = () => {
  const [currentConfig, setCurrentConfig] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllConfig = async () => {
      const result = await config.getFull();
      setCurrentConfig(result);
      setLoading(false);
    };

    fetchAllConfig();

    config.eventEmitter.subscribe('*', fetchAllConfig);

    return () => {
      config.eventEmitter.unsubscribe('*', fetchAllConfig);
    };
  }, []);

  return { config: currentConfig, loading };
};

export const useConfig = (key, callback) => {
  const [currentValue, setConfigValue] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const value = await config.getValue(key);
      if (value !== currentValue) {
        setConfigValue(value);

        if (callback) {
          callback(value);
        }
      }
    };

    fetchConfig();

    config.eventEmitter.subscribe(key, fetchConfig);
    
    return () => {
      config.eventEmitter.unsubscribe(key, fetchConfig);
    };
  }, [key, callback]);

  const setConfig = async (value) => {
    setConfigValue(value);
    return await config.set(key, value);
  };

  return [currentValue, setConfig];
};


