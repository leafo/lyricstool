
import React, { useEffect, useRef } from 'react';

import * as css from './BeatTapper.css';

const PIXELS_PER_SECOND = 100;
const WAVEFORM_HEIGHT = 160;
// Browser canvas-dimension cap (Safari is the strictest at 16384)
const MAX_OFFSCREEN_WIDTH = 16384;

const WAVEFORM_COLOR = '#527a42';
const CURSOR_COLOR = '#d32f2f';
const MARKER_COLOR = '#2c5aa0';
const DOWNBEAT_COLOR = '#e67e22';
const DOWNBEAT_TRIANGLE_SIZE = 6;

function renderWaveformOffscreen(audioBuffer, pixelsPerSecond) {
  const width = Math.max(1, Math.ceil(audioBuffer.duration * pixelsPerSecond));
  const height = WAVEFORM_HEIGHT;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const channelData = audioBuffer.getChannelData(0);
  const samplesPerPixel = channelData.length / width;
  const mid = height / 2;

  ctx.fillStyle = WAVEFORM_COLOR;
  for (let x = 0; x < width; x++) {
    const start = Math.floor(x * samplesPerPixel);
    const end = Math.min(channelData.length, Math.floor((x + 1) * samplesPerPixel));
    let min = 1, max = -1;
    for (let i = start; i < end; i++) {
      const s = channelData[i];
      if (s < min) min = s;
      if (s > max) max = s;
    }
    if (start >= end) { min = 0; max = 0; }
    const yMax = mid - max * mid;
    const yMin = mid - min * mid;
    ctx.fillRect(x, yMax, 1, Math.max(1, yMin - yMax));
  }

  return canvas;
}

// Resolve scroll geometry: where in the offscreen image to source from, and where the cursor sits on screen.
function computeLayout(currentTime, pps, totalWidth, viewWidth) {
  const cursorTimeX = currentTime * pps;
  const half = viewWidth / 2;
  let srcX = cursorTimeX - half;
  let cursorX = half;

  if (totalWidth <= viewWidth) {
    srcX = 0;
    cursorX = cursorTimeX;
  } else if (srcX < 0) {
    srcX = 0;
    cursorX = cursorTimeX;
  } else if (srcX > totalWidth - viewWidth) {
    srcX = totalWidth - viewWidth;
    cursorX = cursorTimeX - srcX;
  }

  return { srcX, cursorX };
}

const TAP_THRESHOLD_PX = 4;

