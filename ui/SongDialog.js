
import React from 'react';
import css from './SongDialog.css';

import {Dialog} from './Dialog.js';
import {useAsync} from '../util.js';

import * as songs from '../songs.js';
import * as gemini from '../gemini.js';

import { useConfig } from '../config.js';

import {formatTimestamp} from '../util.js';

// do any processing of the song data before saving
async function processSong(song, beforeSong) {
  // update chunks if the lyrics have changed
  // TODO: disabled for now, probalby not worth it
  // if (!beforeSong || beforeSong.lyrics !== song.lyrics || !beforeSong.chunks) {
  //   const response = await gemini.chunkLyrics(song.lyrics);

  //   if (!response.chunks) {
  //     return Promise.reject(new Error('Failed to extract chunks from lyrics'));
  //   }

  //   song.chunks = response.chunks
  // }

  return song
}

async function chooseImage() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async e => {
      const file = e.target.files[0];
      if (!file) {
        reject(new Error("No file selected"))
        return
      }

      resolve(file);
    };

    input.click();
  })
}


export function OcrButton({onSuccess}) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [measureDetectionMode, setMeasureDetectionMode] = React.useState(false);
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const timerRef = React.useRef(null);

  const geminiApiKey = useConfig("gemini_api_key");

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (!geminiApiKey) {
    return null
  }

  const handleClick = async () => {
    setError(null); // Clear previous error

    chooseImage().then(async file => {
      setLoading(true);
      setElapsedTime(0);

      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      try {
        if (measureDetectionMode) {
          const measureResult = await gemini.ocrMeasures(file);
          console.log("Measure Detection Result:", measureResult);
          onSuccess(measureResult);
        } else {
          const ocrResult = await gemini.ocrLyrics(file);
          onSuccess(ocrResult);
        }
      } catch (err) {
        setError(err.message || "OCR failed");
        console.error("OCR Error:", err);
      } finally {
        // Clean up timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setLoading(false);
      }
    });
  };

  return (
    <div className={css.ocrControls}>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? `Processing... ${elapsedTime}s` : "OCR Import..."}
      </button>
      <label className={css.checkboxLabel}>
        <input
          type="checkbox"
          checked={measureDetectionMode}
          onChange={(e) => setMeasureDetectionMode(e.target.checked)}
          disabled={loading}
        />
        Measure Detection Mode
      </label>
      {error && <div className="error">{error}</div>}
    </div>
  );
}


