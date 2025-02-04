
import { openDatabase, resetAll, MIGRATIONS } from './database.js';

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
  return JSON.stringify({
    type: "lyricstool_export",
    createdAt: Date.now(),
    migrationVersion: MIGRATIONS.length,
    stores: await Promise.all(STORES.map(async storeName => {
      return {
        name: storeName,
        data: await exportStore(storeName)
      }
    }))
  }, null, 2);
}

function verifyExport(exportData) {
  if (!exportData || typeof exportData !== 'object') {
    throw new Error('Invalid export data: must be an object');
  }

  if (exportData.type !== 'lyricstool_export') {
    throw new Error('File is not a valid export file from lyricstool');
  }

  if (!Array.isArray(exportData.stores)) {
    throw new Error('Invalid export data: stores must be an array');
  }

  // Verify each store has correct structure
  exportData.stores.forEach(store => {
    if (!store.name || !STORES.includes(store.name)) {
      throw new Error(`Invalid store name: ${store.name}`);
    }
    if (!Array.isArray(store.data)) {
      throw new Error(`Store ${store.name} data must be an array`);
    }
  });

  // Verify all expected stores are present
  const storeNames = exportData.stores.map(s => s.name);
  STORES.forEach(expectedStore => {
    if (!storeNames.includes(expectedStore)) {
      throw new Error(`Missing required store: ${expectedStore}`);
    }
  });

  return true;
}

export async function importFromJSON(jsonString) {
  // Parse JSON string
  let exportData;
  try {
    exportData = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Invalid JSON string: ' + e.message);
  }

  // Verify structure
  verifyExport(exportData);
  console.debug("Verified export");

  // Reset database
  const db = await resetAll();
  console.debug("Database reset");

  // Insert data for each store
  for (const store of exportData.stores) {
    const transaction = db.transaction([store.name], 'readwrite');
    const objectStore = transaction.objectStore(store.name);
    for (const record of store.data) {
      await new Promise((resolve, reject) => {
        const request = objectStore.add(record);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(new Error(`Failed to import record in ${store.name}: ${event.target.error}`));
      });
    }
  }
  console.debug("Data copied");

  return true
}

