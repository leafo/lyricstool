import React from 'react';

import { EditSongDialog } from './SongDialog.js';
import css from './SongMeasureViewer.css';

import { useRoute, updateRoute } from '../router.js';
import * as songs from '../songs.js';

const MeasureBeat = React.memo(function MeasureBeat({ beat, measureNumber, chords, lyrics }) {
  const chordsForBeat = chords.filter(chord => chord.beat === beat);
  const lyricsForBeat = lyrics.filter(lyric => lyric.beat === beat);

  return (
    <div className={css.measureBeat}>
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

const MeasureCard = React.memo(function MeasureCard({ measure }) {
  const beats = Array.from({ length: measure.numberOfBeats }, (_, i) => i + 1);

  return (
    <div className={css.measureCard}>
      <div className={css.measureBeats}>
        {beats.map(beat => (
          <MeasureBeat
            key={beat}
            beat={beat}
            measureNumber={measure.measureNumber}
            chords={measure.chords || []}
            lyrics={measure.lyrics || []}
          />
        ))}
      </div>
    </div>
  );
});

export function SongMeasureViewer({ songId }) {
  const [song, error] = songs.useSong(songId);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);

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
            <button type="button" onClick={() => updateRoute({ viewSongId: songId })}>
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

  // Sort measures by measure number
  const sortedMeasures = [...song.measures].sort((a, b) => a.measureNumber - b.measureNumber);

  return (
    <div className={css.songMeasureViewer}>
      <div className={css.songHeader}>
        <h1>{song.title}</h1>
        {song.artist && <div className={css.artist}>by {song.artist}</div>}
        <div className={css.buttons}>
          <button type="button" onClick={() => updateRoute({ viewSongId: songId })}>
            Text View
          </button>
          <button type="button" onClick={() => setEditDialogOpen(true)}>
            Edit
          </button>
        </div>
      </div>

      <div className={css.measuresGrid}>
        {sortedMeasures.map(measure => (
          <MeasureCard key={measure.measureNumber} measure={measure} />
        ))}
      </div>

      {editDialogOpen && (
        <EditSongDialog
          songId={songId}
          onClose={() => setEditDialogOpen(false)}
        />
      )}
    </div>
  );
}