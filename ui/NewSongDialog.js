
import React from 'react';
import './NewSongDialog.css';

import {Dialog} from './Dialog';

import * as songs from '../songs';

export function SongForm({ref, onSubmit, song}) {
  React.useImperativeHandle(ref, () => ({
    serialize() {
      const formData = new FormData(ref.current);
      return {
        title: formData.get('title'),
        artist: formData.get('artist'),
        lyrics: formData.get('lyrics'),
        notes: formData.get('notes')
      };
    }
  }));

  return <form onSubmit={onSubmit}>
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
      <button type="submit">Create Song</button>
    </div>
  </form>
}

export function NewSongDialog({onClose}) {
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef();

  const handleSave = async (e) => {
    e.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    const data = formRef.current.serialize();
    data.createdAt = new Date().toISOString()
    data.updatedAt = new Date().toISOString()

    console.log("Creating new song...", data);
    const songId = await songs.insertSong(data)
    console.log("New song created", songId);
    onClose();
  };

  return <Dialog onClose={onClose}>
    <h2>New Song</h2>
    <SongForm ref={formRef} onSubmit={handleSave} />
  </Dialog>
}

export function EditSongDialog({song, onClose}) {
  const [loading, setLoading] = React.useState(false);
  const formRef = React.useRef();

  const handleSave = async (e) => {
    e.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);

    const data = formRef.current.serialize();
    const updatedSong = {...song, ...data};
    updatedSong.updatedAt = new Date().toISOString()

    console.log("Updating song...", updatedSong);
    console.log(await songs.updateSong(song.id, updatedSong))
    onClose();
  };

  return <Dialog onClose={onClose}>
    <h2>Edit Song</h2>
    <SongForm onSubmit={handleSave} song={song} />
  </Dialog>
}

