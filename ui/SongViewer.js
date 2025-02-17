import React from 'react';

import { EditSongDialog } from './SongDialog.js';
import css from './SongViewer.css';
import {visiblyHidden} from './global.css';


import { useRoute, updateRoute } from '../router.js';

import { shuffle } from '../util.js';

import { chunkLyrics, hideWords, extractWords } from '../lyrics.js';
import { useConfig } from '../config.js';

import * as songs from '../songs.js';

import { WordBubbleIcon } from './icons.js';

const SongScrubber = React.memo(function SongScrubber({ value = 0, min, max, onChange }) {
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
});

const SongChunk = React.memo(function Songchunk({ chunk, hintLevel, wordsRevealed, goNext }) {
  const ref = React.useRef();

  React.useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  let visibleChunk = chunk;

  if (wordsRevealed > 0) {
    hintLevel = Math.max(1, hintLevel || 0);
  }

  if (hintLevel) {
    visibleChunk = hideWords(chunk, hintLevel-1, wordsRevealed);
  }

  React.useEffect(() => {
    if (chunk == visibleChunk && hintLevel && goNext) {
      // we've filled out the line, advance to the next one
      goNext();
    }
  }, [chunk, visibleChunk, hintLevel]);

  return <li ref={ref} className={css.songChunk}>
    {visibleChunk}
  </li>
})

const SongContent = React.memo(function SongContent({ chunks, progress, goNext, goPrev, goHint, goRevealWord, hintLevel, wordsRevealed }) {
  hintLevel ||= 0;

  if (chunks.length == 0) {
    return <div className={css.songContent}>
      <p className={css.emptyMessage}>
        <em>This song has no lyrics, edit it to add some.</em>
      </p>
    </div>
  }

  return <div className={css.songContent}>
    <div className={css.buttonOverlay}>
      <button onClick={goPrev} className={css.prevButton}>Prev</button>
      <button disabled={progress === chunks.length} onClick={goNext} className={css.nextButton}>Next</button>

      <button onClick={goHint} className={css.hintButton}>Hint</button>
      <button className={css.revealWordButton} onClick={goRevealWord}>Reveal Word</button>
    </div>

    <ul>
      {chunks.slice(0, progress + 1).map((chunk, idx) => {
        if (idx >= progress) {
          if (hintLevel > 0 || wordsRevealed > 0) {
            return <SongChunk key={idx} chunk={chunk} hintLevel={hintLevel} wordsRevealed={wordsRevealed} goNext={goNext} />
          } else {
            return null
          }
        }

        return <SongChunk key={idx} chunk={chunk} />
      })}
    </ul>
  </div>
});

const normalizeWord = (word) => {
  return word.trim().toLowerCase().replace(/[^\w\s]/g, '');
}

const WordInput = React.memo(function WordInput({ chunks, progress, goRevealWord, wordsRevealed }) {
  const [currentValue, setCurrentValue] = React.useState("");

  const nextWord = React.useMemo(() => {
    const remainingChunks = chunks.slice(progress);
    return remainingChunks.flatMap(chunk => extractWords(chunk)).slice(wordsRevealed ?? 0)[0];
  }, [chunks, progress, wordsRevealed]);

  const onChange = React.useCallback((e) => {
    setCurrentValue(e.target.value)
  }, [nextWord, goRevealWord]);

  const onKeyDown = React.useCallback((e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (normalizeWord(e.target.value) == normalizeWord(nextWord)) {
        goRevealWord();
        setCurrentValue("");
      }
    }
  }, [nextWord, goRevealWord, setCurrentValue]);

  return <input
    placeholder="Type next word..."
    value={currentValue}
    onChange={onChange}
    onKeyDown={onKeyDown}
    className={css.wordInput}
    />
});

