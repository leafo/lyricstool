import React from 'react';

export function useAsync(fn, inputs) {
  const [result, setResult] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    setResult(null);
    setError(null);

    let isMounted = true;

    fn().then(result => {
      if (isMounted) {
        setLoading(false);
        setResult(result);
      }
    }).catch(result => {
      if (isMounted) {
        setLoading(false);
        setError(result);
      }
    });

    return () => {
      isMounted = false;
    };
  }, inputs);

  return [result, error, loading];
}

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  const isSameYear = date.getFullYear() === now.getFullYear();

  const options = {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };

  if (!isSameYear) {
    options.year = 'numeric';
  }

  if (isToday) {
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return date.toLocaleString('en-US', options);
};
