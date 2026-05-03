import { useState, useEffect } from "react";

const STORAGE_KEY = "readaloud:apikey";

export function useApiKey() {
  const [requiresApiKey, setRequiresApiKey] = useState(false);
  const [apiKey, setApiKeyState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? ""
  );

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => setRequiresApiKey(data.requiresApiKey))
      .catch(() => {});
  }, []);

  const setApiKey = (key: string) => {
    localStorage.setItem(STORAGE_KEY, key);
    setApiKeyState(key);
  };

  return { requiresApiKey, apiKey, setApiKey };
}
