
import React, { useState, useEffect } from 'react';
import { getSongsOrderedByIdDesc } from '../songs';

export const SongList = () => {
  const [songs, setSongs] = useState([]);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const songsData = await getSongsOrderedByIdDesc(10, 0); // Fetch top 10 songs
        setSongs(songsData);
      } catch (error) {
        console.error('Error fetching songs:', error);
      }
    };

    fetchSongs();
  }, []);

  return (
    <div>
      <h2>Songs List</h2>
      <ul>
        {songs.map((song) => (
          <li key={song.id}>
            <h3>{song.title}</h3>
            {song.artist && <p>Artist: {song.artist}</p>}
            <p>{song.lyrics}</p>
            <button>Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
};


