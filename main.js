
import React from 'react';
import { createRoot } from 'react-dom/client';

import { useConfig, useFullConfig } from './config.js';

function DumpConfig() {
  const { config, loading } = useFullConfig();

  if (loading) {
    return <div>Loading configuration...</div>;
  }

  return (
    <section>
      <h2>Config:</h2>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </section>
  );
}

function MyValueForm() {
  const inputRef = React.useRef();
  const [myValue, setMyValue] = useConfig('my_value', (value) => {
    console.log('Got update event', value);
    const input = inputRef.current;
    if (document.activeElement !== input) {
      input.value = value || '';
    }
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const value = inputRef.current.value;
      setMyValue(value);
    }}>
      <label>
        My Value:
        <input ref={inputRef} name="myValue" defaultValue={myValue || ''} />
      </label>
      <button type="submit">Save</button>
    </form>
  );
}


function App() {
  return <>
    <MyValueForm />
    <MyValueForm />
    <DumpConfig />
  </>;
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
