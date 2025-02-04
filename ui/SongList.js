
import React, { useState, useEffect } from 'react';
import { getSongsOrderedByIdDesc, useDependency } from '../songs.js';

import * as css from './SongList.css';

import { useRoute, useRouteToggle, updateRoute } from '../router.js';
import { NewSongDialog, EditSongDialog } from './NewSongDialog.js';
import { useAsync } from '../util.js';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isSameYear = date.getFullYear() === now.getFullYear();

  const options = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  if (!isSameYear) {
    options.year = 'numeric';
  }

  if (isToday) {
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return date.toLocaleString('en-US', options);
};

const SongRow = ({ song }) => {
  const onClick = React.useCallback(e => {
    const btn = e.target.closest('button')
    if (btn) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    updateRoute({ viewSongId: song.id });
  }, [song.id]);

  return <li className={css.songRow} onClick={onClick} tabIndex="0" role="button">
    <h3>{song.title}</h3>
    {song.artist && <p><strong>Artist:</strong> {song.artist}</p>}
    <p className={css.lyrics}>{song.lyrics}</p>
    <div className={css.songTools}>
      <button type="button" onClick={() => updateRoute({ editSongId: song.id })}>Edit</button>
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


