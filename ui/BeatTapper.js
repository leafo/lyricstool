
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { Waveform } from './Waveform.js';
import { CalibrateLatencyDialog } from './CalibrateLatencyDialog.js';

import { useConfig } from '../config.js';

import * as css from './BeatTapper.css';

const BEAT_REPLACE_THRESHOLD = 0.12;
const TAP_FLASH_MS = 90;
const TRANSPORT_TIME_UPDATE_MS = 100;

function clampTime(time, duration) {
  if (!isFinite(time)) return 0;
  return Math.max(0, Math.min(duration || 0, time));
}

async function chooseFile(accept) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      resolve(file);
    };
    input.click();
  });
}

function parseSession(parsed) {
  if (Array.isArray(parsed) && parsed.every((t) => typeof t === 'number')) {
    return {
      beats: parsed.map((time) => ({ time, type: 'beat' })),
      lyrics: null,
    };
  }
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.beats)) {
    const beats = parsed.beats
      .map((b) => ({
        time: typeof b.time === 'number' ? b.time : NaN,
        type: b.type === 'downbeat' ? 'downbeat' : 'beat',
      }))
      .filter((b) => isFinite(b.time) && b.time >= 0);
    const lyrics = typeof parsed.lyrics === 'string' ? parsed.lyrics : null;
    return { beats, lyrics };
  }
  return null;
}

function formatSeconds(seconds, decimals) {
  const safe = isFinite(seconds) ? seconds : 0;
  const m = Math.floor(safe / 60);
  const padLength = decimals > 0 ? decimals + 3 : 2;
  const s = (safe - m * 60).toFixed(decimals).padStart(padLength, '0');
  return `${m}:${s}`;
}

const LYRIC_STAMP_RE = /\[(\d+):(\d{1,2}(?:\.\d+)?)\]/g;

function parseLyricChunks(text, defaultEndTime) {
  if (!text) return [];
  const chunks = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const matches = [];
    for (const m of line.matchAll(LYRIC_STAMP_RE)) {
      const minutes = parseInt(m[1], 10);
      const seconds = parseFloat(m[2]);
      if (isFinite(minutes) && isFinite(seconds)) {
        matches.push({ time: minutes * 60 + seconds, start: m.index, end: m.index + m[0].length });
      }
    }
    for (let i = 0; i < matches.length; i++) {
      const stampEnd = matches[i].end;
      const textEnd = i + 1 < matches.length ? matches[i + 1].start : line.length;
      chunks.push({ time: matches[i].time, text: line.substring(stampEnd, textEnd) });
    }
  }
  chunks.sort((a, b) => a.time - b.time);
  return chunks.map((c, i) => ({
    ...c,
    id: i,
    endTime: i + 1 < chunks.length ? chunks[i + 1].time : defaultEndTime,
  }));
}

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5];

