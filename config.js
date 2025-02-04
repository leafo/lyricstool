
export const CONFIG_STORE_NAME = 'config';

import { IndexedDBStore } from './database';
import { useState, useEffect } from 'react';

class ConfigStore extends IndexedDBStore {
  async set(key, value) {
    return await this.put({ key, value });
  }

  async getValue(key) {
    const result = await this.get(key);
    return result?.value;
  }

  async getFull() {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
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

export const config = new ConfigStore(CONFIG_STORE_NAME);

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


