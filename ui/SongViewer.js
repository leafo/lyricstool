import React from 'react';

import { EditSongDialog } from './SongDialog.js';
import { HelpDialog } from './HelpDialog.js';
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

  const submitIfMatch = React.useCallback((rawValue) => {
    if (!nextWord) {
      return false;
    }

    const value = rawValue ?? "";
    if (!value.trim()) {
      return false;
    }

    if (normalizeWord(value) === normalizeWord(nextWord)) {
      goRevealWord();
      setCurrentValue("");
      return true;
    }

    return false;
  }, [goRevealWord, nextWord]);

  const onChange = React.useCallback((e) => {
    const { value } = e.target;
    setCurrentValue(value);

    if (/\s$/.test(value)) {
      submitIfMatch(value);
    }
  }, [submitIfMatch]);

  const onKeyDown = React.useCallback((e) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submitIfMatch(e.currentTarget.value);
    }
  }, [submitIfMatch]);

  return <input
    placeholder="Type next word..."
    value={currentValue}
    onChange={onChange}
    onKeyDown={onKeyDown}
    autoComplete="off"
    autoCorrect="off"
    autoCapitalize="off"
    spellCheck={false}
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
    case "decrementWordsRevealed":
      return {
        ...state,
        wordsRevealed: Math.max(state.wordsRevealed - 1, 0)
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
  const [minHint, setMinHint] = useConfig("min_hint");
  const [showWordBubbles, setShowWordBubbles] = useConfig("ui:showWordBubbles");
  const [showHelpDialog, setShowHelpDialog] = React.useState(false);

  const [state, dispatch] = React.useReducer(updateViewerState, {
    progress: 0,
    hintLevel: 0,
    wordsRevealed: 0
  });

  const chunks = React.useMemo(() => {
    if (!song) {
      return []
    }

    return chunkLyrics(song.getLyrics());
  }, [song]);

  const songActions = React.useMemo(() => {
    return {
      goNext: () => dispatch({ type: "incrementProgress", max: chunks.length }),
      goPrev: () => dispatch({ type: "decrementProgress" }),
      goHint: () => dispatch({ type: "incrementHint" }),
      goRevealWord: () => {
        dispatch({ type: "incrementWordsRevealed" })
      },
      goPrevWord: () => dispatch({ type: "decrementWordsRevealed" }),
      setProgress: (progress) => dispatch({ type: "setProgress", progress })
    };
  }, [chunks.length, dispatch]);

  // hotkeys for Ctrl+Left and Ctrl+Right
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (!song) return;

      if (e.ctrlKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          songActions.goPrev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          songActions.goNext();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMinHint(Math.min((parseInt(minHint) || 0) + 1, 5));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMinHint(Math.max((parseInt(minHint) || 0) - 1, 0));
        }
      }

      if (e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          songActions.goPrevWord();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          songActions.goRevealWord();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [song, songActions, minHint, setMinHint]);

  if (error) {
    return <p className={css.emptyMessage}>{error.toString()}</p>
  }

  if (song) {
    return <div className={css.songViewer}>
      <div className={css.songHeader}>
        <h1>{song.title}</h1>
        <div className={css.buttons}>
          {song.measures && song.measures.length > 0 && (
            <button type="button" onClick={() => updateRoute({ display: 'measures' })}>Measures View</button>
          )}
          <button type="button" onClick={() => updateRoute({ editSongId: song.id })}>Edit</button>
        </div>
      </div>

      {showWordBubbles && <div className={css.wordInputRow}>
        <WordInput
          {...songActions}
          chunks={chunks}
          wordsRevealed={state.wordsRevealed}
          progress={state.progress} />
        <button
          type="button"
          className={css.helpButton}
          onClick={() => setShowHelpDialog(true)}
          title="Keyboard shortcuts"
        >?</button>
      </div>}

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

      {showHelpDialog && <HelpDialog onClose={() => setShowHelpDialog(false)} />}
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
