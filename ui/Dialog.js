import React from 'react';

import {dialog} from './Dialog.css';

export function Dialog({ref, children, ...props}) {
  const dialogRef = React.useRef();

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.showModal();
    }
  }, []);

  React.useImperativeHandle(ref, () => ({
    close() {
      dialogRef.current.close();
    }
  }));

  return <dialog ref={dialogRef} {...props} className={dialog}>
    {children}
  </dialog>
}
