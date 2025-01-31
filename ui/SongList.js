
import React, { useState, useEffect } from 'react';
import { getSongsOrderedByIdDesc } from '../songs';

import {songList, songRow} from './SongList.css';

import { useRoute, useRouteToggle, updateRoute } from '../router.js';

import { NewSongDialog, EditSongDialog } from './NewSongDialog.js';

const SongRow = ({ song }) => (
  <li className={songRow}>
    <h3>{song.title}</h3>
    {song.artist && <p><strong>Artist:</strong> {song.artist}</p>}
    <p>{song.lyrics}</p>
    <button onClick={() => updateRoute({ editSongId: song.id })}>Edit</button>
  </li>
)

export const SongList = () => {
  const [showNewSongDialog, setShowNewSongDialog] = useRouteToggle('newSong');
  const routeParams = useRoute(["editSongId"])
  const [songs, setSongs] = useState([])

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

  return <>
    <div className={songList}>
      <nav>
        <h2>Songs List</h2>
        <button onClick={() => setShowNewSongDialog(true)}>New Song...</button>
      </nav>
      <ul>
        {songs.map((song) => (
          <SongRow key={song.id} song={song} />
        ))}
      </ul>
    </div>
    {showNewSongDialog && <NewSongDialog onClose={() => setShowNewSongDialog(false)} />}
    {routeParams.editSongId && <EditSongDialog songId={routeParams.editSongId} onClose={() => updateRoute({ editSongId: false })} />}
  </>
};


