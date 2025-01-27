
import React from 'react';
import './NewSongDialog.css';

import {Dialog} from './Dialog';

export function NewSongDialog({onClose}) {
  const [loading, setLoading] = React.useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);

    const formData = new FormData(e.target);
    const data = {
      title: formData.get('title'),
      lyrics: formData.get('lyrics'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log("Create new song:", data);
    // send it to the database;
    throw new Error('Not implemented');
  };

  return <Dialog onClose={onClose}>
    <h2>New Song</h2>
    <form onSubmit={handleSave}>
      <label>
        Song Title:
        <input type="text" name="title" required />
      </label>
      <label>
        Lyrics:
        <textarea name="lyrics" required></textarea>
      </label>

      <div>
        <button type="submit">Create Song</button>
      </div>
    </form>
  </Dialog>
}
