
import './ui/global.css';

import React from 'react';
import { createRoot } from 'react-dom/client';

import { SongList } from './ui/SongList.js';
import { SettingsDialog } from './ui/SettingsDialog.js';
import { Header } from './ui/Header.js';
import { DumpConfig } from './ui/Debug.js';

import { chatgpt } from './openai.js';

import { useRouteToggle } from './router.js';

// just to test the prompt query works
function PromptTest() {
  const [prompt, setPrompt] = React.useState('');
  const [response, setResponse] = React.useState('');
  const [error, setError] = React.useState(null);

  const submitPrompt = async (e) => {
    e.preventDefault();
    try {
      const result = await chatgpt(prompt);
      setResponse(result);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <form onSubmit={submitPrompt}>
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


function App() {
  const [showSettings, setShowSettings] = useRouteToggle('showSettings');

  // TODO: use this to control the page
  // const routeParams = useRoute();

  return <>
    <Header />
    <SongList />

    <details>
      <summary>Prompt Test</summary>
      <PromptTest />
    </details>

    <DumpConfig />
    {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
  </>;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
