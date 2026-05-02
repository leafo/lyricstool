
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { Dialog } from './Dialog.js';
import { useConfig } from '../config.js';

import * as css from './BeatTapper.css';

const TICK_INTERVAL = 1.0;
const NUM_TICKS = 20;
const WARMUP_TICKS = 4;
const LEAD_IN = 1.0;
const CLICK_DURATION = 0.05;
const NOISE_DURATION = 0.012;
const SINE_GAIN = 1.6;
const NOISE_GAIN = 1.4;
const LEAD_IN_TAP_TOLERANCE = 0.5;

function createLimiter(ctx) {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.setValueAtTime(-1, ctx.currentTime);
  limiter.knee.setValueAtTime(0, ctx.currentTime);
  limiter.ratio.setValueAtTime(20, ctx.currentTime);
  limiter.attack.setValueAtTime(0, ctx.currentTime);
  limiter.release.setValueAtTime(0.05, ctx.currentTime);
  limiter.connect(ctx.destination);
  return limiter;
}

function scheduleClick(ctx, time, frequency, output) {
  const oscillator = ctx.createOscillator();
  const oscGain = ctx.createGain();
  oscillator.connect(oscGain);
  oscGain.connect(output);
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.type = 'sine';
  oscGain.gain.setValueAtTime(0, time);
  oscGain.gain.linearRampToValueAtTime(SINE_GAIN, time + 0.005);
  oscGain.gain.exponentialRampToValueAtTime(0.001, time + CLICK_DURATION);
  oscillator.start(time);
  oscillator.stop(time + CLICK_DURATION);

  // Noise burst gives the click its transient punch.
  const bufferSize = Math.max(1, Math.ceil(ctx.sampleRate * NOISE_DURATION));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noise.connect(noiseGain);
  noiseGain.connect(output);
  noiseGain.gain.setValueAtTime(NOISE_GAIN, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, time + NOISE_DURATION);
  noise.start(time);
  noise.stop(time + NOISE_DURATION);

  oscillator.onended = () => {
    oscillator.disconnect();
    oscGain.disconnect();
  };
  noise.onended = () => {
    noise.disconnect();
    noiseGain.disconnect();
  };
}

function computeLatencyMs(taps) {
  const deltas = [];
  for (const t of taps) {
    let bestDelta = Infinity;
    for (let i = WARMUP_TICKS; i < NUM_TICKS; i++) {
      const d = t - i * TICK_INTERVAL;
      if (Math.abs(d) < Math.abs(bestDelta)) bestDelta = d;
    }
    if (Math.abs(bestDelta) <= TICK_INTERVAL / 2) {
      deltas.push(bestDelta);
    }
  }
  if (deltas.length < 3) return null;
  deltas.sort((a, b) => a - b);
  const median = deltas[Math.floor(deltas.length / 2)];
  return { latencyMs: Math.round(median * 1000), used: deltas.length };
}

