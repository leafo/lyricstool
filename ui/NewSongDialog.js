
import React from 'react';
import './NewSongDialog.css';

import {Dialog} from './Dialog';
import {useAsync} from '../util';

import * as songs from '../songs';

import * as gemini from '../gemini';

// do any processing of the song data before saving
async function processSong(song, beforeSong) {

  // update chunks if the lyrics have changed
  if (!beforeSong || beforeSong.lyrics !== song.lyrics) {
    const response = await gemini.chunkLyrics(song.lyrics);

    if (!response.chunks) {
      return Promise.reject(new Error('Failed to extract chunks from lyrics'));
    }

    song.chunks = response.chunks
  }

  return song
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

  const content = React.useMemo(() => {
    if (error) {
      return <p>{error.toString()}</p>
    }

    if (song) {
      // TOOD: this needs to capture errors on failure
      const handleSave = async (e) => {
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
      };

      return <SongForm ref={formRef} onSubmit={handleSave} song={song} loading={loading} />
    }
  }, [song, error, loading]);

  return <Dialog onClose={onClose}>
    <h2>Edit Song</h2>
    {content}
  </Dialog>
}

