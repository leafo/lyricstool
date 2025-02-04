
import {settingsDialog, buttons} from './SettingsDialog.css';
import React from 'react';

import { useConfig } from '../config.js';
import { Dialog } from './Dialog';

import { exportToJSON } from '../export.js';

function ConfigInput({ref, name, configName})  {
  const inputRef = React.useRef();
  const [apiKey, setApiKey] = useConfig(configName || name, (value) => {
    const input = inputRef.current;
    if (document.activeElement !== input) {
      input.value = value || '';
    }
  });

  React.useImperativeHandle(ref, () => ({
    save() {
      const value = inputRef.current.value;
      setApiKey(value);
    }
  }));

  return <input ref={inputRef} name={name} defaultValue={apiKey || ''} />
}

function downloadExport(e) {
  e.preventDefault();

  return (async () => {
    const exportData = await exportToJSON();
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lyricstool-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  })();
}

export function SettingsDialog({onClose}) {
  const dialogRef = React.useRef();

  const formRefs = new Proxy({}, {
    get: (target, prop) => {
      if (!target[prop]) {
        target[prop] = React.createRef();
      }
      return target[prop];
    }
  });

  const handleSave = (e) => {
    e.preventDefault();
    Object.values(formRefs).forEach(ref => {
      if (ref.current) {
        ref.current.save();
        dialogRef.current.close();
      }
    });
  };

  return <Dialog ref={dialogRef} onClose={onClose}>
    <h2>Settings</h2>
    <form onSubmit={handleSave}>
      <label>
        OpenAI API Key
        <ConfigInput ref={formRefs.openAiApiKey} name="openai_api_key" />
      </label>
      <label>
        Gemini API Key
        <ConfigInput ref={formRefs.geminiApiKey} name="gemini_api_key" />
      </label>
      <div className={buttons}>
        <button type="submit">Save</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </form>

    <details>
      <summary>Backup Data...</summary>
      <button type="button" onClick={downloadExport}>Download Export</button>
    </details>
  </Dialog>
}