export const CalibrateLatencyDialog = ({ onClose }) => {
  const [savedLatency, setConfig] = useConfig('tap_latency_ms');
  const [inputValue, setInputValue] = useState('0');
  const [phase, setPhase] = useState('idle'); // 'idle' | 'running' | 'done'
  const [tickCount, setTickCount] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [liveResult, setLiveResult] = useState(null);

  const audioCtxRef = useRef(null);
  const audioStartTimeRef = useRef(0);
  const tapsRef = useRef([]);
  const tickTimerRef = useRef(null);
  const finishTimerRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && savedLatency !== null && savedLatency !== undefined) {
      setInputValue(String(savedLatency));
      initializedRef.current = true;
    }
  }, [savedLatency]);

  const cleanup = useCallback(() => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const finalize = useCallback(() => {
    setPhase('done');
    const result = computeLatencyMs(tapsRef.current);
    setLiveResult(result);
    if (result !== null) setInputValue(String(result.latencyMs));
  }, []);

  const recordTap = useCallback(() => {
    if (phase !== 'running') return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime - audioStartTimeRef.current;
    if (t < -LEAD_IN_TAP_TOLERANCE) return;
    tapsRef.current.push(t);
    setTapCount(tapsRef.current.length);

    const result = computeLatencyMs(tapsRef.current);
    if (result !== null) {
      setLiveResult(result);
      setInputValue(String(result.latencyMs));
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running') return;
    const handler = (e) => {
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'AUDIO')) return;
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        recordTap();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, recordTap]);

  const handleStart = useCallback(async () => {
    cleanup();
    tapsRef.current = [];
    setTapCount(0);
    setTickCount(0);
    setLiveResult(null);

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) {}
    }

    const startTime = ctx.currentTime + LEAD_IN;
    audioStartTimeRef.current = startTime;

    const limiter = createLimiter(ctx);

    for (let i = 0; i < NUM_TICKS; i++) {
      scheduleClick(ctx, startTime + i * TICK_INTERVAL, i === 0 ? 800 : 400, limiter);
    }

    setPhase('running');

    tickTimerRef.current = setInterval(() => {
      const elapsed = ctx.currentTime - startTime;
      const count = Math.min(NUM_TICKS, Math.max(0, Math.floor(elapsed) + 1));
      setTickCount(count);
    }, 100);

    const totalMs = (LEAD_IN + (NUM_TICKS - 1) * TICK_INTERVAL + 0.5) * 1000;
    finishTimerRef.current = setTimeout(() => {
      if (tickTimerRef.current) {
        clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      finalize();
    }, totalMs);
  }, [cleanup, finalize]);

  const handleTryAgain = useCallback(() => {
    cleanup();
    setPhase('idle');
    setTickCount(0);
    setTapCount(0);
    setLiveResult(null);
  }, [cleanup]);

  const handleSave = useCallback(async () => {
    const value = parseInt(inputValue, 10);
    const safeValue = Number.isFinite(value) ? value : 0;
    await setConfig(safeValue);
    onClose();
  }, [inputValue, setConfig, onClose]);

  const isRunning = phase === 'running';

  return <Dialog onClose={onClose}>
    <h2>Calibrate Tap Latency</h2>
    <p className={css.calibrateInstructions}>
      Press <kbd>T</kbd> (or click the tap pad below) along with each tick. The first {WARMUP_TICKS} ticks are warm-up and are excluded from the result.
    </p>

    {phase === 'running' && (
      <div className={css.calibrateProgress}>
        <p>
          Tick <strong>{tickCount}</strong> / {NUM_TICKS} · Taps: <strong>{tapCount}</strong>
          {liveResult !== null && <> · Estimate: <strong>{liveResult.latencyMs} ms</strong> (n={liveResult.used})</>}
        </p>
      </div>
    )}

    {phase === 'done' && (
      <div className={css.calibrateResult}>
        <p>
          {liveResult
            ? `Estimated latency: ${liveResult.latencyMs} ms (median of ${liveResult.used} taps)`
            : `Not enough usable taps (${tapsRef.current.length} recorded). Try again.`}
        </p>
      </div>
    )}

    {phase === 'running' && (
      <button
        type="button"
        className={css.calibrateTapPad}
        onMouseDown={(e) => { e.preventDefault(); recordTap(); }}
        onTouchStart={(e) => { e.preventDefault(); recordTap(); }}
      >
        Tap (or press T)
      </button>
    )}

    <label className={css.calibrateInputRow}>
      Latency (ms)
      <input
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        disabled={isRunning}
      />
    </label>

    <div className={css.calibrateButtons}>
      {phase === 'idle' && (
        <button type="button" onClick={handleStart}>Start</button>
      )}
      {phase === 'done' && (
        <button type="button" onClick={handleTryAgain}>Try again</button>
      )}
      <button type="button" onClick={handleSave}>Save</button>
      <button type="button" onClick={onClose}>Cancel</button>
    </div>
  </Dialog>;
};
