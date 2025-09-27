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

  const mouseDownOutside = React.useRef(false);

  const isOutsideDialog = React.useCallback((e) => {
    const dialogDimensions = dialogRef.current.getBoundingClientRect();
    return (
      e.clientX < dialogDimensions.left ||
      e.clientX > dialogDimensions.right ||
      e.clientY < dialogDimensions.top ||
      e.clientY > dialogDimensions.bottom
    );
  }, []);

  const handleMouseDown = React.useCallback((e) => {
    mouseDownOutside.current = isOutsideDialog(e);
  }, [isOutsideDialog]);

  const handleMouseUp = React.useCallback((e) => {
    if (mouseDownOutside.current && isOutsideDialog(e)) {
      dialogRef.current.close();
    }
    mouseDownOutside.current = false;
  }, [isOutsideDialog]);

  return <dialog ref={dialogRef} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} {...props} className={dialog}>
    {children}
  </dialog>
}
