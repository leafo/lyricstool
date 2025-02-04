
// Song schema
// {
//   title: string
//   lyrics: string
//   chunks: string[]
// }

import { IndexedDBStore } from './database';
import { useAsync } from './util';

const STORE_NAME = 'songs';
export const store = new IndexedDBStore(STORE_NAME);

export const insertSong = async song => store.add(song);
export const updateSong = async song => store.put(song);
export const deleteSong = async id => store.remove(id);

export const findSong = async id => {
  if (isNaN(parseInt(id, 10))) {
    throw new Error('Invalid ID: ID must be an integer');
  }
  id = parseInt(id, 10);
  const result = await store.get(id);

  if (result != null) {
    return result;
  }

  throw new Error(`Failed to find song by id ${id}`);
}


export async function getSongsOrderedByIdDesc(limit, offset) {
  const db = await store.getDb();

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

// TODO: this should listen to changes when the song is updated via emitter on
// store
export function useSong(songId) {
  return useAsync(() => findSong(songId), [songId]);
}


