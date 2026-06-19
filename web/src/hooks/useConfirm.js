// web/src/hooks/useConfirm.js
//
// Usage:
//   const { confirm, dialogProps } = useConfirm();
//   ...
//   <ConfirmDialog {...dialogProps} />
//   ...
//   const ok = await confirm({ title: "Delete group?", message: "...", danger: true });
//   if (!ok) return;

import { useState, useCallback, useRef } from "react";

export function useConfirm() {
  const [state, setState] = useState({ open: false, title: "", message: "", danger: false, confirmLabel: "Confirm" });
  const resolverRef = useRef(null);

  const confirm = useCallback((opts) => {
    setState({ open: true, confirmLabel: "Confirm", danger: false, ...opts });
    return new Promise(resolve => { resolverRef.current = resolve; });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolverRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolverRef.current?.(false);
  }, []);

  return {
    confirm,
    dialogProps: { ...state, onConfirm: handleConfirm, onCancel: handleCancel },
  };
}