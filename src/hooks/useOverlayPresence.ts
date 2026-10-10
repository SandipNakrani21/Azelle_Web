import { useEffect, useState } from "react";

// Keep the exit transition, then remove the hidden panel and its images from the DOM.
export function useOverlayPresence(open: boolean) {
  const [closing, setClosing] = useState(open);
  useEffect(() => {
    if (open) {
      setClosing(true);
      return;
    }
    const timer = window.setTimeout(() => setClosing(false), 500);
    return () => window.clearTimeout(timer);
  }, [open]);
  return open || closing;
}
