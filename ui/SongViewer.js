import React from 'react';

import { EditSongDialog } from './NewSongDialog.js';
import css from './SongViewer.css';
import { useRoute, updateRoute } from '../router.js';

import { chunkLyrics, hideWords } from '../lyrics.js';
import { useConfig } from '../config.js';

import * as songs from '../songs.js';

const SongScrubber = ({ value = 0, min, max, onChange }) => {
  return <input
    className={css.songScrubber}
    type="range"
    min={min}
    max={max}
    value={value}
    onChange={e => {
      if (onChange) {
        onChange(parseFloat(e.target.value))
      }
    }}
  />
};


const SongChunk = ({ chunk, hintLevel }) => {
  const ref = React.useRef();

  React.useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  if (hintLevel) {
    chunk = hideWords(chunk, hintLevel-1);
  }

  return <li ref={ref} className={css.songChunk}>
    {chunk}
  </li>
}

const SongContent = ({ chunks, progress, goNext, goPrev, goHint, hintLevel }) => {
  hintLevel ||= 0;

  return <div className={css.songContent}>
    <div className={css.buttonOverlay}>
      <button disabled={progress === 0} onClick={goPrev} className={css.prevButton}>Prev</button>
      <button disabled={progress === chunks.length} onClick={goNext} className={css.nextButton}>Next</button>

      <button onClick={goHint} className={css.hintButton}>Hint</button>
    </div>

    <ul>
      {chunks.slice(0, progress + 1).map((chunk, idx) => {
        if (idx >= progress) {
          if (hintLevel > 0) {
            return <SongChunk key={idx} chunk={chunk} hintLevel={hintLevel} />
          } else {
            return null
          }
        }

        return <SongChunk key={idx} chunk={chunk} />
      })}
    </ul>
  </div>
}


const updateViewerState = (state, action) => {
  switch (action.type) {
    case "incrementProgress":
      return {
        progress: Math.min(state.progress + 1, action.max),
        hintLevel: 0
      };
    case "decrementProgress":
      if (state.hintLevel > 0) {
        return {
          ...state,
          hintLevel: 0
        };
      } else {
        return {
          progress: Math.max(state.progress - 1, 0),
          hintLevel: 0
        };
      }
    case "setProgress":
      return {
        progress: action.progress,
        hintLevel: 0
      };
    case "incrementHint":
      return {
        ...state,
        hintLevel: state.hintLevel + 1
      };
    default:
      return state;
  }
};

const SongViewerContent = ({ song, error }) => {
  const [minHint] = useConfig("min_hint");
  const [state, dispatch] = React.useReducer(updateViewerState, { progress: 0, hintLevel: 0 });

  const chunks = React.useMemo(() => {
    if (!song) {
      return []
    }

    return chunkLyrics(song.lyrics);
  }, [song]);

  const songActions = React.useMemo(() => {
    return {
      goNext: () => dispatch({ type: "incrementProgress", max: chunks.length }),
      goPrev: () => dispatch({ type: "decrementProgress" }),
      goHint: () => dispatch({ type: "incrementHint" }),
    };
  }, [chunks.length, dispatch]);

  if (error) {
    return <p>{error.toString()}</p>
  }

  if (song) {
    return <div className={css.songViewer}>
      <div className={css.songHeader}>
        <h1>{song.title}</h1>
        <div className={css.buttons}>
          <button type="button" onClick={() => updateRoute({ editSongId: song.id })}>Edit</button>
        </div>
      </div>

      <SongContent
        {...songActions}
        chunks={chunks}
        hintLevel={state.hintLevel + (minHint || 0)}
        progress={state.progress} />

      <SongScrubber
        min={0}
        max={chunks.length}
        value={state.progress}
        onChange={(progress) => dispatch({ type: "setProgress", progress })}
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

