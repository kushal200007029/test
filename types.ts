
export interface PDFMetadata {
  name: string;
  size: number;
  totalPages: number;
}

export interface ConversionSettings {
  format: 'png' | 'jpeg';
  scale: number; // DPI equivalent (1 = 72dpi, 2 = 144dpi, etc.)
  quality: number; // 0 to 1
}

export interface ConvertedImage {
  id: string;
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

export interface AIInsights {
  summary: string;
  keywords: string[];
  suggestedFileName: string;
}
