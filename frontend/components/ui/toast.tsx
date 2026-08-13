"use client";

import { useEffect } from "react";

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 4000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
      <button className="icon-btn" onClick={onClose} style={{ marginLeft: 12 }}>✕</button>
    </div>
  );
}

export default Toast;
