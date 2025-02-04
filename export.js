
import { openDatabase } from './database.js';

const STORES = [
  "songs",
  "config"
]

async function exportStore(dbName) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([dbName], 'readonly');
    const store = transaction.objectStore(dbName);
    const request = store.getAll();

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to export store ${dbName}: ${event.target.errorCode}`));
    };
  });
}

// export the entire app database to json to migrate to another device
export async function exportToJSON() {
  return {
    type: "lyricstool_export",
    createdAt: Date.now(),
    stores: await Promise.all(STORES.map(async storeName => {
      return {
        name: storeName,
        data: await exportStore(storeName)
      }
    }))
  }
}

// this should wipe the entire database, and then insert all the stored data
export async function importFromJSON(json) {
  throw new Error("Not yet...");
}


