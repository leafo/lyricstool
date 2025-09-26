
// Song schema
// {
//   title: string
//   lyrics: string
//   chunks: string[]
// }

import { IndexedDBStore } from './database';
import { useAsync } from './util';
import React from 'react';

class Song {
  constructor(data) {
    Object.assign(this, data);
  }

  getLyrics() {
    if (!this.measures) return this.lyrics || '';

    // Sort measures by measureNumber
    const sortedMeasures = [...this.measures].sort((a, b) => a.measureNumber - b.measureNumber);

    let lyricsText = '';

    for (const measure of sortedMeasures) {
      if (!measure.lyrics || measure.lyrics.length === 0) continue;

      // Sort lyrics within measure by beat
      const sortedLyrics = [...measure.lyrics].sort((a, b) => a.beat - b.beat);

      // Concatenate lyrics for this measure, handling hyphenated words
      let measureLyrics = '';
      for (let i = 0; i < sortedLyrics.length; i++) {
        const currentText = sortedLyrics[i].text;

        if (i === 0) {
          measureLyrics = currentText;
        } else {
          const previousText = sortedLyrics[i - 1].text;
          // If previous text ends with hyphen and current starts with hyphen, merge them
          if (previousText.endsWith('-') && currentText.startsWith('-')) {
            // Remove the trailing hyphen from previous and leading hyphen from current
            measureLyrics = measureLyrics.slice(0, -1) + currentText.slice(1);
          } else if (previousText.endsWith('-') && !currentText.startsWith(' ')) {
            // Previous ends with hyphen and current is likely the continuation - remove hyphen and concatenate
            measureLyrics = measureLyrics.slice(0, -1) + currentText;
          } else {
            // Normal case - add space between words
            measureLyrics += ' ' + currentText;
          }
        }
      }

      if (measureLyrics.trim()) {
        lyricsText += measureLyrics + ' ';
      }
    }

    // Clean up: normalize spacing
    return lyricsText
      .replace(/\s+/g, ' ') // normalize multiple spaces to single space
      .trim();
  }
}

const STORE_NAME = 'songs';
export const store = new IndexedDBStore(STORE_NAME, Song);

// Validates and parses an ID into an integer
export const parseId = id => {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) {
    throw new Error('Invalid ID: ID must be an integer');
  }
  return parsed;
};


export const insertSong = async song => store.add(song);
export const updateSong = async song => store.put(song);
export const deleteSong = async id => store.remove(parseId(id));

export const findSong = async id => {
  const result = await store.get(parseId(id));

  if (result != null) {
    return result;
  }

  throw new Error(`Failed to find song by ID ${id}, perhaps it was deleted?`);
}

export async function getSongsOrderedByIdDesc(limit, offset) {
  return store.queryOrderedDesc(limit, offset);
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


