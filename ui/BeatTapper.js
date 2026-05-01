
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
  const [tapFlash, setTapFlash] = useState(false);
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

  const addMarker = useCallback(() => {
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
      const next = [...without, { id: ++markerIdRef.current, time }];
      next.sort((a, b) => a.time - b.time);
      return next;
    });
    setTapFlash(true);
    setTimeout(() => setTapFlash(false), 90);
  }, [latencyMs]);

  const undoMarker = useCallback(() => {
    setMarkers((prev) => {
      if (prev.length === 0) return prev;
      let maxIdx = 0;
      for (let i = 1; i < prev.length; i++) {
        if (prev[i].id > prev[maxIdx].id) maxIdx = i;
      }
      return prev.filter((_, i) => i !== maxIdx);
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
        addMarker();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'u' || e.key === 'U' || e.key === 'Backspace') {
        e.preventDefault();
        undoMarker();
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
  }, [addMarker, togglePlay, undoMarker, audioBuffer]);

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

  const onCopyTimestamps = useCallback(async () => {
    const data = JSON.stringify(markers.map((m) => m.time));
    try {
      await navigator.clipboard.writeText(data);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  }, [markers]);

  const onDownloadJson = useCallback(() => {
    const data = JSON.stringify(markers.map((m) => m.time), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = file?.name ? file.name.replace(/\.[^.]+$/, '') : 'beats';
    a.download = `${base}.beats.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [markers, file]);

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

    {audioBuffer && <button
      type="button"
      className={`${css.tapPad} ${tapFlash ? css.tapFlash : ''}`}
      onMouseDown={(e) => { e.preventDefault(); addMarker(); }}
      onTouchStart={(e) => { e.preventDefault(); addMarker(); }}
    >
      Tap (or press T)
    </button>}

    {audioBuffer && (
      <div className={css.markerSection}>
        <div className={css.markerHeader}>
          <h3>Beat markers ({markers.length})</h3>
          <div className={css.markerActions}>
            <button type="button" onClick={onCopyTimestamps} disabled={markers.length === 0}>Copy timestamps</button>
            <button type="button" onClick={onDownloadJson} disabled={markers.length === 0}>Download .json</button>
            <button type="button" onClick={clearAll} disabled={markers.length === 0}>Clear all</button>
          </div>
        </div>
        {markers.length > 0 ? (
          <ul className={css.markerList}>
            {markers.map((m) => (
              <li key={m.id}>
                <button type="button" className={css.markerSeek} onClick={() => onSeek(m.time)}>
                  {formatTime(m.time)}
                </button>
                <button type="button" className={css.markerDelete} onClick={() => deleteMarker(m.id)} aria-label="Delete marker">×</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={css.emptyMessage}>No markers yet. Press <kbd>T</kbd> or click the tap pad while playing.</p>
        )}
        <p className={css.help}>
          <strong>Keys:</strong> <kbd>T</kbd> tap · <kbd>Space</kbd> play/pause · <kbd>U</kbd>/<kbd>Backspace</kbd> undo last · <kbd>←</kbd>/<kbd>→</kbd> seek 1s · click waveform to seek
        </p>
      </div>
    )}

    {showCalibrate && <CalibrateLatencyDialog onClose={() => setShowCalibrate(false)} />}
  </div>;
};
