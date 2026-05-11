import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileWarning, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface FileUploadProps {
  onDataLoaded: (reviews: string[]) => void;
  isLoading: boolean;
}

export function FileUpload({ onDataLoaded, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    // 10MB limit for browser-side safety
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large. Please upload an Excel file smaller than 10MB.");
      return;
    }

    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError("Please upload a valid Excel file (.xlsx or .xls)");
      return;
    }

    setError(null);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        // Optimization: Don't load full cell styles or metadata to save memory
        const workbook = await XLSX.read(data, { 
          type: 'binary',
          cellDates: false,
          cellStyles: false,
          cellFormula: false,
          bookDeps: false,
          bookFiles: false,
          bookProps: false,
          bookVBA: false
        });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Find the range of column A only to avoid reading other columns
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        range.e.c = 0; // End column = 0 (Column A)
        
        // Convert only Column A to JSON
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          range: range,
          blankrows: false,
          defval: null
        });
        
        // Extract Column A strings
        const reviews = json
          .flat()
          .filter(val => val !== null && String(val).trim() !== "")
          .map(val => String(val).trim());

        // Header detection and removal
        if (reviews.length > 0) {
          const firstVal = reviews[0].toLowerCase();
          if (firstVal === "review" || firstVal === "reviews" || firstVal === "text" || firstVal === "comment" || firstVal === "feedback") {
            reviews.shift();
          }
        }

        if (reviews.length === 0) {
          setError("No reviews found in Column A of the uploaded file.");
          return;
        }

        onDataLoaded(reviews);
      } catch (err) {
        console.error(err);
        setError("Error processing file. Ensure it's a valid Excel document with reviews in Column A.");
      }
    };

    reader.readAsBinaryString(file);
  }, [onDataLoaded]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={cn(
          "relative group border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ease-out flex flex-col items-center justify-center text-center",
          isDragging ? "border-white bg-white/5" : "border-white/10 hover:border-white/20",
          isLoading ? "opacity-50 pointer-events-none" : "cursor-pointer"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".xlsx, .xls"
          onChange={onFileInput}
        />

        <div className="mb-6 p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
          {isLoading ? (
            <Loader2 className="w-10 h-10 animate-spin text-white" />
          ) : (
            <Upload className="w-10 h-10 text-gray-400 group-hover:text-white transition-colors" />
          )}
        </div>

        <h3 className="text-xl font-display font-medium mb-2">
          {isLoading ? "Analyzing dataset..." : "Upload customer reviews"}
        </h3>
        <p className="text-gray-500 max-w-xs mx-auto">
          Drag and drop your Excel file here or click to browse. System will analyze Column A.
        </p>

        {error && (
          <div className="mt-6 flex items-center gap-2 text-red-400 text-sm bg-red-400/10 px-4 py-2 rounded-lg">
            <FileWarning className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 text-xs font-mono text-gray-500 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3 text-white/40" />
          Supports .xlsx & .xls
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3 h-3 text-white/40" />
          Column A extraction
        </div>
      </div>
    </div>
  );
}
