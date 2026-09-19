import { useState, useEffect } from 'react';

export function useLiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const utcString = time.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const localString = time.toLocaleTimeString('en-US', { hour12: false });
  const dateString = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return { time, utcString, localString, dateString };
}
