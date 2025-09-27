import React from 'react';

import { Dialog } from './Dialog.js';
import { checkbox as checkboxClass } from './Dialog.css';

export function PlaybackSettingsDialog({
  isOpen,
  onClose,
  metronomeEnabled,
  onMetronomeToggle,
  metronomeVolume,
  onMetronomeVolumeChange,
  chordPlaybackEnabled,
  onChordPlaybackToggle,
  chordPlaybackVolume,
  onChordPlaybackVolumeChange
}) {
  const handleMetronomeVolumeChange = React.useCallback((e) => {
    const value = parseFloat(e.target.value);
    onMetronomeVolumeChange(value);
  }, [onMetronomeVolumeChange]);

  const handleChordPlaybackVolumeChange = React.useCallback((e) => {
    const value = parseFloat(e.target.value);
    onChordPlaybackVolumeChange(value);
  }, [onChordPlaybackVolumeChange]);

  if (!isOpen) return null;

  return (
    <Dialog onClose={onClose}>
      <h2>Playback Settings</h2>
      <form>
        <label className={checkboxClass}>
          <input
            type="checkbox"
            checked={metronomeEnabled}
            onChange={onMetronomeToggle}
          />
          Enable metronome
        </label>
        <label>
          Metronome Volume
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={metronomeVolume}
            onChange={handleMetronomeVolumeChange}
            disabled={!metronomeEnabled}
          />
        </label>
        <label className={checkboxClass}>
          <input
            type="checkbox"
            checked={chordPlaybackEnabled}
            onChange={onChordPlaybackToggle}
          />
          Enable chord playback
        </label>
        <label>
          Chord Volume
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={chordPlaybackVolume}
            onChange={handleChordPlaybackVolumeChange}
            disabled={!chordPlaybackEnabled}
          />
        </label>
      </form>
    </Dialog>
  );
}