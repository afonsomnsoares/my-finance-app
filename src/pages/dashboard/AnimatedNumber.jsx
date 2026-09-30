import { useEffect, useRef, useState } from 'react';

export default function AnimatedNumber({ value, duration = 800, decimals = 0 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let startTime = null;
    const startVal = 0;
    const endVal = value;
    if (endVal === 0) { setDisplay(0); return; }
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(startVal + (endVal - startVal) * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <span ref={ref}>{display.toFixed(decimals)}</span>;
}
