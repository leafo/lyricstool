import React from 'react';

import { EditSongDialog } from './NewSongDialog.js';

import { songViewer } from './SongViewer.css';

export const SongViewer = ({ songId }) => {
  const [song, setSong] = React.useState(null);
  return <div className={songViewer}>Song Viewer</div>;

  // if (!song) {
  //   return <div>No song selected</div>;
  // }

  // return (
  //   <div>
  //     <h1>{song.title}</h1>
  //     {song.artist && <h2>{song.artist}</h2>}
  //     <div>
  //       <pre>{song.lyrics}</pre>
  //     </div>
  //   </div>
  // );
};

