
import React from 'react';
import { config, useConfig, useFullConfig } from '../config.js';

export function DumpConfig() {
  const { config: fullConfig, loading } = useFullConfig();

  if (loading) {
    return <div>Loading configuration...</div>;
  }

  const clearConfig = () => {
    for (const key in fullConfig) {
      config.remove(key);
    }
  };

  return <section>
    <details>
      <summary>Config</summary>
      <pre>{JSON.stringify(fullConfig, null, 2)}</pre>
      <button type="button" onClick={clearConfig}>Clear Config</button>
    </details>
  </section>
}

// just testing the config hooks
export function MyValueForm() {
  const inputRef = React.useRef();
  const [myValue, setMyValue] = useConfig('my_value', (value) => {
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
