
import {header, settingsToggle} from './Header.css';
import React from 'react';

import { useConfig } from '../config.js';
import { useRouteToggle } from '../router.js';

export function Header() {
  const [showSettings, setShowSettings] = useRouteToggle('showSettings');

  return <header className={header}>
    <h1>Lyrics Tool</h1>
    <button className={settingsToggle} onClick={() => setShowSettings(true)}>Settings...</button>
  </header>
}