const WordButtons = React.memo(function WordButtons({ chunks, progress, goRevealWord, wordsRevealed }) {
  const MAX_WORDS = 12;
  const [incorrectGuesses, setIncorrectGuesses] = React.useState([]);

  React.useEffect(() => {
    if (incorrectGuesses.length) {
      setIncorrectGuesses([])
    }
  }, [chunks, progress, wordsRevealed]);

  const remainingWords = React.useMemo(() => {
    const remainingChunks = chunks.slice(progress);
    return remainingChunks.flatMap(chunk => extractWords(chunk)).slice(wordsRevealed ?? 0);
  }, [chunks, progress, wordsRevealed]);

  // the actual options presented
  const shuffledWords = React.useMemo(() => {
    const seenWords = new Set();
    const uniqueWords = remainingWords.filter((word, idx) => {
      if (seenWords.has(word)) return false;
      seenWords.add(word);
      return true;
    });

    const words = uniqueWords.slice(0, MAX_WORDS);
    return shuffle(words);
  }, [remainingWords]);


  if (shuffledWords.length == 0) {
    return <div className={css.wordButtons}>
      <p className={css.emptyMessage}>
        <em>No remaining words to guess.</em>
      </p>
    </div>
  }

  return <div className={css.wordButtons}>
    {shuffledWords.map((word, idx) => {
      const alreadyGuessed = incorrectGuesses.includes(word);
      return <button type="button" key={idx} disabled={alreadyGuessed} className={css.wordButton} onClick={() => {
        if (word == remainingWords[0]) {
          goRevealWord();
          setIncorrectGuesses([]);
        } else {
          setIncorrectGuesses(incorrectGuesses.concat(word));
        }
      }}>{word}</button>
    })}
  </div>
});

const updateViewerState = (state, action) => {
  switch (action.type) {
    case "incrementWordsRevealed":
      return {
        ...state,
        wordsRevealed: state.wordsRevealed + 1
      };
    case "incrementProgress":
      return {
        ...state,
        progress: Math.min(state.progress + 1, action.max),
        hintLevel: 0,
        wordsRevealed: 0
      };
    case "decrementProgress":
      if (state.hintLevel > 0) {
        return {
          ...state,
          hintLevel: 0,
          wordsRevealed: 0
        };
      } else {
        return {
          ...state,
          progress: Math.max(state.progress - 1, 0),
          hintLevel: 0,
          wordsRevealed: 0
        };
      }
    case "setProgress":
      return {
        ...state,
        progress: action.progress,
        hintLevel: 0,
        wordsRevealed: 0
      };
    case "incrementHint":
      return {
        ...state,
        hintLevel: state.hintLevel + 1
      };
    default:
      console.warn("updateViewerState: unknown action", action);
      return state;
  }
};

const SongViewerContent = ({ song, error }) => {
  const [minHint] = useConfig("min_hint");
  const [showWordBubbles, setShowWordBubbles] = useConfig("ui:showWordBubbles");

  const [state, dispatch] = React.useReducer(updateViewerState, {
    progress: 0,
    hintLevel: 0,
    wordsRevealed: 0
  });

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
      goRevealWord: () => {
        dispatch({ type: "incrementWordsRevealed" })
      },
      setProgress: (progress) => dispatch({ type: "setProgress", progress })
    };
  }, [chunks.length, dispatch]);

  if (error) {
    return <p className={css.emptyMessage}>{error.toString()}</p>
  }

  if (song) {
    return <div className={css.songViewer}>
      <div className={css.songHeader}>
        <h1>{song.title}</h1>
        <div className={css.buttons}>
          <button type="button" onClick={() => updateRoute({ editSongId: song.id })}>Edit</button>
        </div>
      </div>

      {showWordBubbles && <WordInput
        {...songActions}
        chunks={chunks}
        wordsRevealed={state.wordsRevealed}
        progress={state.progress} />}

      <SongContent
        {...songActions}
        chunks={chunks}
        hintLevel={state.hintLevel + parseInt(minHint || 0)}
        wordsRevealed={state.wordsRevealed}
        progress={state.progress} />

      {showWordBubbles && <WordButtons
        {...songActions}
        chunks={chunks}
        wordsRevealed={state.wordsRevealed}
        progress={state.progress} />
      }

      <section className={css.songControls}>
        <SongScrubber
          min={0}
          max={chunks.length}
          value={state.progress}
          onChange={songActions.setProgress}
        />

        <button className={showWordBubbles ? css.active : null} onClick={() => setShowWordBubbles(!showWordBubbles)}>
          <WordBubbleIcon width="42" height="24" />
          <span className={visiblyHidden}>Toggle Word Bubbles</span>
        </button>
      </section>
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

