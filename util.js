

import React from 'react';

export function useAsync(fn, inputs) {
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    let isMounted = true;

    fn().then(result => {
      if (isMounted) {
        setLoading(false);
        setResult(result);
      }
    }).catch(result => {
      if (isMounted) {
        setLoading(false);
        setResult(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, inputs);

  return [result, loading];
}
