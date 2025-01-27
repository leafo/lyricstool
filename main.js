
import './ui/global.css';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { useConfig } from './config.js';

import { SettingsDialog } from './ui/SettingsDialog.js';
import { Header } from './ui/Header.js';
import { DumpConfig } from './ui/Debug.js';
import { NewSongDialog } from './ui/NewSongDialog.js';

function App() {
  const [showSettings, setShowSettings] = useConfig('ui:settingsOpen');
  const [showNewSongDialog, setShowNewSongDialog] = useConfig('ui:newSongDialogOpen');

  return <>
    <Header />
    <button onClick={() => setShowNewSongDialog(true)}>New Song...</button>

    <DumpConfig />
    {showNewSongDialog && <NewSongDialog onClose={() => setShowNewSongDialog(false)} />}
    {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
  </>;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
