import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

export default function ImageUpload({ files, onChange }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024,
    onDrop: (accepted) => onChange([...files, ...accepted].slice(0, 5)),
  });

  const remove = (i) => onChange(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
        ${isDragActive ? 'border-saffron bg-saffron/5' : files.length ? 'border-civic-green bg-civic-green-pale' : 'border-gray-200 bg-gray-50 hover:border-saffron/50'}`}>
        <input {...getInputProps()} />
        {files.length > 0 ? (
          <div className="text-civic-green">
            <div className="text-2xl mb-1">📸</div>
            <div className="font-600 text-sm">{files.length} photo(s) selected</div>
            <div className="text-xs opacity-70">Tap to add more (max 5)</div>
          </div>
        ) : (
          <div className="text-gray-400">
            <div className="text-3xl mb-2">📷</div>
            <div className="font-600 text-sm text-gray-600">Upload Issue Photos</div>
            <div className="text-xs mt-1">Drag & drop or tap to select · Max 10MB each</div>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {files.map((f, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative">
              <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-xl border border-gray-200" />
              <button onClick={() => remove(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-700 hover:bg-red-600">✕</button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
