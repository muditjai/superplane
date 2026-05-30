import { useCallback, useState } from 'react';

interface UploadDropzoneProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export default function UploadDropzone({ onUpload, disabled }: UploadDropzoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === 'application/pdf') onUpload(file);
    },
    [onUpload]
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`block cursor-pointer rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-colors ${
        dragging
          ? 'border-emerald-400 bg-emerald-950/30'
          : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
      />
      <p className="text-xl font-medium text-zinc-100">
        Drop your PDF here to redact and share
      </p>
      <p className="mt-2 text-zinc-400">or click to browse</p>
      <div className="mt-6 flex justify-center gap-3">
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
          Privacy Protected
        </span>
        <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-300">
          PDF Only
        </span>
      </div>
    </label>
  );
}
