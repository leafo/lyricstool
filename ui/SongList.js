
import React, { useState, useEffect } from 'react';
import { getSongsOrderedByIdDesc, useDependency } from '../songs.js';

import * as css from './SongList.css';

import { useRoute, useRouteToggle, updateRoute } from '../router.js';
import { NewSongDialog, EditSongDialog } from './SongDialog.js';
import { useAsync, formatTimestamp } from '../util.js';

const LoadingSpinner = ({ width = 50, height = 50 }) => (
  <svg className={css.loadingSpinner} viewBox="0 0 50 50" width={width} height={height}>
    <circle
      className={css.spinnerCircle}
      cx="25"
      cy="25"
      r="20"
      fill="none"
      strokeWidth="5"
    />
  </svg>
);

const SongRow = ({ song }) => {
  const onClick = React.useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    updateRoute({ viewSongId: song.id, display: 'lyrics' });
  }, [song.id]);

  return <li className={css.songRow}>
    <button className={css.songRowButton} type="button" onClick={onClick}>View {song.title}</button>
    <h3>{song.title}</h3>
    {song.artist && <p><strong>Artist:</strong> {song.artist}</p>}
    <p className={css.lyrics}>{song.getLyrics()}</p>
    <div className={css.songTools}>
      <button type="button" onClick={() => updateRoute({ editSongId: song.id })}>Edit</button>
      {song.measures && song.measures.length > 0 && (
        <button type="button" onClick={() => updateRoute({ viewSongId: song.id, display: 'measures' })}>Measures</button>
      )}
      <div className={css.songMeta}>
        <strong>Created:</strong> {formatTimestamp(song.createdAt)}
        <br />
        <strong>Updated:</strong> {formatTimestamp(song.updatedAt)}
      </div>
    </div>
  </li>
}

export const SongList = () => {
  const [showNewSongDialog, setShowNewSongDialog] = useRouteToggle('newSong');
  const routeParams = useRoute(["editSongId"])
  const dbVersion = useDependency();

  const [songs, error, loading] = useAsync(() => getSongsOrderedByIdDesc(10, 0), [dbVersion]);

  if (error) {
    return <p>Failed to load songs: {error.toString()}</p>
  }

  return <>
    <div className={css.songList}>
      <nav>
        <h2>Songs List</h2>
        <button onClick={() => setShowNewSongDialog(true)}>New Song...</button>
      </nav>
      {loading && <LoadingSpinner />}

      { songs && songs.length > 0 &&
        <ul>
          {songs.map((song) => (
            <SongRow key={song.id} song={song} />
          ))}
        </ul>
      }
      {songs && songs.length === 0 && <p className={css.emptyMessage}>You have no songs yet. Click the "New Song..." button to add one.</p>}
    </div>
    {showNewSongDialog && <NewSongDialog onClose={() => setShowNewSongDialog(false)} />}
    {routeParams.editSongId && <EditSongDialog songId={routeParams.editSongId} onClose={() => updateRoute({ editSongId: false })} />}
  </>
};


