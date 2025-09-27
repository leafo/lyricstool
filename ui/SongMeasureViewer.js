import React from 'react';

import { EditSongDialog } from './SongDialog.js';
import { TransportControls } from './TransportControls.js';
import { PlaybackSettingsDialog } from './PlaybackSettingsDialog.js';
import css from './SongMeasureViewer.css';

import { useRoute, updateRoute } from '../router.js';
import * as songs from '../songs.js';
import { metronome } from '../metronome.js';

const MeasureBeat = React.memo(function MeasureBeat({ beat, measureNumber, chordsForBeat, lyricsForBeat, isCurrentBeat }) {
  return (
    <div className={`${css.measureBeat} ${isCurrentBeat ? css.currentBeat : ''}`}>
      {beat === 1 && <div className={css.measureNumber}>{measureNumber}</div>}
      <div className={css.chords}>
        {chordsForBeat.map((chord, index) => (
          <span key={index} className={css.chord}>{chord.chord}</span>
        ))}
      </div>
      <div className={css.lyrics}>
        {lyricsForBeat.map((lyric, index) => (
          <span key={index} className={css.lyric}>{lyric.text}</span>
        ))}
      </div>
    </div>
  );
});

const MeasureCard = React.memo(function MeasureCard({ measureData, currentBeat }) {
  return (
    <div className={css.measureCard}>
      <div className={css.measureBeats}>
        {measureData.beats.map(beatData => (
          <MeasureBeat
            key={beatData.beat}
            beat={beatData.beat}
            measureNumber={measureData.measureNumber}
            chordsForBeat={beatData.chordsForBeat}
            lyricsForBeat={beatData.lyricsForBeat}
            isCurrentBeat={currentBeat !== null && beatData.beat === currentBeat}
          />
        ))}
      </div>
    </div>
  );
});

