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

  const handleClick = React.useCallback((e) => {
    const dialogDimensions = dialogRef.current.getBoundingClientRect();
    if (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    ) {
      dialogRef.current.close();
    }
  }, []);

  return <dialog ref={dialogRef} onClick={handleClick} {...props} className={dialog}>
    {children}
  </dialog>
}