function useAudioBufferTransport(audioBuffer, audioContextRef) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1.0);

  const sourceRef = useRef(null);
  const startedAtRef = useRef(0);
  const offsetRef = useRef(0);
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const playbackRateRef = useRef(1.0);
  const timeListenersRef = useRef(new Set());

  const duration = audioBuffer?.duration || 0;

  const notifyTimeListeners = useCallback(() => {
    for (const listener of timeListenersRef.current) {
      listener();
    }
  }, []);

  const subscribeTime = useCallback((listener) => {
    timeListenersRef.current.add(listener);
    return () => timeListenersRef.current.delete(listener);
  }, []);

  const getCurrentTime = useCallback(() => {
    const ctx = audioContextRef.current;
    if (sourceRef.current && ctx && isPlayingRef.current) {
      const elapsed = (ctx.currentTime - startedAtRef.current) * playbackRateRef.current;
      return clampTime(offsetRef.current + elapsed, duration);
    }
    return clampTime(currentTimeRef.current, duration);
  }, [audioContextRef, duration]);

  const stopSource = useCallback(() => {
    const source = sourceRef.current;
    if (!source) return;
    sourceRef.current = null;
    source.onended = null;
    try {
      source.stop();
    } catch (_) {}
    try {
      source.disconnect();
    } catch (_) {}
  }, []);

  const startSource = useCallback((offset) => {
    const ctx = audioContextRef.current;
    if (!ctx || !audioBuffer) return false;

    stopSource();
    if (audioBuffer.duration <= 0) return false;
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const startOffset = clampTime(offset, audioBuffer.duration);
    if (startOffset >= audioBuffer.duration) {
      offsetRef.current = audioBuffer.duration;
      currentTimeRef.current = audioBuffer.duration;
      notifyTimeListeners();
      isPlayingRef.current = false;
      setIsPlaying(false);
      return false;
    }
    source.playbackRate.value = playbackRateRef.current;
    sourceRef.current = source;
    offsetRef.current = startOffset;
    startedAtRef.current = ctx.currentTime;

    source.onended = () => {
      if (sourceRef.current !== source) return;
      sourceRef.current = null;
      const endTime = audioBuffer.duration;
      offsetRef.current = endTime;
      currentTimeRef.current = endTime;
      notifyTimeListeners();
      isPlayingRef.current = false;
      setIsPlaying(false);
    };

    source.start(0, startOffset);
    currentTimeRef.current = startOffset;
    notifyTimeListeners();
    isPlayingRef.current = true;
    setIsPlaying(true);
    return true;
  }, [audioBuffer, audioContextRef, notifyTimeListeners, stopSource]);

  const play = useCallback(async () => {
    if (!audioBuffer) return;
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const startTime = currentTimeRef.current >= audioBuffer.duration ? 0 : currentTimeRef.current;
    startSource(startTime);
  }, [audioBuffer, audioContextRef, startSource]);

  const pause = useCallback(() => {
    if (!audioBuffer) return;
    const time = getCurrentTime();
    stopSource();
    offsetRef.current = time;
    currentTimeRef.current = time;
    notifyTimeListeners();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [audioBuffer, getCurrentTime, notifyTimeListeners, stopSource]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      play().catch(() => {});
    }
  }, [pause, play]);

  const setPlaybackRate = useCallback((rate) => {
    if (!isFinite(rate) || rate <= 0) return;
    if (rate === playbackRateRef.current) return;
    const ctx = audioContextRef.current;
    const source = sourceRef.current;
    if (source && ctx && isPlayingRef.current) {
      const now = ctx.currentTime;
      offsetRef.current = clampTime(
        offsetRef.current + (now - startedAtRef.current) * playbackRateRef.current,
        duration,
      );
      startedAtRef.current = now;
      source.playbackRate.setValueAtTime(rate, now);
    }
    playbackRateRef.current = rate;
    setPlaybackRateState(rate);
  }, [audioContextRef, duration]);

  const seek = useCallback((time) => {
    if (!audioBuffer) return;
    const nextTime = clampTime(time, audioBuffer.duration);
    const shouldResume = isPlayingRef.current;
    stopSource();
    offsetRef.current = nextTime;
    currentTimeRef.current = nextTime;
    notifyTimeListeners();
    isPlayingRef.current = false;
    setIsPlaying(false);
    if (shouldResume && nextTime < audioBuffer.duration) {
      startSource(nextTime);
    }
  }, [audioBuffer, notifyTimeListeners, startSource, stopSource]);

  useEffect(() => {
    stopSource();
    offsetRef.current = 0;
    currentTimeRef.current = 0;
    notifyTimeListeners();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [audioBuffer, notifyTimeListeners, stopSource]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    const tick = () => {
      const time = getCurrentTime();
      currentTimeRef.current = time;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [getCurrentTime, isPlaying]);

  useEffect(() => {
    return () => stopSource();
  }, [stopSource]);

  return {
    currentTimeRef,
    duration,
    isPlaying,
    playbackRate,
    getCurrentTime,
    subscribeTime,
    play,
    pause,
    seek,
    togglePlay,
    setPlaybackRate,
  };
}

const TransportTime = React.memo(({ currentTimeRef, duration, isPlaying, getCurrentTime, subscribeTime }) => {
  const [displayTime, setDisplayTime] = useState(() => currentTimeRef.current);

  useEffect(() => {
    return subscribeTime(() => {
      setDisplayTime(currentTimeRef.current);
    });
  }, [currentTimeRef, subscribeTime]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setDisplayTime(getCurrentTime());
    }, TRANSPORT_TIME_UPDATE_MS);
    return () => clearInterval(id);
  }, [getCurrentTime, isPlaying]);

  return (
    <span className={css.transportTime}>
      {formatSeconds(displayTime, 2)} / {formatSeconds(duration, 2)}
    </span>
  );
});

