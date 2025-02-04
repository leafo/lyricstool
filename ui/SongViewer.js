import React from 'react';

import { EditSongDialog } from './NewSongDialog.js';
import css from './SongViewer.css';
import { useRoute, updateRoute } from '../router.js';

import * as songs from '../songs.js';

const SongScrubber = ({ value = 0, min, max, onChange }) => {
  return <input
    type="range"
    min={min}
    max={max}
    value={value}
    onChange={e => {
      if (onChange) {
        onChange(parseFloat(e.target.value))
      }
    }}
    className={css.songScubber}
  />
};

const SongContent = ({ song, progress }) => {
  const chunks = song.chunks || []

  return <ul className={css.songContent}>
    {chunks.slice(0, progress).map((chunk, idx) => <li className={css.songChunk} key={idx}>
      {chunk}
    </li>)}
  </ul>
}

const SongViewerContent = ({song, error}) => {
  const [visibleProgress, setVisibleProgress] = React.useState(0);

  if (error) {
    return <p>{error.toString()}</p>
  }

  if (song) {
    // TODO: calculate chunks if not present
    const chunks = song.chunks || [];

    return <div className={css.songViewer}>
      <div className={css.songHeader}>
        <h1>{song.title}</h1>
        <div className={css.buttons}>
          <button type="button" onClick={() => updateRoute({ editSongId: song.id })}>Edit Song</button>
        </div>
      </div>

      <SongContent song={song} progress={visibleProgress} />

      <SongScrubber
        min={0}
        max={chunks.length}
        value={visibleProgress}
        onChange={progress => setVisibleProgress(progress)}
      />
    </div>
  }
}

export const SongViewer = ({ songId }) => {
  const routeParams = useRoute(["editSongId"]);
  const [song, error] = songs.useSong(songId);

  return  <>
    <SongViewerContent song={song} error={error} />
    {routeParams.editSongId && <EditSongDialog songId={routeParams.editSongId} onClose={() => updateRoute({ editSongId: false })} />}
  </>
};

