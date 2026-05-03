import { useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Use local worker via CDN (avoids bundling issues)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PdfPage {
  pageNum: number;
  text: string;
}

export function usePdfExtractor() {
  const [pages, setPages] = useState<PdfPage[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extractPdf = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setPages([]);
    setFileName(file.name);

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

      setPages(extracted);
    } catch (e) {
      setError("Failed to read the PDF. Please check that the file is valid.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPages([]);
    setFileName("");
    setError(null);
  }, []);

  return { pages, fileName, loading, error, extractPdf, reset };
}
