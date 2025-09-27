import React from 'react';

import { Dialog } from './Dialog.js';
import { checkbox as checkboxClass } from './Dialog.css';

export function PlaybackSettingsDialog({
  isOpen,
  onClose,
  metronomeEnabled,
  onMetronomeToggle,
  metronomeVolume,
  onMetronomeVolumeChange
}) {
  const handleMetronomeVolumeChange = React.useCallback((e) => {
    const value = parseFloat(e.target.value);
    onMetronomeVolumeChange(value);
  }, [onMetronomeVolumeChange]);

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
          Volume
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
      </form>
    </Dialog>
  );
}