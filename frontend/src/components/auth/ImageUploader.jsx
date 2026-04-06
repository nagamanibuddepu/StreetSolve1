import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

export default function ImageUploader({ onFiles, maxFiles = 5 }) {
  const [previews, setPreviews] = useState([]);

  const onDrop = useCallback((accepted) => {
    setPreviews(accepted.map(f => ({ file: f, url: URL.createObjectURL(f) })));
    onFiles(accepted);
  }, [onFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles, maxSize: 10 * 1024 * 1024,
  });

  const remove = (i) => {
    const updated = previews.filter((_, idx) => idx !== i);
    setPreviews(updated);
    onFiles(updated.map(p => p.file));
  };

  return (
    <div>
      <div {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-saffron bg-saffron/5' : 'border-gray-200 hover:border-saffron/50 bg-gray-50'}`}>
        <input {...getInputProps()} />
        <div className="text-3xl mb-2">📷</div>
        <p className="font-semibold text-gray-700 text-sm">{isDragActive ? 'Drop here!' : 'Upload Photos'}</p>
        <p className="text-xs text-gray-400 mt-1">Drag & drop or tap to select (max {maxFiles}, 10MB each)</p>
      </div>
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {previews.map((p, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden aspect-square">
              <img src={p.url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => remove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
