import React from 'react';

import { EditSongDialog } from './NewSongDialog.js';
import { songViewer } from './SongViewer.css';
import { useRoute, updateRoute } from '../router.js';

import * as songs from '../songs.js';

export const SongViewer = ({ songId }) => {
  const routeParams = useRoute(["editSongId"]);
  const [song, error] = songs.useSong(songId);

  const content = React.useMemo(() => {
    if (error) {
      return <p>{error.toString()}</p>
    }

    if (song) {
      return <div className={songViewer}>
        <h1>{song.title}</h1>

        <div className="buttons">
          <button type="button" onClick={() => updateRoute({ editSongId: songId })}>Edit Song</button>
        </div>
      </div>
    }
  }, [song, error]);

  return  <>
    {content}
    {routeParams.editSongId && <EditSongDialog songId={routeParams.editSongId} onClose={() => updateRoute({ editSongId: false })} />}
  </>
};

