import { useState, useCallback, useEffect } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Use local worker via CDN (avoids bundling issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PdfPage {
  pageNum: number;
  text: string;
}

const LAST_BOOK_KEY = "readaloud:lastbook";
const LAST_BOOK_PAGES_KEY = "readaloud:lastbook-pages";
const LAST_BOOK_ID_KEY = "readaloud:lastbook-id";

// Target size of a "page" when splitting pasted text.
const PASTE_PAGE_CHARS = 3000;

function saveLastBook(fileName: string, docId: string, pages: PdfPage[]) {
  try {
    localStorage.setItem(LAST_BOOK_KEY, fileName);
    localStorage.setItem(LAST_BOOK_ID_KEY, docId);
    localStorage.setItem(LAST_BOOK_PAGES_KEY, JSON.stringify(pages));
  } catch {}
}

function clearLastBook() {
  try {
    localStorage.removeItem(LAST_BOOK_KEY);
    localStorage.removeItem(LAST_BOOK_ID_KEY);
    localStorage.removeItem(LAST_BOOK_PAGES_KEY);
  } catch {}
}

function loadLastBook(): {
  fileName: string;
  docId: string;
  pages: PdfPage[];
} | null {
  try {
    const fileName = localStorage.getItem(LAST_BOOK_KEY);
    const raw = localStorage.getItem(LAST_BOOK_PAGES_KEY);
    // Books saved before docId existed were PDFs keyed by file name.
    const docId = localStorage.getItem(LAST_BOOK_ID_KEY) ?? fileName;
    if (fileName && docId && raw) {
      return { fileName, docId, pages: JSON.parse(raw) };
    }
  } catch {}
  return null;
}

// Short, stable content hash (FNV-1a) so different pasted texts never share
// audio cache entries or listened-page history.
function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Split pasted text into page-sized pieces, keeping paragraphs together where
// possible and falling back to sentence boundaries for very long paragraphs.
export function splitTextIntoPages(text: string): PdfPage[] {
  const units = text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .flatMap((p) =>
      p.length > PASTE_PAGE_CHARS ? p.split(/(?<=[.!?])\s+/) : [p]
    );

  const pages: PdfPage[] = [];
  let current = "";
  for (const unit of units) {
    if (current && (current + " " + unit).length > PASTE_PAGE_CHARS) {
      pages.push({ pageNum: pages.length + 1, text: current });
      current = unit;
    } else {
      current = current ? `${current} ${unit}` : unit;
    }
  }
  if (current) pages.push({ pageNum: pages.length + 1, text: current });
  return pages;
}

function pastedTitle(text: string): string {
  const words = text.trim().split(/\s+/).slice(0, 6).join(" ");
  return words.length < text.trim().length ? `${words}…` : words;
}

export function usePdfExtractor() {
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [fileName, setFileName] = useState<string>("");
  // Stable identifier used for audio cache keys and listened-page tracking.
  // For PDFs it's the file name (unchanged from before); for pasted text it's
  // derived from the content.
  const [docId, setDocId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = loadLastBook();
    if (saved) {
      setFileName(saved.fileName);
      setDocId(saved.docId);
      setPages(saved.pages);
    }
  }, []);

  const extractPdf = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setPages([]);
    setFileName(file.name);
    setDocId(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const extracted: PdfPage[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const text = content.items
          .map((item: any) => item.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (text.length > 0) {
          extracted.push({ pageNum: i, text });
        }
      }

      if (extracted.length === 0) {
        setError(
          "No text found in this PDF. It may be a scanned image — try pasting the text instead."
        );
        setFileName("");
        setDocId("");
        return;
      }

      setPages(extracted);
      saveLastBook(file.name, file.name, extracted);
    } catch (e) {
      setError("Failed to read the PDF. Please check that the file is valid.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadText = useCallback((text: string) => {
    const pages = splitTextIntoPages(text);
    if (pages.length === 0) return;
    const name = pastedTitle(text);
    const id = `paste:${hashText(text)}`;
    setError(null);
    setPages(pages);
    setFileName(name);
    setDocId(id);
    saveLastBook(name, id, pages);
  }, []);

  const reset = useCallback(() => {
    setPages([]);
    setFileName("");
    setDocId("");
    setError(null);
    clearLastBook();
  }, []);

  return { pages, fileName, docId, loading, error, extractPdf, loadText, reset };
}
