
export const DB_NAME = 'lyricsTool';

let db;

const MIGRATIONS = [
  (db) => {
    db.createObjectStore("config", { keyPath: 'key' });
  },
  (db) => {
    db.createObjectStore("songs", { keyPath: 'id', autoIncrement: true });
  }
];

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, MIGRATIONS.length);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const transaction = event.target.transaction;

      for (let i = event.oldVersion; i < event.newVersion; i++) {
        console.log(`Migrating from ${i} to ${i + 1}`);
        MIGRATIONS[i](db, transaction);
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      reject(`Database error: ${event.target.errorCode}`);
    };
  });
}

export class StoreEventEmitter {
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

export class IndexedDBStore {
  constructor(storeName) {
    this.storeName = storeName;
    this.eventEmitter = new StoreEventEmitter();
    this.getDb();
  }

  async getDb() {
    if (this.db) return this.db;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = openDatabase();
    this.db = await this.loadPromise;

    delete this.loadPromise;
    return this.db;
  }

  async get(key) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        reject(new Error(`'${this.storeName}': Get error ${event.target.errorCode}`));
      };
    });
  }

  async add(value) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(value);

      request.onsuccess = () => {
        const newKey = request.result;
        this.eventEmitter.emit(newKey, value);
        resolve(request.result);
      };

      request.onerror = (event) => {
        reject(new Error(`'${this.storeName}': Failed to add value ${event.target.errorCode}`));
      };
    });
  }

  async put(value) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value);

      request.onsuccess = () => {
        this.eventEmitter.emit(request.result, value);
        resolve(true);
      };

      request.onerror = (event) => {
        reject(new Error(`'${this.storeName}': Set error ${event.target.errorCode}`));
      };
    });
  }

  async remove(key) {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        this.eventEmitter.emit(key, null);
        resolve(true);
      };

      request.onerror = (event) => {
        reject(new Error(`'${this.storeName}': Remove error ${event.target.errorCode}`));
      };
    });
  }
}
