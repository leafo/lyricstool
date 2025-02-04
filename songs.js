
// Song schema
// {
//   title: string
//   lyrics: string
//   chunks: string[]
// }

import { IndexedDBStore } from './database';
import { useAsync } from './util';
import React from 'react';

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


// listens to updates to the database to increment the version
// this is a lazy way to track if the store has updated at all to trigger
// re-renders
export function useDependency() {
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    store.eventEmitter.subscribe('*', () => setVersion(v => v + 1));
    return () => {
      store.eventEmitter.unsubscribe('*', () => setVersion(v => v + 1));
    };
  }, []);

  return version;
}

export function useSong(songId) {
  const dbVersion = useDependency();
  return useAsync(() => findSong(songId), [songId, dbVersion]);
}


