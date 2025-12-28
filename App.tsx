
import React, { useState, useCallback, useRef } from 'react';
import { 
  FileUp, 
  Settings, 
  Download, 
  Trash2, 
  LayoutGrid, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { getPDFMetadata, convertPageToImage } from './services/pdfProcessor';
import { analyzePDFContent, extractTextFromFirstPage } from './services/geminiService';
import { PDFMetadata, ConversionSettings, ConvertedImage, AIInsights } from './types';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<PDFMetadata | null>(null);
  const [settings, setSettings] = useState<ConversionSettings>({
    format: 'png',
    scale: 2,
    quality: 0.92,
  });
  const [images, setImages] = useState<ConvertedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile && uploadedFile.type === 'application/pdf') {
      setFile(uploadedFile);
      setImages([]);
      setAiInsights(null);
      setProgress(0);
      try {
        const meta = await getPDFMetadata(uploadedFile);
        setMetadata(meta);
        
        // Parallel AI Analysis
        setIsAnalyzing(true);
        const text = await extractTextFromFirstPage(uploadedFile);
        const insights = await analyzePDFContent(text);
        setAiInsights(insights);
        setIsAnalyzing(false);
      } catch (err) {
        console.error("Error reading PDF:", err);
      }
    }
  };

  const convertAllPages = async () => {
    if (!file || !metadata) return;
    setIsProcessing(true);
    setImages([]);
    const total = metadata.totalPages;
    const results: ConvertedImage[] = [];

    for (let i = 1; i <= total; i++) {
      try {
        const img = await convertPageToImage(file, i, settings);
        results.push(img);
        setImages((prev) => [...prev, img]);
        setProgress(Math.round((i / total) * 100));
      } catch (err) {
        console.error(`Failed to convert page ${i}:`, err);
      }
    }
    setIsProcessing(false);
  };

  const downloadAllAsZip = async () => {
    if (images.length === 0) return;
    const zip = new JSZip();
    const folderName = aiInsights?.suggestedFileName || metadata?.name.replace('.pdf', '') || 'pdf_export';
    
    images.forEach((img) => {
      zip.file(`${folderName}_page_${img.pageNumber}.${settings.format}`, img.blob);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${folderName}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadSingle = (img: ConvertedImage) => {
    const folderName = aiInsights?.suggestedFileName || metadata?.name.replace('.pdf', '') || 'pdf_export';
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = `${folderName}_page_${img.pageNumber}.${settings.format}`;
    link.click();
  };

  const clearAll = () => {
    setFile(null);
    setMetadata(null);
    setImages([]);
    setAiInsights(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <ImageIcon size={24} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
              PDFPulse
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://github.com" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Help</a>
            <button 
              onClick={() => window.location.reload()}
              className="text-sm px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors font-medium text-gray-700"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {!file ? (
          /* Landing / Upload State */
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Convert PDF to High-Quality Images
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Lightning fast conversion. Securely processed in your browser.
              No server uploads.
            </p>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group relative cursor-pointer border-2 border-dashed border-gray-300 rounded-3xl p-12 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all duration-300"
            >
              <input 
                type="file" 
                className="hidden" 
                ref={fileInputRef} 
                accept=".pdf" 
                onChange={handleFileUpload}
              />
              <div className="flex flex-col items-center">
                <div className="mb-6 p-4 bg-indigo-100 rounded-full text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                  <FileUp size={48} />
                </div>
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  Drop your PDF here
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  or click to browse from your computer
                </p>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-white border rounded-full text-gray-600">
                    <CheckCircle size={14} className="text-green-500" /> High Quality
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-white border rounded-full text-gray-600">
                    <CheckCircle size={14} className="text-green-500" /> Private & Secure
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-white border rounded-full text-gray-600">
                    <CheckCircle size={14} className="text-green-500" /> Zero Cost
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Active Conversion Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar Controls */}
            <aside className="lg:col-span-4 space-y-6">
              {/* File Info & AI Insights */}
              <div className="bg-white rounded-2xl border shadow-sm p-6 overflow-hidden relative">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-50 p-2.5 rounded-xl text-red-500">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1">{metadata?.name}</h3>
                      <p className="text-xs text-gray-500">
                        {metadata ? `${(metadata.size / (1024 * 1024)).toFixed(2)} MB • ${metadata.totalPages} Pages` : 'Loading...'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={clearAll}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* AI Summary Box */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">AI Document Insight</span>
                  </div>
                  {isAnalyzing ? (
                    <div className="flex items-center gap-2 py-4 text-indigo-400">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm italic">Analyzing contents...</span>
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {aiInsights.summary}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {aiInsights.keywords.map((k, idx) => (
                          <span key={idx} className="text-[10px] font-semibold bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No analysis available</p>
                  )}
                </div>
              </div>

              {/* Conversion Settings */}
              <div className="bg-white rounded-2xl border shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Settings size={20} className="text-gray-400" />
                  <h3 className="font-bold text-gray-900 text-lg">Settings</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setSettings({...settings, format: 'png'})}
                        className={`py-2 px-4 rounded-xl text-sm font-semibold transition-all ${settings.format === 'png' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        PNG
                      </button>
                      <button 
                        onClick={() => setSettings({...settings, format: 'jpeg'})}
                        className={`py-2 px-4 rounded-xl text-sm font-semibold transition-all ${settings.format === 'jpeg' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        JPG
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                      <span>Resolution (DPI)</span>
                      <span className="text-indigo-600 font-bold">{Math.round(settings.scale * 72)} DPI</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="4" 
                      step="0.5" 
                      value={settings.scale}
                      onChange={(e) => setSettings({...settings, scale: parseFloat(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1 uppercase font-bold">
                      <span>Draft (72)</span>
                      <span>High (300)</span>
                    </div>
                  </div>

                  {settings.format === 'jpeg' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex justify-between">
                        <span>Quality</span>
                        <span className="text-indigo-600 font-bold">{Math.round(settings.quality * 100)}%</span>
                      </label>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1" 
                        step="0.05" 
                        value={settings.quality}
                        onChange={(e) => setSettings({...settings, quality: parseFloat(e.target.value)})}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                    </div>
                  )}

                  <button 
                    disabled={isProcessing}
                    onClick={convertAllPages}
                    className={`w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-white font-bold transition-all shadow-lg active:scale-95 ${isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90'}`}
                  >
                    {isProcessing ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <ImageIcon size={24} />
                    )}
                    {isProcessing ? `Converting... ${progress}%` : `Convert ${metadata?.totalPages} Pages`}
                  </button>
                </div>
              </div>

              {images.length > 0 && (
                <div className="bg-white rounded-2xl border shadow-sm p-6 border-green-100">
                   <div className="flex items-center gap-2 mb-4">
                    <Download size={20} className="text-green-600" />
                    <h3 className="font-bold text-gray-900 text-lg">Download</h3>
                  </div>
                  <button 
                    onClick={downloadAllAsZip}
                    className="w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold transition-all shadow-lg active:scale-95"
                  >
                    <LayoutGrid size={24} />
                    Download All as ZIP
                  </button>
                  <p className="mt-4 text-xs text-center text-gray-500">
                    Total images: {images.length}
                  </p>
                </div>
              )}
            </aside>

            {/* Preview Area */}
            <section className="lg:col-span-8">
              {images.length === 0 && !isProcessing ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl h-96 flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon size={64} strokeWidth={1} className="mb-4" />
                  <p className="text-lg font-medium">Click "Convert" to generate previews</p>
                  <p className="text-sm">Processed locally for your privacy</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {images.map((img) => (
                    <div key={img.id} className="group relative bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col hover:shadow-xl transition-all duration-300">
                      <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
                        <img 
                          src={img.dataUrl} 
                          alt={`Page ${img.pageNumber}`} 
                          className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-4 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                            {img.pageNumber}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {img.width}x{img.height}px
                          </span>
                        </div>
                        <button 
                          onClick={() => downloadSingle(img)}
                          className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          title="Download this page"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {isProcessing && progress < 100 && (
                    <div className="aspect-[3/4] rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/30 flex flex-col items-center justify-center animate-pulse">
                      <div className="relative">
                        <Loader2 size={40} className="text-indigo-400 animate-spin" />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                          {progress}%
                        </span>
                      </div>
                      <p className="mt-4 text-sm font-medium text-indigo-600">Converting Page {images.length + 1}...</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 opacity-50">
              <ImageIcon size={20} />
              <span className="font-bold text-sm">PDFPulse Image Converter</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-500 font-medium">
              <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-indigo-600 transition-colors">Contact</a>
            </div>
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} PDFPulse. All processing happens in-browser.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
