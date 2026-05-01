
import React, { useEffect, useRef } from 'react';

import * as css from './BeatTapper.css';

const WAVEFORM_COLOR = '#527a42';
const CURSOR_COLOR = '#d32f2f';
const MARKER_COLOR = '#2c5aa0';

function downsample(channelData, width) {
  const peaks = new Float32Array(width * 2);
  const samplesPerPixel = channelData.length / width;
  for (let x = 0; x < width; x++) {
    const start = Math.floor(x * samplesPerPixel);
    const end = Math.min(channelData.length, Math.floor((x + 1) * samplesPerPixel));
    let min = 1, max = -1;
    for (let i = start; i < end; i++) {
      const s = channelData[i];
      if (s < min) min = s;
      if (s > max) max = s;
    }
    if (start >= end) {
      min = 0;
      max = 0;
    }
    peaks[x * 2] = min;
    peaks[x * 2 + 1] = max;
  }
  return peaks;
}

function drawWaveform(canvas, audioBuffer) {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth === 0 || cssHeight === 0) return;

  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const channelData = audioBuffer.getChannelData(0);
  const peaks = downsample(channelData, cssWidth);
  const mid = cssHeight / 2;

  ctx.fillStyle = WAVEFORM_COLOR;
  for (let x = 0; x < cssWidth; x++) {
    const min = peaks[x * 2];
    const max = peaks[x * 2 + 1];
    const yMax = mid - max * mid;
    const yMin = mid - min * mid;
    ctx.fillRect(x, yMax, 1, Math.max(1, yMin - yMax));
  }
}

function drawOverlay(canvas, duration, currentTime, markers) {
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth === 0 || cssHeight === 0) return;

  if (canvas.width !== Math.floor(cssWidth * dpr) || canvas.height !== Math.floor(cssHeight * dpr)) {
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
  }

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  if (!duration) return;

  ctx.strokeStyle = MARKER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const m of markers) {
    const x = Math.round((m.time / duration) * cssWidth) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, cssHeight);
  }
  ctx.stroke();

  ctx.strokeStyle = CURSOR_COLOR;
  ctx.lineWidth = 2;
  const cx = Math.round((currentTime / duration) * cssWidth) + 0.5;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, cssHeight);
  ctx.stroke();
}

export const Waveform = ({ audioBuffer, audioRef, markers, onSeek }) => {
  const staticCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  useEffect(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas || !audioBuffer) return;

    drawWaveform(canvas, audioBuffer);

    const observer = new ResizeObserver(() => {
      drawWaveform(canvas, audioBuffer);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [audioBuffer]);

  useEffect(() => {
    if (!audioBuffer) return;
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    let rafId = 0;
    const tick = () => {
      const audio = audioRef.current;
      const ct = audio ? audio.currentTime : 0;
      drawOverlay(canvas, audioBuffer.duration, ct, markers);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [audioBuffer, markers, audioRef]);

  const handleClick = (e) => {
    if (!audioBuffer || !onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, Math.min(audioBuffer.duration, (x / rect.width) * audioBuffer.duration));
    onSeek(time);
  };

  return <div className={css.waveformContainer}>
    <canvas ref={staticCanvasRef} className={css.waveformStatic} />
    <canvas ref={overlayCanvasRef} className={css.waveformOverlay} onClick={handleClick} />
  </div>;
};