export const Waveform = ({ audioBuffer, audioRef, markers, onSeek }) => {
  const canvasRef = useRef(null);
  const offscreenRef = useRef(null);
  const ppsRef = useRef(PIXELS_PER_SECOND);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (!audioBuffer) {
      offscreenRef.current = null;
      return;
    }
    let pps = PIXELS_PER_SECOND;
    if (audioBuffer.duration * pps > MAX_OFFSCREEN_WIDTH) {
      pps = MAX_OFFSCREEN_WIDTH / audioBuffer.duration;
      console.warn(`Audio duration ${audioBuffer.duration.toFixed(1)}s exceeds canvas size limit at ${PIXELS_PER_SECOND}px/s; rendering at ${pps.toFixed(1)}px/s`);
    }
    ppsRef.current = pps;
    offscreenRef.current = renderWaveformOffscreen(audioBuffer, pps);
  }, [audioBuffer]);

  useEffect(() => {
    if (!audioBuffer) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId = 0;
    const tick = () => {
      const dpr = window.devicePixelRatio || 1;
      const viewWidth = canvas.clientWidth;
      const viewHeight = canvas.clientHeight;

      if (viewWidth > 0 && viewHeight > 0) {
        const targetW = Math.floor(viewWidth * dpr);
        const targetH = Math.floor(viewHeight * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, viewWidth, viewHeight);

        const offscreen = offscreenRef.current;
        if (offscreen) {
          const audio = audioRef.current;
          const currentTime = audio ? audio.currentTime : 0;
          const pps = ppsRef.current;
          const { srcX, cursorX } = computeLayout(currentTime, pps, offscreen.width, viewWidth);

          const drawWidth = Math.min(viewWidth, offscreen.width - srcX);
          if (drawWidth > 0) {
            ctx.drawImage(
              offscreen,
              srcX, 0, drawWidth, offscreen.height,
              0, 0, drawWidth, viewHeight
            );
          }

          ctx.strokeStyle = MARKER_COLOR;
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (const m of markers) {
            if (m.type === 'downbeat') continue;
            const mx = m.time * pps - srcX;
            if (mx >= -1 && mx <= viewWidth + 1) {
              const x = Math.round(mx) + 0.5;
              ctx.moveTo(x, 0);
              ctx.lineTo(x, viewHeight);
            }
          }
          ctx.stroke();

          ctx.strokeStyle = DOWNBEAT_COLOR;
          ctx.fillStyle = DOWNBEAT_COLOR;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (const m of markers) {
            if (m.type !== 'downbeat') continue;
            const mx = m.time * pps - srcX;
            if (mx >= -1 && mx <= viewWidth + 1) {
              const x = Math.round(mx) + 0.5;
              ctx.moveTo(x, 0);
              ctx.lineTo(x, viewHeight);
            }
          }
          ctx.stroke();
          for (const m of markers) {
            if (m.type !== 'downbeat') continue;
            const mx = m.time * pps - srcX;
            if (mx >= -DOWNBEAT_TRIANGLE_SIZE && mx <= viewWidth + DOWNBEAT_TRIANGLE_SIZE) {
              const x = Math.round(mx);
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x - DOWNBEAT_TRIANGLE_SIZE, DOWNBEAT_TRIANGLE_SIZE);
              ctx.lineTo(x + DOWNBEAT_TRIANGLE_SIZE, DOWNBEAT_TRIANGLE_SIZE);
              ctx.closePath();
              ctx.fill();
            }
          }

          ctx.strokeStyle = CURSOR_COLOR;
          ctx.lineWidth = 2;
          const cx = Math.round(cursorX) + 0.5;
          ctx.beginPath();
          ctx.moveTo(cx, 0);
          ctx.lineTo(cx, viewHeight);
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [audioBuffer, markers, audioRef]);

  const seekToViewPosition = (clientX) => {
    if (!audioBuffer || !onSeek) return;
    const offscreen = offscreenRef.current;
    const canvas = canvasRef.current;
    if (!offscreen || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const audio = audioRef.current;
    const currentTime = audio ? audio.currentTime : 0;
    const pps = ppsRef.current;
    const { srcX } = computeLayout(currentTime, pps, offscreen.width, rect.width);

    const time = Math.max(0, Math.min(audioBuffer.duration, (srcX + x) / pps));
    onSeek(time);
  };

  const handlePointerDown = (e) => {
    if (!audioBuffer) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) audio.pause();

    const canvas = canvasRef.current;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}

    dragStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startTime: audio.currentTime,
      moved: false,
    };
  };

  const handlePointerMove = (e) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    if (!audioBuffer || !onSeek) return;

    const dx = e.clientX - state.startX;
    if (!state.moved && Math.abs(dx) >= TAP_THRESHOLD_PX) state.moved = true;

    if (state.moved) {
      const pps = ppsRef.current;
      const time = Math.max(0, Math.min(audioBuffer.duration, state.startTime - dx / pps));
      onSeek(time);
    }
  };

  const handlePointerUp = (e) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    dragStateRef.current = null;

    const canvas = canvasRef.current;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}

    if (!state.moved) {
      seekToViewPosition(e.clientX);
    }
  };

  const handlePointerCancel = (e) => {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    dragStateRef.current = null;
    const canvas = canvasRef.current;
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  return <div className={css.waveformContainer}>
    <canvas
      ref={canvasRef}
      className={css.waveformVisible}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    />
  </div>;
};
