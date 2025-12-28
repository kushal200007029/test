
import * as pdfjsLib from 'pdfjs-dist';
import { ConvertedImage, ConversionSettings } from '../types';

// Use a versioned worker URL from unpkg to ensure compatibility with the library version
// 5.4.449 is the version specified in the import map.
const PDFJS_VERSION = '5.4.449';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

export const getPDFMetadata = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  return {
    name: file.name,
    size: file.size,
    totalPages: pdf.numPages,
  };
};

export const convertPageToImage = async (
  file: File,
  pageNumber: number,
  settings: ConversionSettings
): Promise<ConvertedImage> => {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale: settings.scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Could not get canvas context');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // Fix: Address TypeScript error where RenderParameters expects a 'canvas' property
  // along with 'canvasContext'. Adding the canvas element satisfies the type requirement.
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  };

  // Using 'as any' to handle potential mismatches between specific environment types and the pdfjs library.
  await page.render(renderContext as any).promise;

  const mimeType = `image/${settings.format}`;
  const dataUrl = canvas.toDataURL(mimeType, settings.quality);
  
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), mimeType, settings.quality);
  });

  return {
    id: `p-${pageNumber}-${Date.now()}`,
    pageNumber,
    dataUrl,
    blob,
    width: canvas.width,
    height: canvas.height,
  };
};
