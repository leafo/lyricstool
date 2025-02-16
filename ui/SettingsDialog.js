
import {settingsDialog, buttons} from './SettingsDialog.css';
import React from 'react';

import { useConfig } from '../config.js';
import { Dialog } from './Dialog';

import { exportToJSON, importFromJSON } from '../export.js';

function ConfigInput({ref, name, configName, ...inputProps})  {
  const inputRef = React.useRef();
  const [configValue, setConfigValue, loading] = useConfig(configName || name, (value, isInitial) => {
    const input = inputRef.current;
    if (isInitial || document.activeElement !== input) {
      input.value = value ?? '';
    }
  });

  React.useImperativeHandle(ref, () => ({
    save() {
      let value = inputRef.current.value;

      if (value == "") {
        value = null;
      }

      if (value === configValue) {
        return;
      }

      setConfigValue(value);
    }
  }));

  return <input ref={inputRef} name={name} {...inputProps} />
}

function downloadExport(e) {
  e.preventDefault();

  return (async () => {
    const exportJSON = await exportToJSON();
    const blob = new Blob([exportJSON], {type: 'application/json'});
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

function importExport(e) {
  e.preventDefault();

  return (async () => {
    const {contents, filename} = await new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = event => {
          resolve({
            contents: event.target.result,
            filename: file.name
          });
        };

        reader.onerror = error => reject(error);
        reader.readAsText(file);
      };

      input.click();
    })

    await importFromJSON(contents)
    console.log(`Imported completed from ${filename}`);
    window.location.reload();
  })().catch(err => {
    console.error(err);
    alert(`Failed to import from file: ${err.message}`);
  });
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
        Min Hint
        <ConfigInput ref={formRefs.minHint} name="min_hint" type="number" min="0" max="5" step="1" />
      </label>
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
      <summary>Backup data...</summary>
      <button type="button" onClick={downloadExport}>Download Export</button>
    </details>

    <details>
      <summary>Import backup...</summary>
      <p><strong>Warning:</strong> This will delete all existing data in the app and replace it with the backup data.</p>
      <button type="button" onClick={importExport}>Import from file (<code>lyricstool-xxxxxx.json</code>)</button>
    </details>
  </Dialog>
}
