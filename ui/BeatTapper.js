
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Waveform } from './Waveform.js';
import { CalibrateLatencyDialog } from './CalibrateLatencyDialog.js';

import { useConfig } from '../config.js';

import * as css from './BeatTapper.css';

const BEAT_REPLACE_THRESHOLD = 0.12;

async function chooseAudioFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
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

async function chooseJsonFile() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
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

function parseBeatExport(parsed) {
  if (Array.isArray(parsed) && parsed.every((t) => typeof t === 'number')) {
    return parsed.map((time) => ({ time, type: 'beat' }));
  }
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.beats)) {
    return parsed.beats
      .map((b) => ({
        time: typeof b.time === 'number' ? b.time : NaN,
        type: b.type === 'downbeat' ? 'downbeat' : 'beat',
      }))
      .filter((b) => isFinite(b.time) && b.time >= 0);
  }
  return null;
}

function formatTime(seconds) {
  if (!isFinite(seconds)) return '0:00.000';
  const m = Math.floor(seconds / 60);
  const s = (seconds - m * 60).toFixed(3).padStart(6, '0');
  return `${m}:${s}`;
}

export const BeatTapper = () => {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [markers, setMarkers] = useState([]);
  const [tapFlash, setTapFlash] = useState(null);
  const [showCalibrate, setShowCalibrate] = useState(false);

  const [latencyMs] = useConfig('tap_latency_ms');

  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const markerIdRef = useRef(0);

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

    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });

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
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const addMarker = useCallback((type = 'beat') => {
    const audio = audioRef.current;
    if (!audio || audio.paused) return;
    const time = Math.max(0, audio.currentTime - (latencyMs || 0) / 1000);
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
    setTapFlash(type);
    setTimeout(() => setTapFlash(null), 90);
  }, [latencyMs]);

  const removeMarkerBeforeCursor = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const cursorTime = audio.currentTime;
    setMarkers((prev) => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].time <= cursorTime) {
          return prev.filter((_, j) => j !== i);
        }
      }
      return prev;
    });
  }, []);

  const removeMarkerAfterCursor = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const cursorTime = audio.currentTime;
    setMarkers((prev) => {
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].time > cursorTime) {
          return prev.filter((_, j) => j !== i);
        }
      }
      return prev;
    });
  }, []);

  const deleteMarker = useCallback((id) => {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    if (markers.length > 0 && !confirm(`Clear all ${markers.length} markers?`)) return;
    setMarkers([]);
  }, [markers.length]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const onSeek = useCallback((time) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'AUDIO')) return;

      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        addMarker('beat');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        addMarker('downbeat');
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        removeMarkerBeforeCursor();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        removeMarkerAfterCursor();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const audio = audioRef.current;
        if (audio) audio.currentTime = Math.max(0, audio.currentTime - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const audio = audioRef.current;
        if (audio && audioBuffer) audio.currentTime = Math.min(audioBuffer.duration, audio.currentTime + 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addMarker, togglePlay, removeMarkerBeforeCursor, removeMarkerAfterCursor, audioBuffer]);

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
    chooseAudioFile().then(loadFile).catch(() => {});
  }, [loadFile]);

  const exportPayload = useCallback(() => ({
    version: 2,
    beats: markers.map((m) => ({ time: m.time, type: m.type })),
  }), [markers]);

  const onCopyTimestamps = useCallback(async () => {
    const data = JSON.stringify(exportPayload());
    try {
      await navigator.clipboard.writeText(data);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  }, [exportPayload]);

  const onLoadJson = useCallback(async () => {
    let f;
    try {
      f = await chooseJsonFile();
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
    const loaded = parseBeatExport(parsed);
    if (!loaded) {
      alert('Unrecognized beats JSON format.');
      return;
    }
    if (markers.length > 0 && !confirm(`Replace ${markers.length} existing marker${markers.length === 1 ? '' : 's'} with ${loaded.length} from file?`)) {
      return;
    }
    loaded.sort((a, b) => a.time - b.time);
    const withIds = loaded.map((m) => ({
      id: ++markerIdRef.current,
      time: m.time,
      type: m.type,
    }));
    setMarkers(withIds);
  }, [markers.length]);

  const onDownloadJson = useCallback(() => {
    const data = JSON.stringify(exportPayload(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = file?.name ? file.name.replace(/\.[^.]+$/, '') : 'beats';
    a.download = `${base}.beats.json`;
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
      {file && <span className={css.filename}>{file.name}</span>}
    </div>

    {error && <p className={css.error}>{error}</p>}

    {!file && !decoding && (
      <div className={css.dropHint}>
        <p>Drop an mp3 file here, or click "Choose audio file..." to begin.</p>
      </div>
    )}

    {audioUrl && <audio
      ref={audioRef}
      src={audioUrl}
      controls
      className={css.audioPlayer}
    />}

    {decoding && <p className={css.statusMessage}>Decoding audio...</p>}

    {audioBuffer && <Waveform
      audioBuffer={audioBuffer}
      audioRef={audioRef}
      markers={markers}
      onSeek={onSeek}
    />}

    {audioBuffer && <div className={css.tapPadGroup}>
      <button
        type="button"
        className={`${css.tapPad} ${css.tapPadDownbeat} ${tapFlash === 'downbeat' ? css.tapFlash : ''}`}
        onMouseDown={(e) => { e.preventDefault(); addMarker('downbeat'); }}
        onTouchStart={(e) => { e.preventDefault(); addMarker('downbeat'); }}
      >
        Downbeat (R)
      </button>
      <button
        type="button"
        className={`${css.tapPad} ${tapFlash === 'beat' ? css.tapFlash : ''}`}
        onMouseDown={(e) => { e.preventDefault(); addMarker('beat'); }}
        onTouchStart={(e) => { e.preventDefault(); addMarker('beat'); }}
      >
        Beat (T)
      </button>
    </div>}

    {audioBuffer && (
      <div className={css.markerSection}>
        <div className={css.markerHeader}>
          <h3>Beat markers ({markers.length})</h3>
          <div className={css.markerActions}>
            <button type="button" onClick={onCopyTimestamps} disabled={markers.length === 0}>Copy timestamps</button>
            <button type="button" onClick={onDownloadJson} disabled={markers.length === 0}>Download .json</button>
            <button type="button" onClick={onLoadJson}>Load .json...</button>
            <button type="button" onClick={clearAll} disabled={markers.length === 0}>Clear all</button>
          </div>
        </div>
        {markers.length > 0 ? (
          <ul className={css.markerList}>
            {markers.map((m) => (
              <li key={m.id} className={m.type === 'downbeat' ? css.markerDownbeat : ''}>
                <button type="button" className={css.markerSeek} onClick={() => onSeek(m.time)}>
                  {m.type === 'downbeat' ? '▸ ' : ''}{formatTime(m.time)}
                </button>
                <button type="button" className={css.markerDelete} onClick={() => deleteMarker(m.id)} aria-label="Delete marker">×</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={css.emptyMessage}>No markers yet. Press <kbd>T</kbd> (beat) or <kbd>R</kbd> (downbeat) while playing.</p>
        )}
        <p className={css.help}>
          <strong>Keys:</strong> <kbd>T</kbd> beat · <kbd>R</kbd> downbeat · <kbd>Space</kbd> play/pause · <kbd>U</kbd>/<kbd>Backspace</kbd> delete before cursor · <kbd>X</kbd> delete after cursor · <kbd>←</kbd>/<kbd>→</kbd> seek 1s · click waveform to seek
        </p>
      </div>
    )}

    {showCalibrate && <CalibrateLatencyDialog onClose={() => setShowCalibrate(false)} />}
  </div>;
};
