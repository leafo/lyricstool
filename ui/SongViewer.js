import React from 'react';

import { EditSongDialog } from './NewSongDialog.js';
import css from './SongViewer.css';
import { useRoute, updateRoute } from '../router.js';

import { chunkLyrics, hideWords } from '../lyrics.js';

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


const SongChunk = ({ chunk }) => {
  const ref = React.useRef();

  React.useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return <li ref={ref} className={css.songChunk}>
    {hideWords(chunk)}
  </li>
}

const SongContent = ({ chunks, progress, goNext, goPrev }) => {
  return <div className={css.songContent}>
    <button onClick={goNext} className={css.nextButton}>Next</button>
    <button onClick={goPrev} className={css.prevButton}>Back</button>
    <ul>
      {chunks.slice(0, progress).map((chunk, idx) =>
        <SongChunk key={idx} chunk={chunk} />
      )}
    </ul>
  </div>
}

const SongViewerContent = ({song, error}) => {
  const [visibleProgress, setVisibleProgress] = React.useState(0);

  const chunks = React.useMemo(() => {
    if (!song) {
      return []
    }

    // if (song.chunks) {
    //   return song.chunks
    // }

    return chunkLyrics(song.lyrics)
  }, [song]);

  if (error) {
    return <p>{error.toString()}</p>
  }

  if (song) {
    return <div className={css.songViewer}>
      <div className={css.songHeader}>
        <h1>{song.title}</h1>
        <div className={css.buttons}>
          <button type="button" onClick={() => updateRoute({ editSongId: song.id })}>Edit Song</button>
        </div>
      </div>

      <SongContent
        goNext={() => setVisibleProgress(prev => Math.min(prev + 1, chunks.length))}
        goPrev={() => setVisibleProgress(prev => Math.max(prev - 1, 0))}
        chunks={chunks}
        progress={visibleProgress} />

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

