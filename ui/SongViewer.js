import React from 'react';

import { EditSongDialog } from './NewSongDialog.js';

import { songViewer } from './SongViewer.css';

import { updateRoute } from '../router.js';

export const SongViewer = ({ songId }) => {
  const [song, setSong] = React.useState(null);
  return  <>
    <div className={songViewer}>
      <h1>{song.title}</h1>

      <div className="buttons">
        <button type="button" onClick={() => updateRoute({ editSongId: songId })}>Edit Song</button>
      </div>
    </div>
    {routeParams.editSongId && <EditSongDialog songId={routeParams.editSongId} onClose={() => updateRoute({ editSongId: false })} />}
  </>


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