const BeatMarkerItem = React.memo(({ marker, disabled, onSeek, onDelete }) => {
  return (
    <li className={marker.type === 'downbeat' ? css.markerDownbeat : ''}>
      <button
        type="button"
        className={css.markerSeek}
        onClick={() => onSeek(marker.time)}
        disabled={disabled}
      >
        {marker.type === 'downbeat' ? '▸ ' : ''}{formatSeconds(marker.time, 3)}
      </button>
      <button
        type="button"
        className={css.markerDelete}
        onClick={() => onDelete(marker.id)}
        aria-label="Delete marker"
      >×</button>
    </li>
  );
});

export const BeatTapper = () => {
  const [file, setFile] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [showCalibrate, setShowCalibrate] = useState(false);
  const [activeTab, setActiveTab] = useState('beats');
  const [lyricsText, setLyricsText] = useState('');
  const [showMarkerList, setShowMarkerList] = useState(true);

  const [latencyMs] = useConfig('tap_latency_ms');

  const lyricChunks = useMemo(
    () => audioBuffer ? parseLyricChunks(lyricsText, audioBuffer.duration) : [],
    [lyricsText, audioBuffer]
  );

  const audioContextRef = useRef(null);
  const markerIdRef = useRef(0);
  const lyricsTextareaRef = useRef(null);
  const tapFlashTimerRef = useRef(null);
  const beatPadRef = useRef(null);
  const downbeatPadRef = useRef(null);
  const flashingPadRef = useRef(null);
  const markersRef = useRef(markers);
  markersRef.current = markers;

  const transport = useAudioBufferTransport(audioBuffer, audioContextRef);
  const {
    currentTimeRef,
    duration,
    isPlaying,
    playbackRate,
    getCurrentTime,
    subscribeTime,
    pause,
    seek,
    togglePlay,
    setPlaybackRate,
  } = transport;

  const loadFile = useCallback(async (f) => {
    if (!f.type.startsWith('audio/')) {
      setError(`Not an audio file: ${f.type || 'unknown type'}`);
      return;
    }
    setError(null);
    setMarkers([]);
    setAudioBuffer(null);
    setFile(f);
    setDecoding(true);

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    try {
      const arrayBuffer = await f.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      setAudioBuffer(buffer);
    } catch (err) {
      console.error('Decode error:', err);
      setError(`Failed to decode audio: ${err.message || err}`);
    } finally {
      setDecoding(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const addMarker = useCallback((type = 'beat') => {
    if (!isPlaying) return;
    const time = Math.max(0, getCurrentTime() - ((latencyMs || 0) / 1000) * playbackRate);
    setMarkers((prev) => {
      let closestIdx = -1;
      let closestDist = BEAT_REPLACE_THRESHOLD;
      for (let i = 0; i < prev.length; i++) {
        const d = Math.abs(prev[i].time - time);
        if (d < closestDist) {
          closestDist = d;
          closestIdx = i;
        }
      }
      const without = closestIdx >= 0 ? prev.filter((_, i) => i !== closestIdx) : prev;
      const next = [...without, { id: ++markerIdRef.current, time, type }];
      next.sort((a, b) => a.time - b.time);
      return next;
    });
    const pad = type === 'downbeat' ? downbeatPadRef.current : beatPadRef.current;
    if (pad) {
      const prevPad = flashingPadRef.current;
      if (prevPad && prevPad !== pad) prevPad.classList.remove(css.tapFlash);
      pad.classList.add(css.tapFlash);
      flashingPadRef.current = pad;
      if (tapFlashTimerRef.current) clearTimeout(tapFlashTimerRef.current);
      tapFlashTimerRef.current = setTimeout(() => {
        const flashing = flashingPadRef.current;
        if (flashing) flashing.classList.remove(css.tapFlash);
        flashingPadRef.current = null;
        tapFlashTimerRef.current = null;
      }, TAP_FLASH_MS);
    }
  }, [getCurrentTime, isPlaying, latencyMs, playbackRate]);

  const removeMarkerBeforeCursor = useCallback(() => {
    const cursorTime = getCurrentTime();
    setMarkers((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].time <= cursorTime) {
          return prev.filter((_, j) => j !== i);
        }
      }
      return prev;
    });
  }, [getCurrentTime]);

  const removeMarkerAfterCursor = useCallback(() => {
    const cursorTime = getCurrentTime();
    setMarkers((prev) => {
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].time > cursorTime) {
          return prev.filter((_, j) => j !== i);
        }
      }
      return prev;
    });
  }, [getCurrentTime]);

  const deleteMarker = useCallback((id) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    if (markers.length > 0 && !confirm(`Clear all ${markers.length} markers?`)) return;
    setMarkers([]);
  }, [markers.length]);

  const onSeek = useCallback((time) => {
    seek(time);
  }, [seek]);

  const seekToLyricBeforeCaret = useCallback((caret) => {
    const ta = lyricsTextareaRef.current;
    if (!ta) return;
    const text = ta.value;
    let last = null;
    for (const m of text.matchAll(LYRIC_STAMP_RE)) {
      if (m.index + m[0].length > caret) break;
      last = m;
    }
    if (!last) return;
    const minutes = parseInt(last[1], 10);
    const seconds = parseFloat(last[2]);
    if (!isFinite(minutes) || !isFinite(seconds)) return;
    onSeek(minutes * 60 + seconds);
  }, [onSeek]);

  const insertLyricTimestamp = useCallback(() => {
    const ta = lyricsTextareaRef.current;
    if (!ta) return;

    const time = Math.max(0, getCurrentTime() - ((latencyMs || 0) / 1000) * playbackRate);
    const stamp = `[${formatSeconds(time, 2)}]`;
    const text = ta.value;
    let start = ta.selectionStart;
    let end = ta.selectionEnd;

    if (start === end) {
      for (const m of text.matchAll(LYRIC_STAMP_RE)) {
        const ms = m.index;
        const me = m.index + m[0].length;
        if (start >= ms && start <= me) {
          start = ms;
          end = me;
          break;
        }
      }
    }

    const newText = text.slice(0, start) + stamp + text.slice(end);
    setLyricsText(newText);

    const newPos = start + stamp.length;
    setTimeout(() => {
      const el = lyricsTextareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(newPos, newPos);
    }, 0);
  }, [getCurrentTime, latencyMs, playbackRate]);

  useEffect(() => {
    const handler = (e) => {
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'AUDIO')) return;

      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 1;
        if (audioBuffer) seek(getCurrentTime() - step);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 1;
        if (audioBuffer) seek(getCurrentTime() + step);
      } else if (activeTab === 'beats') {
        if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          addMarker('beat');
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          addMarker('downbeat');
        } else if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
          e.preventDefault();
          removeMarkerBeforeCursor();
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          removeMarkerAfterCursor();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addMarker, togglePlay, seek, getCurrentTime, removeMarkerBeforeCursor, removeMarkerAfterCursor, audioBuffer, activeTab]);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e) => {
    if (e.target === e.currentTarget) setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0];
    if (f) loadFile(f);
  }, [loadFile]);

  const onPickFile = useCallback(() => {
    chooseFile('audio/*').then(loadFile).catch(() => {});
  }, [loadFile]);

  const exportPayload = useCallback(() => ({
    version: 3,
    beats: markers.map((m) => ({ time: m.time, type: m.type })),
    lyrics: lyricsText,
  }), [markers, lyricsText]);

  const onLoadJson = useCallback(async () => {
    let f;
    try {
      f = await chooseFile('application/json,.json');
    } catch (_) {
      return;
    }
    let parsed;
    try {
      const text = await f.text();
      parsed = JSON.parse(text);
    } catch (err) {
      alert(`Failed to read JSON: ${err.message || err}`);
      return;
    }
    const loaded = parseSession(parsed);
    if (!loaded) {
      alert('Unrecognized session JSON format.');
      return;
    }

    const replaceParts = [];
    if (markers.length > 0) {
      replaceParts.push(`replace ${markers.length} existing marker${markers.length === 1 ? '' : 's'} with ${loaded.beats.length}`);
    }
    if (lyricsText && loaded.lyrics !== null && loaded.lyrics !== lyricsText) {
      replaceParts.push('replace existing lyrics');
    }
    if (replaceParts.length > 0 && !confirm(`This will ${replaceParts.join(' and ')}. Continue?`)) {
      return;
    }

    const sortedBeats = [...loaded.beats].sort((a, b) => a.time - b.time);
    const withIds = sortedBeats.map((m) => ({
      id: ++markerIdRef.current,
      time: m.time,
      type: m.type,
    }));
    setMarkers(withIds);
    if (loaded.lyrics !== null) {
      setLyricsText(loaded.lyrics);
    }
  }, [markers.length, lyricsText]);

  const onDownloadJson = useCallback(() => {
    const data = JSON.stringify(exportPayload(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = file?.name ? file.name.replace(/\.[^.]+$/, '') : 'session';
    a.download = `${base}.session.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportPayload, file]);

  return <div
    className={`${css.beatTapper} ${dragActive ? css.dragActive : ''}`}
    onDragEnter={handleDragEnter}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
  >
    <div className={css.toolbar}>
      <h2>Beat Tapper</h2>
      <button type="button" onClick={onPickFile}>Choose audio file...</button>
      <button type="button" onClick={() => setShowCalibrate(true)}>
        Latency: {latencyMs ?? 0} ms
      </button>
      {audioBuffer && (
        <>
          <button type="button" onClick={onDownloadJson}>Download .json</button>
          <button type="button" onClick={onLoadJson}>Load .json...</button>
        </>
      )}
      {file && <span className={css.filename}>{file.name}</span>}
    </div>

    {error && <p className={css.error}>{error}</p>}

    {!file && !decoding && (
      <div className={css.dropHint}>
        <p>Drop an mp3 file here, or click "Choose audio file..." to begin.</p>
      </div>
    )}

    {decoding && <p className={css.statusMessage}>Decoding audio...</p>}

    {audioBuffer && (
      <div className={css.transportControls}>
        <button type="button" onClick={togglePlay}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <TransportTime
          currentTimeRef={currentTimeRef}
          duration={duration}
          isPlaying={isPlaying}
          getCurrentTime={getCurrentTime}
          subscribeTime={subscribeTime}
        />
        <label className={css.transportRate}>
          Speed
          <select
            value={playbackRate}
            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
          >
            {PLAYBACK_RATES.map((r) => (
              <option key={r} value={r}>{r}x</option>
            ))}
          </select>
        </label>
      </div>
    )}

    {audioBuffer && <Waveform
      audioBuffer={audioBuffer}
      currentTimeRef={currentTimeRef}
      isPlaying={isPlaying}
      markersRef={markersRef}
      lyricChunks={lyricChunks}
      onSeek={onSeek}
      onPause={pause}
    />}

    <div className={css.tabs} role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'beats'}
        className={`${css.tab} ${activeTab === 'beats' ? css.tabActive : ''}`}
        onClick={() => setActiveTab('beats')}
      >Beats</button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'lyrics'}
        className={`${css.tab} ${activeTab === 'lyrics' ? css.tabActive : ''}`}
        onClick={() => setActiveTab('lyrics')}
      >Lyrics</button>
    </div>

    {activeTab === 'beats' && audioBuffer && <div className={css.tapPadGroup}>
      <button
        ref={downbeatPadRef}
        type="button"
        className={`${css.tapPad} ${css.tapPadDownbeat}`}
        onMouseDown={(e) => { e.preventDefault(); addMarker('downbeat'); }}
        onTouchStart={(e) => { e.preventDefault(); addMarker('downbeat'); }}
      >
        Downbeat (R)
      </button>
      <button
        ref={beatPadRef}
        type="button"
        className={css.tapPad}
        onMouseDown={(e) => { e.preventDefault(); addMarker('beat'); }}
        onTouchStart={(e) => { e.preventDefault(); addMarker('beat'); }}
      >
        Beat (T)
      </button>
    </div>}

    {activeTab === 'beats' && (
      <div className={css.markerSection}>
        <div className={css.markerHeader}>
          <h3>Beat markers ({markers.length})</h3>
          <button
            type="button"
            onClick={() => setShowMarkerList((s) => !s)}
            aria-pressed={!showMarkerList}
            title="Hide the marker list to reduce render cost while tapping"
          >
            {showMarkerList ? 'Hide list' : 'Show list'}
          </button>
          <button type="button" onClick={clearAll} disabled={markers.length === 0}>Clear all</button>
        </div>
        {showMarkerList && (markers.length > 0 ? (
          <ul className={css.markerList}>
            {markers.map((m) => (
              <BeatMarkerItem
                key={m.id}
                marker={m}
                disabled={!audioBuffer}
                onSeek={onSeek}
                onDelete={deleteMarker}
              />
            ))}
          </ul>
        ) : (
          <p className={css.emptyMessage}>
            {audioBuffer
              ? <>No markers yet. Press <kbd>T</kbd> (beat) or <kbd>R</kbd> (downbeat) while playing.</>
              : <>No markers. Load an audio file to start tapping, or load a saved session.</>}
          </p>
        ))}
        {showMarkerList && audioBuffer && (
          <p className={css.help}>
            <strong>Keys:</strong> <kbd>T</kbd> beat · <kbd>R</kbd> downbeat · <kbd>Space</kbd> play/pause · <kbd>U</kbd>/<kbd>Backspace</kbd> delete before cursor · <kbd>X</kbd> delete after cursor · <kbd>←</kbd>/<kbd>→</kbd> seek 1s (<kbd>Shift</kbd> 0.1s) · click waveform to seek
          </p>
        )}
      </div>
    )}

    {activeTab === 'lyrics' && (
      <div className={css.lyricsSection}>
        <textarea
          ref={lyricsTextareaRef}
          className={css.lyricsTextarea}
          value={lyricsText}
          onChange={(e) => setLyricsText(e.target.value)}
          onKeyDown={(e) => {
            if (e.code === 'Space' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              insertLyricTimestamp();
            }
          }}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) {
              seekToLyricBeforeCaret(e.target.selectionStart);
            }
          }}
          placeholder="Paste or type lyrics here. With audio loaded, press Ctrl+Space to insert a timestamp at the caret."
          spellCheck={false}
        />
        {audioBuffer && (
          <p className={css.help}>
            <strong>Keys (in textarea):</strong> <kbd>Ctrl</kbd>+<kbd>Space</kbd> insert timestamp at caret · <kbd>Ctrl</kbd>+click seeks to nearest timestamp before caret · <strong>Global:</strong> <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> seek 1s (<kbd>Shift</kbd> 0.1s) · click waveform to seek
          </p>
        )}
      </div>
    )}

    {showCalibrate && <CalibrateLatencyDialog onClose={() => setShowCalibrate(false)} />}
  </div>;
};
