import React, { useRef } from 'react';
import { Upload } from 'lucide-react';
import {
  formatLabel,
  isDateKey,
  isImageKey,
  isMapsKey,
  isValidMapsUrl,
  isSelectKey,
  SELECT_OPTIONS,
} from '../../utils/letterForm';

interface DynamicFormFieldProps {
  fieldKey: string;
  value: string;
  formData: Record<string, string>;
  imageFiles: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onImageUpload: (key: string, base64: string) => void;
  today: string;
}

export function DynamicFormField({
  fieldKey,
  value,
  formData,
  imageFiles,
  onChange,
  onImageUpload,
  today,
}: DynamicFormFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      onImageUpload(fieldKey, base64);
      onChange(fieldKey, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {formatLabel(fieldKey)}
        {fieldKey === 'npwp' && <span className="text-gray-400 font-normal ml-1">(opsional)</span>}
      </label>

      {isSelectKey(fieldKey) ? (
        <div className="space-y-2">
          <select
            value={value}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-800 bg-white"
          >
            <option value="">Pilih {formatLabel(fieldKey).toLowerCase()}...</option>
            {SELECT_OPTIONS[fieldKey].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {fieldKey === 'status_perangkat' && formData[fieldKey] === 'Lainnya' && (
            <input
              type="text"
              value={formData['lainnya'] ?? ''}
              onChange={(e) => onChange('lainnya', e.target.value)}
              placeholder="Jelaskan kondisi perangkat..."
              className="w-full px-3 py-2.5 text-sm border border-amber-200 bg-amber-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 text-gray-800 placeholder:text-gray-400"
            />
          )}
        </div>
      ) : isImageKey(fieldKey) ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors text-gray-600"
            >
              <Upload size={14} className="text-emerald-600" />
              {imageFiles[fieldKey] ? 'Ganti Gambar' : 'Upload Gambar'}
            </button>
            {imageFiles[fieldKey] && (
              <span className="text-xs text-emerald-600">✓ Gambar dipilih</span>
            )}
          </div>
          {imageFiles[fieldKey] && (
            <img
              src={`data:image/png;base64,${imageFiles[fieldKey]}`}
              alt={fieldKey}
              className="max-h-40 rounded-lg border border-gray-200 object-contain"
            />
          )}
        </div>
      ) : isMapsKey(fieldKey) ? (
        <div className="space-y-1">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            placeholder="https://www.google.com/maps/@-7.123,112.456,15z"
            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 text-gray-800 bg-white placeholder:text-gray-300 ${
              value && !isValidMapsUrl(value)
                ? 'border-red-300 focus:ring-red-200'
                : 'border-gray-200 focus:ring-emerald-300'
            }`}
          />
          {value && !isValidMapsUrl(value) && (
            <p className="text-xs text-red-500">Masukkan link Google Maps yang valid</p>
          )}
          {value && isValidMapsUrl(value) && (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline inline-block mt-0.5"
            >
              Buka di Maps →
            </a>
          )}
        </div>
      ) : isDateKey(fieldKey) ? (
        <input
          type="date"
          value={value || today}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-800 bg-white"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          placeholder={`Masukkan ${formatLabel(fieldKey).toLowerCase()}`}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 text-gray-800 bg-white placeholder:text-gray-300"
        />
      )}
    </div>
  );
}
