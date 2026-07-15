// web/src/hooks/useToast.js


import { useState, useCallback, useRef, useEffect } from "react";

export function useToast(durationMs = 3000) {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const notify = useCallback((msg, isErr = false) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ msg, isErr });
    timeoutRef.current = setTimeout(() => setToast(null), durationMs);
  }, [durationMs]);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return { toast, notify };
}