
import {header, settingsToggle} from './Header.css';
import React from 'react';

import { useConfig } from '../config.js';
import { useRoute, useRouteToggle, setRoute } from '../router.js';

export function Header() {
  const [showSettings, setShowSettings] = useRouteToggle('showSettings');
  const routeParams = useRoute(["viewSongId"]);

  return <header className={header}>
    {routeParams.viewSongId && (
      <button className="menuButton" type="button" onClick={() => setRoute({})}>
        <span className="icon">&#9776;</span>
      </button>
    )}

    <h1>Lyrics Tool</h1>
    <button className={settingsToggle} onClick={() => setShowSettings(true)}>Settings...</button>
  </header>
}


