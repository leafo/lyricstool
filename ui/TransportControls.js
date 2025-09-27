import React from 'react';

import { PlayIcon, PauseIcon, SettingsIcon } from './icons.js';
import css from './TransportControls.css';

export const TransportControls = React.memo(function TransportControls({
  isPlaying,
  onPlayPause,
  currentPosition,
  totalBeats,
  onPositionChange,
  bpm,
  onBpmChange,
  onSettingsClick
}) {
  const handlePositionChange = React.useCallback((e) => {
    onPositionChange(parseInt(e.target.value));
  }, [onPositionChange]);

  const handleBpmChange = React.useCallback((e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value <= 300) {
      onBpmChange(value);
    }
  }, [onBpmChange]);


  return (
    <div className={css.transportControls}>
      <button
        type="button"
        className={css.playPauseButton}
        onClick={onPlayPause}
      >
        {isPlaying ? <PauseIcon width={24} height={24} /> : <PlayIcon width={24} height={24} />}
      </button>

      <div className={css.progressContainer}>
        <input
          type="range"
          min="1"
          max={totalBeats}
          value={currentPosition}
          onChange={handlePositionChange}
          className={css.progressSlider}
        />
        <div className={css.progressLabel}>
          {currentPosition} / {totalBeats} beats
        </div>
      </div>

      <div className={css.bpmContainer}>
        <label htmlFor="bpm-input" className={css.bpmLabel}>BPM:</label>
        <input
          id="bpm-input"
          type="number"
          min="60"
          max="300"
          value={bpm}
          onChange={handleBpmChange}
          className={css.bpmInput}
        />
      </div>

      <button
        type="button"
        className={css.settingsButton}
        onClick={onSettingsClick}
        title="Playback settings"
      >
        <SettingsIcon width={20} height={20} />
      </button>
    </div>
  );
});