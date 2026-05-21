'use client';

// Dynamically imported so pdfjs doesn't break SSR
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Use the local worker bundled with pdfjs-dist
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    // Join items preserving column layout by using y-position grouping
    const items = content.items as Array<{ str: string; transform: number[] }>;

    // Group by approximate y-position (row) then sort by x (column)
    const rows = new Map<number, Array<{ x: number; str: string }>>();
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: item.transform[4], str: item.str });
    }

    // Sort rows top-to-bottom (higher y = higher on page in PDF coords)
    const sortedYs = [...rows.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const rowItems = rows.get(y)!.sort((a, b) => a.x - b.x);
      const rowText = rowItems.map((i) => i.str).join('  ');
      if (rowText.trim()) textParts.push(rowText);
    }
  }

  return textParts.join('\n');
}

export async function extractTextFromImage(file: File): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  // Pass File directly rather than a blob: URL (avoids cross-thread access issues)
  const { data } = await worker.recognize(file);
  await worker.terminate();
  return data.text;
}