export function SongMeasureViewer({ songId }) {
  const [song, error] = songs.useSong(songId);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = React.useState(false);

  // Playback state
  const [currentMeasure, setCurrentMeasure] = React.useState(1);
  const [currentBeat, setCurrentBeat] = React.useState(1);
  const [bpm, setBpm] = React.useState(120);
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Metronome state
  const [metronomeEnabled, setMetronomeEnabled] = React.useState(true);
  const [metronomeVolume, setMetronomeVolume] = React.useState(0.3);

  // Initialize metronome
  React.useEffect(() => {
    metronome.init();
    return () => metronome.destroy();
  }, []);

  // Update metronome settings
  React.useEffect(() => {
    metronome.setEnabled(metronomeEnabled);
    metronome.setVolume(metronomeVolume);
  }, [metronomeEnabled, metronomeVolume]);

  // Calculate total beats across all measures
  const totalBeats = React.useMemo(() => {
    if (!song?.measures) return 0;
    return song.measures.reduce((sum, measure) => sum + (measure.numberOfBeats || 4), 0);
  }, [song?.measures]);

  // Calculate current position in total beats
  const currentPosition = React.useMemo(() => {
    if (!song?.measures) return 0;
    const sortedMeasures = [...song.measures].sort((a, b) => a.measureNumber - b.measureNumber);
    let position = 0;
    for (const measure of sortedMeasures) {
      if (measure.measureNumber < currentMeasure) {
        position += measure.numberOfBeats || 4;
      } else if (measure.measureNumber === currentMeasure) {
        position += currentBeat;
        break;
      }
    }
    return position;
  }, [song?.measures, currentMeasure, currentBeat]);

  // Playback timing logic
  React.useEffect(() => {
    if (!isPlaying || !song?.measures) return;

    const beatDuration = 60000 / bpm; // milliseconds per beat
    const interval = setInterval(() => {
      // Play metronome click first for precise timing
      setCurrentBeat(prevBeat => {
        setCurrentMeasure(prevMeasure => {
          const sortedMeasures = [...song.measures].sort((a, b) => a.measureNumber - b.measureNumber);
          const currentMeasureData = sortedMeasures.find(m => m.measureNumber === prevMeasure);
          const maxBeats = currentMeasureData?.numberOfBeats || 4;

          let nextMeasure = prevMeasure;
          let nextBeat = prevBeat;

          if (prevBeat < maxBeats) {
            // Stay in current measure, advance beat
            nextBeat = prevBeat + 1;
          } else {
            // Move to next measure
            const nextMeasureIndex = sortedMeasures.findIndex(m => m.measureNumber === prevMeasure) + 1;
            if (nextMeasureIndex < sortedMeasures.length) {
              nextMeasure = sortedMeasures[nextMeasureIndex].measureNumber;
              nextBeat = 1;
            } else {
              // End of song - stop playback and reset
              setIsPlaying(false);
              return 1;
            }
          }

          // Play metronome click for the new beat
          const isDownbeat = nextBeat === 1;
          metronome.playClick(isDownbeat);

          return nextMeasure;
        });

        const sortedMeasures = [...song.measures].sort((a, b) => a.measureNumber - b.measureNumber);
        const currentMeasureData = sortedMeasures.find(m => m.measureNumber === currentMeasure);
        const maxBeats = currentMeasureData?.numberOfBeats || 4;

        if (prevBeat < maxBeats) {
          return prevBeat + 1;
        } else {
          return 1; // Reset to beat 1 of next measure
        }
      });
    }, beatDuration);

    return () => clearInterval(interval);
  }, [isPlaying, bpm, song?.measures, currentMeasure]);

  // Playback control handlers
  const handlePlayPause = React.useCallback(() => {
    setIsPlaying(prev => {
      if (!prev) {
        // Starting playback - play initial click
        const isDownbeat = currentBeat === 1;
        metronome.playClick(isDownbeat);
      }
      return !prev;
    });
  }, [currentBeat]);

  const handlePositionChange = React.useCallback((newPosition) => {
    if (!song?.measures) return;

    // Stop playback when manually changing position
    setIsPlaying(false);

    const sortedMeasures = [...song.measures].sort((a, b) => a.measureNumber - b.measureNumber);
    let accumulatedBeats = 0;

    for (const measure of sortedMeasures) {
      const measureBeats = measure.numberOfBeats || 4;
      if (accumulatedBeats + measureBeats >= newPosition) {
        setCurrentMeasure(measure.measureNumber);
        setCurrentBeat(newPosition - accumulatedBeats);
        return;
      }
      accumulatedBeats += measureBeats;
    }
  }, [song?.measures]);

  const handleBpmChange = React.useCallback((newBpm) => {
    setBpm(newBpm);
  }, []);

  const handleMetronomeToggle = React.useCallback(() => {
    setMetronomeEnabled(prev => !prev);
  }, []);

  const handleMetronomeVolumeChange = React.useCallback((newVolume) => {
    setMetronomeVolume(newVolume);
  }, []);

  const handleSettingsClick = React.useCallback(() => {
    setSettingsDialogOpen(true);
  }, []);

  const handleSettingsClose = React.useCallback(() => {
    setSettingsDialogOpen(false);
  }, []);

  // Process measure data for pure components
  const processedMeasures = React.useMemo(() => {
    if (!song?.measures) return [];

    const sortedMeasures = [...song.measures].sort((a, b) => a.measureNumber - b.measureNumber);

    return sortedMeasures.map(measure => {
      const beats = Array.from({ length: measure.numberOfBeats }, (_, i) => {
        const beat = i + 1;
        const chordsForBeat = (measure.chords || []).filter(chord => chord.beat === beat);
        const lyricsForBeat = (measure.lyrics || []).filter(lyric => lyric.beat === beat);

        return {
          beat,
          chordsForBeat,
          lyricsForBeat
        };
      });

      return {
        measureNumber: measure.measureNumber,
        beats
      };
    });
  }, [song?.measures]);

  if (error) {
    return <div className={css.error}>Error loading song: {error.message}</div>;
  }

  if (!song) {
    return <div className={css.loading}>Loading...</div>;
  }

  if (!song.measures || song.measures.length === 0) {
    return (
      <div className={css.songMeasureViewer}>
        <div className={css.songHeader}>
          <h1>{song.title}</h1>
          <div className={css.buttons}>
            <button type="button" onClick={() => updateRoute({ display: 'lyrics' })}>
              Text View
            </button>
          </div>
        </div>
        <div className={css.noMeasures}>
          This song doesn't have measure data available.
        </div>
      </div>
    );
  }

  return (
    <div className={css.songMeasureViewer}>
      <div className={css.songHeader}>
        <h1>{song.title}</h1>
        {song.artist && <div className={css.artist}>by {song.artist}</div>}
        <div className={css.buttons}>
          <button type="button" onClick={() => updateRoute({ display: 'lyrics' })}>
            Text View
          </button>
          <button type="button" onClick={() => setEditDialogOpen(true)}>
            Edit
          </button>
        </div>
      </div>

      <div className={css.measuresGrid}>
        {processedMeasures.map(measureData => (
          <MeasureCard
            key={measureData.measureNumber}
            measureData={measureData}
            currentBeat={measureData.measureNumber === currentMeasure ? currentBeat : null}
          />
        ))}
      </div>

      <TransportControls
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        currentPosition={currentPosition}
        totalBeats={totalBeats}
        onPositionChange={handlePositionChange}
        bpm={bpm}
        onBpmChange={handleBpmChange}
        onSettingsClick={handleSettingsClick}
      />

      <PlaybackSettingsDialog
        isOpen={settingsDialogOpen}
        onClose={handleSettingsClose}
        metronomeEnabled={metronomeEnabled}
        onMetronomeToggle={handleMetronomeToggle}
        metronomeVolume={metronomeVolume}
        onMetronomeVolumeChange={handleMetronomeVolumeChange}
      />

      {editDialogOpen && (
        <EditSongDialog
          songId={songId}
          onClose={() => setEditDialogOpen(false)}
        />
      )}
    </div>
  );
}