export function SongForm({ref, onSubmit, handleDelete, handleCopy, song, loading, submitLabel}) {
  const formRef = React.useRef();
  const [measuresValue, setMeasuresValue] = React.useState(
    song?.measures ? JSON.stringify(song.measures, null, 2) : ''
  );

  React.useImperativeHandle(ref, () => ({
    serialize() {
      const formData = new FormData(formRef.current);
      let measures = null;
      if (measuresValue && measuresValue.trim()) {
        try {
          measures = JSON.parse(measuresValue);
        } catch (e) {
          console.error('Failed to parse measures JSON:', e);
        }
      }
      return {
        title: formData.get('title'),
        artist: formData.get('artist'),
        lyrics: formData.get('lyrics'),
        notes: formData.get('notes'),
        measures: measures
      };
    }
  }));

  return <form ref={formRef} onSubmit={onSubmit}>
    <OcrButton onSuccess={res => {
      const form = formRef.current;
      if (form) {
        if (res.title) {
          form.querySelector('input[name="title"]').value = res.title;
        }
        if (res.artist) {
          form.querySelector('input[name="artist"]').value = res.artist;
        }
        if (res.measures) {
          // Measure detection mode - populate measures and leave lyrics blank
          setMeasuresValue(JSON.stringify(res.measures, null, 2));
          form.querySelector('textarea[name="lyrics"]').value = '';
        } else {
          // Lyrics mode - populate lyrics and notes
          if (res.lyrics) {
            form.querySelector('textarea[name="lyrics"]').value = res.lyrics;
          }
          if (res.notes) {
            form.querySelector('textarea[name="notes"]').value = res.notes;
          }
        }
      }
    }} />

    <label>
      Title
      <input type="text" name="title" defaultValue={song?.title || ''} required />
    </label>

    <label>
      Artist
      <input type="text" name="artist" placeholder="Optional" defaultValue={song?.artist || ''} />
    </label>

    {measuresValue ? (
      <>
        <input type="hidden" name="lyrics" value="" />
        <label>
          Measures (JSON)
          <textarea name="measures" rows="10" readOnly value={measuresValue} onChange={() => {}}></textarea>
        </label>
      </>
    ) : (
      <label>
        Lyrics
        <textarea name="lyrics" rows="10" defaultValue={song?.lyrics || ''} required></textarea>
      </label>
    )}

    <label>
      Notes
      <textarea name="notes" rows="4" placeholder="Optional" defaultValue={song?.notes || ''}></textarea>
    </label>

    {song && <details>
      <summary>Metadata</summary>
      <table className={css.metadataTable}>
        <tbody>
          <tr>
            <td>ID</td>
            <td>{song.id ? <code>{song.id}</code> : <em>empty</em>}</td>
          </tr>
          <tr>
            <td>Created</td>
            <td title={song.createdAt}>{song.createdAt ? formatTimestamp(song.createdAt) : <em>not set</em>}</td>
          </tr>
          <tr>
            <td>Last Modified</td>
            <td title={song.updatedAt}>{song.updatedAt ? formatTimestamp(song.updatedAt) : <em>not set</em>}</td>
          </tr>
          <tr>
            <td>Chunks</td>
            <td>
              {song.chunks ? (
                <>
                  <code>{song.chunks.length} chunks</code>
                  <details>
                    <summary>View chunks</summary>
                    <ol>
                      {song.chunks.map((chunk, i) => (
                        <li key={i}>{chunk}</li>
                      ))}
                    </ol>
                  </details>
                </>
              ) : (
                <em>none</em>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </details>}

    <div className={css.formButtons}>
      <button type="submit" disabled={loading}>{submitLabel || 'Save'}</button>
      {(handleCopy || handleDelete) && <details className={css.toolsMenu}>
        <summary>Tools</summary>
        <div className={css.toolsMenuContent}>
          {handleCopy && (
            <button type="button" onClick={handleCopy} disabled={loading}>
              Copy Song
            </button>
          )}
          {handleDelete && (
            <button type="button" onClick={handleDelete} disabled={loading}>
              Delete Song
            </button>
          )}
        </div>
      </details>}
    </div>
  </form>
}

export function NewSongDialog({onClose}) {
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef();

  // TODO: this needs to capture errors
  const handleSave = React.useCallback(async (e) => {
    e.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);

    let newSong = formRef.current.serialize();
    newSong.createdAt = new Date().toISOString()
    newSong.updatedAt = new Date().toISOString()

    newSong = await processSong(newSong, null);

    const songId = await songs.insertSong(newSong);
    onClose();
  }, [loading, onClose]);

  return <Dialog onClose={onClose}>
    <h2>New Song</h2>
    <SongForm ref={formRef} onSubmit={handleSave} submitLabel="Create Song" />
  </Dialog>
}

export function EditSongDialog({songId, onClose}) {
  const formRef = React.useRef();
  const [loading, setLoading] = React.useState(false);
  const [copySuccess, setCopySuccess] = React.useState(false);
  const [song, error] = songs.useSong(songId);

  const handleCopy = React.useCallback(async () => {
    if (!song) return;

    const songData = {
      type: "lyricstool_song",
      version: 1,
      data: {
        title: song.title,
        artist: song.artist || '',
        lyrics: song.lyrics || '',
        notes: song.notes || '',
        measures: song.measures || null
      }
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(songData));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  }, [song]);

  // TODO: handle errors
  const handleSave = React.useCallback(async (e) => {
    e.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);

    const data = formRef.current.serialize();
    let updatedSong = {...song, ...data};
    updatedSong.updatedAt = new Date().toISOString()

    updatedSong = await processSong(updatedSong, song);
    await songs.updateSong(updatedSong)
    onClose();
  }, [loading, song, onClose]);

  const handleDelete = React.useCallback(async () => {
    if (loading) {
      return;
    }

    if (confirm("Are you sure you want to delete this song? This cannot be undone.")) {
      setLoading(true);
      await songs.deleteSong(songId);
      onClose();
    }
  }, [songId, onClose]);

  return <Dialog onClose={onClose}>
    <h2>Edit Song</h2>
    {copySuccess && <p className={css.successMessage}>Song copied to clipboard!</p>}
    {error && <p>{error.toString()}</p>}
    {song && <SongForm ref={formRef} onSubmit={handleSave} handleDelete={handleDelete} handleCopy={handleCopy} song={song} loading={loading} />}
  </Dialog>
}

export function PasteSongDialog({songData, onClose}) {
  const [loading, setLoading] = React.useState(false);

  const handleConfirm = React.useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      const newSong = {
        title: songData.title,
        artist: songData.artist || '',
        lyrics: songData.lyrics || '',
        notes: songData.notes || '',
        measures: songData.measures || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await songs.insertSong(newSong);
      onClose();
    } catch (err) {
      console.error('Failed to create song:', err);
      alert('Failed to create song: ' + err.message);
      setLoading(false);
    }
  }, [songData, loading, onClose]);

  const lyricsPreview = songData.lyrics
    ? (songData.lyrics.length > 200 ? songData.lyrics.substring(0, 200) + '...' : songData.lyrics)
    : null;

  return <Dialog onClose={onClose}>
    <h2>Paste Song</h2>
    <p>Create a new song from clipboard data?</p>

    <div className={css.pastePreview}>
      <p><strong>Title:</strong> {songData.title}</p>
      {songData.artist && <p><strong>Artist:</strong> {songData.artist}</p>}
      {lyricsPreview && (
        <p><strong>Lyrics:</strong><br /><span className={css.lyricsPreview}>{lyricsPreview}</span></p>
      )}
      {songData.measures && songData.measures.length > 0 && (
        <p><strong>Measures:</strong> {songData.measures.length} measures</p>
      )}
    </div>

    <div className={css.formButtons}>
      <button type="button" onClick={handleConfirm} disabled={loading}>
        {loading ? 'Creating...' : 'Create Song'}
      </button>
      <button type="button" onClick={onClose} disabled={loading}>Cancel</button>
    </div>
  </Dialog>
}

