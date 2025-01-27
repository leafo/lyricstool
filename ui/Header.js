
import {header, settingsToggle} from './Header.css';
import React from 'react';

import { useConfig } from '../config.js';

export function Header() {
  const [showSettings, setShowSettings] = useConfig('ui:settingsOpen');
  return <header className={header}>
    <h1>Lyrics Tool</h1>
    <button className={settingsToggle} onClick={() => setShowSettings(true)}>Show Settings</button>
  </header>
}


