
import React from 'react';
import './NewSongDialog.css';

import {Dialog} from './Dialog';
import {useAsync} from '../util';

import * as songs from '../songs';

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
    <SongForm ref={formRef} onSubmit={handleSave} submitLabel="Create Song" />
  </Dialog>
}

export function EditSongDialog({songId, onClose}) {
  const formRef = React.useRef();
  const [loading, setLoading] = React.useState(false);

  const [content] = useAsync(() =>
    songs.findSong(songId).then(song => {
      const handleSave = async (e) => {
        e.preventDefault();
        if (loading) {
          return;
        }

        setLoading(true);

        const data = formRef.current.serialize();
        const updatedSong = {...song, ...data};
        updatedSong.updatedAt = new Date().toISOString()

        console.log(await songs.updateSong(updatedSong))
        onClose();
      };

      return <SongForm ref={formRef} onSubmit={handleSave} song={song} loading={loading} />
    }).catch(err =>
      <p>{err.toString()}</p>
    )
  , [songId]);

  return <Dialog onClose={onClose}>
    <h2>Edit Song</h2>
    {content}
  </Dialog>
}

