import { useState, useCallback, useEffect } from "react";

function storageKey(fileName: string) {
  return `readaloud:listened:${fileName}`;
}

export function useListenedPages(fileName: string) {
  const [listenedPages, setListenedPages] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!fileName) {
      setListenedPages(new Set());
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey(fileName));
      setListenedPages(stored ? new Set(JSON.parse(stored)) : new Set());
    } catch {
      setListenedPages(new Set());
    }
  }, [fileName]);

  const markListened = useCallback(
    (pageNum: number) => {
      setListenedPages((prev) => {
        if (prev.has(pageNum)) return prev;
        const next = new Set(prev);
        next.add(pageNum);
        try {
          localStorage.setItem(storageKey(fileName), JSON.stringify([...next]));
        } catch {}
        return next;
      });
    },
    [fileName]
  );

  return { listenedPages, markListened };
}
