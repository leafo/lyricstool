
// Song schema
// {
//   title: string
//   lyrics: string
//   chunks: string[]
// }


import { openDatabase } from './database';
import {useAsync} from './util';

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
      reject(new Error(`Failed to insert song: ${event.target.errorCode}`));
    };
  });
}

export async function findSong(id) {
  if (isNaN(parseInt(id, 10))) {
    return Promise.reject(new Error('Invalid ID: ID must be an integer'));
  }
  id = parseInt(id, 10);

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onsuccess = () => {
      if (request.result != null) {
        resolve(request.result);
      } else {
        reject(new Error(`Failed to find song by id ${id}`));
      }
    };

    request.onerror = (event) => {
      reject(new Error(`Lookup error: ${event.target.errorCode}`));
    };
  });
}

export async function updateSong(song) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.put(song);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to update song: ${event.target.errorCode}`));
    };
  });
}

export async function deleteSong(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      reject(new Error(`Failed to delete song: ${event.target.errorCode}`));
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
      reject(new Error(`Failed to get songs: ${event.target.errorCode}`));
    };
  });
}

// TODO: this should listen to changes when the song is updated
export function useSong(songId) {
  return useAsync(() => findSong(songId), [songId]);
}


