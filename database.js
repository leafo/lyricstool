
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
