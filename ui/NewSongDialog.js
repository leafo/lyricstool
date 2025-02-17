
import React from 'react';
import css from './NewSongDialog.css';

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

  const geminiApiKey = useConfig("gemini_api_key");

  if (!geminiApiKey) {
    return null
  }

  const handleClick = async () => {
    setError(null); // Clear previous error

    chooseImage().then(async file => {
      setLoading(true);

      try {
        const ocrResult = await gemini.ocrLyrics(file);
        onSuccess(ocrResult);
      } catch (err) {
        setError(err.message || "OCR failed");
        console.error("OCR Error:", err);
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={loading}>
        {loading ? "Loading..." : "OCR Import..."}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}


export function SongForm({ref, onSubmit, song, loading, submitLabel}) {
  const formRef = React.useRef();

  React.useImperativeHandle(ref, () => ({
    serialize() {
      const formData = new FormData(formRef.current);
      return {
        title: formData.get('title'),
        artist: formData.get('artist'),
        lyrics: formData.get('lyrics'),
        notes: formData.get('notes')
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
        if (res.lyrics) {
          form.querySelector('textarea[name="lyrics"]').value = res.lyrics;
        }
        if (res.notes) {
          form.querySelector('textarea[name="notes"]').value = res.notes;
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

    <label>
      Lyrics
      <textarea name="lyrics" rows="10" defaultValue={song?.lyrics || ''} required></textarea>
    </label>

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

    <div>
      <button type="submit" disabled={loading}>{submitLabel || 'Save'}</button>
    </div>
  </form>
}

export function NewSongDialog({onClose}) {
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef();

  // TODO: this needs to capture errors
  const handleSave = async (e) => {
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
  };

  return <Dialog onClose={onClose}>
    <h2>New Song</h2>
    <SongForm ref={formRef} onSubmit={handleSave} submitLabel="Create Song" />
  </Dialog>
}

export function EditSongDialog({songId, onClose}) {
  const formRef = React.useRef();
  const [loading, setLoading] = React.useState(false);
  const [song, error] = songs.useSong(songId);

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

  return <Dialog onClose={onClose}>
    <h2>Edit Song</h2>
    {erorr && <p>{error.toString()}</p>}
    {song && <SongForm ref={formRef} onSubmit={handleSave} song={song} loading={loading} />}
  </Dialog>
}

