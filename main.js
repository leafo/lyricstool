
import './ui/global.css';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { SongList } from './ui/SongList.js';
import { SongViewer } from './ui/SongViewer.js';
import { SongMeasureViewer } from './ui/SongMeasureViewer.js';

import { SettingsDialog } from './ui/SettingsDialog.js';
import { Header } from './ui/Header.js';
import { DumpConfig } from './ui/Debug.js';

import { chatgpt } from './openai.js';
import { gemini } from './gemini.js';

import { useRouteToggle, useRoute } from './router.js';

// just to test the prompt query works
function PromptTest() {
  const [prompt, setPrompt] = React.useState('');
  const [response, setResponse] = React.useState('');
  const [error, setError] = React.useState(null);

  const modelSelectRef = React.useRef();

  const submitPrompt = async (e) => {
    e.preventDefault();
    try {
      const model = modelSelectRef.current.value;
      if (model === 'chatgpt') {
        setResponse(await chatgpt(prompt));
      } else if (model === 'gemini') {
        setResponse(await gemini(prompt));
      } else {
        throw new Error(`Unknown model: ${model}`);
      }
    } catch (err) {
      setError(err.message || err);
    }
  };

  return (
    <div>
      <form onSubmit={submitPrompt}>
        <label>
          Model
          <select ref={modelSelectRef} >
            <option value="chatgpt">ChatGPT</option>
            <option value="gemini">Gemini</option>
          </select>
        </label>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
        />
        <button type="submit">Submit</button>
      </form>
      {response && <div><strong>Response:</strong> {response}</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}

function MainContent() {
  const routeParams = useRoute(["viewSongId", "viewMeasureSongId"]);

  if (routeParams.viewSongId) {
    return <SongViewer key={routeParams.viewSongId} songId={routeParams.viewSongId} />
  }

  if (routeParams.viewMeasureSongId) {
    return <SongMeasureViewer key={routeParams.viewMeasureSongId} songId={routeParams.viewMeasureSongId} />
  }

  return <>
    <SongList />

    {false && <details>
      <summary>Prompt Test</summary>
      <PromptTest />
    </details>}

    <DumpConfig />
  </>
}

function App() {
  const [showSettings, setShowSettings] = useRouteToggle('showSettings');

  return <>
    <Header />
    <MainContent />
    {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
  </>;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
