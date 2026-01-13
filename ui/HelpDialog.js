import React from 'react';
import css from './HelpDialog.css';
import { Dialog } from './Dialog.js';

export function HelpDialog({ onClose }) {
  return <Dialog onClose={onClose}>
    <h2>Keyboard Shortcuts</h2>
    <dl className={css.hotkeyList}>
      <dt>Ctrl + ←/→</dt>
      <dd>Previous/Next line</dd>
      <dt>Alt + ←/→</dt>
      <dd>Previous/Next word</dd>
      <dt>Ctrl + ↑/↓</dt>
      <dd>Increase/Decrease hint level</dd>
      <dt>Enter / Space</dt>
      <dd>Submit typed word</dd>
    </dl>
    <button type="button" onClick={onClose}>Close</button>
  </Dialog>
}
