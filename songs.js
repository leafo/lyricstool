
// Song schema
// {
//   title: string
//   lyrics: string
//   chunks: string[]
// }


import { openDatabase } from './database';

const STORE_NAME = 'songs';

export async function insertSong(song) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.add(song);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject(`Insert error: ${event.target.errorCode}`);
    };
  });
}

export function lookupSong(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject(`Lookup error: ${event.target.errorCode}`);
    };
  });
}

export function updateSong(song) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.put(song);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject(`Update error: ${event.target.errorCode}`);
    };
  });
}

export function removeSong(id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject(`Remove error: ${event.target.errorCode}`);
    };
  });
}

export async function getSongsOrderedByIdDesc(limit, offset) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.openCursor(null, 'prev');
    const songs = [];
    let currentIndex = 0;

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && currentIndex < offset + limit) {
        if (currentIndex >= offset) {
          songs.push(cursor.value);
        }
        currentIndex++;
        cursor.continue();
      } else {
        resolve(songs);
      }
    };

    request.onerror = (event) => {
      reject(`Get songs error: ${event.target.errorCode}`);
    };
  });
}

