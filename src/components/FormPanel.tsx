import React, { useState, useRef } from 'react';
import { PosterData } from '../types';
import { validateAndProcessImage } from '../utils';
import { 
  Building2, 
  Image as ImageIcon, 
  FileText, 
  Palette, 
  Share2, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Eye, 
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Move
} from 'lucide-react';
import { SocialIcon } from './SocialIcons';

interface FormPanelProps {
  data: PosterData;
  onChange: (newData: Partial<PosterData>) => void;
  onReset: () => void;
  onExport: () => void;
  isExporting: boolean;
  darkMode?: boolean;
}

export const FormPanel: React.FC<FormPanelProps> = ({ 
  data, 
  onChange, 
  onReset, 
  onExport, 
  isExporting,
  darkMode = false
}) => {
  // Accordion active sections: true (expanded) or false (collapsed)
  const [activeSections, setActiveSections] = useState({
    instansi: true,
    background: true,
    content: true,
    styling: false,
    footer: false
  });

  const toggleSection = (section: keyof typeof activeSections) => {
    setActiveSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Drag and drop state for background upload
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for general errors/toasts
  const [localError, setLocalError] = useState<string | null>(null);

  const triggerUploadClick = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) {
      ref.current.click();
    }
  };

  // Unified File Input Handler with validations
  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'instansiLogo' | 'logoKanan1' | 'logoKanan2' | 'bgImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLocalError(null);
      const base64 = await validateAndProcessImage(file);
      onChange({ [field]: base64 });
    } catch (err: any) {
      setLocalError(err.message || "Gagal memproses gambar");
      // Auto-clear error after 4s
      setTimeout(() => setLocalError(null), 4000);
    }
  };

  // Drag-and-Drop Handlers for Poster Background Image
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    try {
      setLocalError(null);
      const base64 = await validateAndProcessImage(file);
      onChange({ bgImage: base64 });
    } catch (err: any) {
      setLocalError(err.message || "Gagal memproses gambar");
      setTimeout(() => setLocalError(null), 4000);
    }
  };

  const clearImageField = (field: 'instansiLogo' | 'logoKanan1' | 'logoKanan2' | 'bgImage') => {
    onChange({ [field]: null });
  };

  // Social media icon chip selection
  const availableIcons = [
    { key: 'ig', label: 'Instagram' },
    { key: 'yt', label: 'YouTube' },
    { key: 'fb', label: 'Facebook' },
    { key: 'web', label: 'Website' },
    { key: 'tw', label: 'X / Twitter' },
    { key: 'tt', label: 'TikTok' }
  ];

  const toggleSocialIcon = (iconKey: string) => {
    let updated = [...data.footerIcons];
    if (updated.includes(iconKey)) {
      updated = updated.filter(key => key !== iconKey);
    } else {
      updated.push(iconKey);
    }
    onChange({ footerIcons: updated });
  };

  return (
    <div className="w-full flex flex-col gap-4 pb-24 md:pb-6">
      
      {/* Alert Error Dialog */}
      {localError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-start gap-2.5 animate-bounce">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-800">Gagal mengunggah file</p>
            <p className="text-xs">{localError}</p>
          </div>
          <button 
            onClick={() => setLocalError(null)} 
            className="text-rose-400 hover:text-rose-600 p-0.5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 📌 SECTION 1 — IDENTITAS INSTANSI */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <button
          onClick={() => toggleSection('instansi')}
          className={`w-full flex items-center justify-between p-4 transition-colors font-semibold text-left ${
            darkMode ? 'bg-slate-950/40 hover:bg-slate-800/40 text-slate-100' : 'bg-slate-50 hover:bg-slate-100/80 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-emerald-950/50 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-sm font-bold leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>📌 SECTION 1 — Identitas Instansi</p>
              <p className={`text-[11px] font-normal ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Atur logo dan nama instansi di header poster</p>
            </div>
          </div>
          {activeSections.instansi ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {activeSections.instansi && (
          <div className={`p-5 flex flex-col gap-5 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
            {/* Logo Kiri Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Upload Logo Instansi (Bulat)
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-16 h-16 rounded-full border-2 border-[#D4AF37] overflow-hidden flex items-center justify-center shadow-inner shrink-0 ${
                      darkMode ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                      {data.instansiLogo ? (
                        <img 
                          src={data.instansiLogo} 
                          alt="Logo instansi" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-slate-400">🏛️</span>
                      )}
                    </div>
                    {data.instansiLogo && (
                      <button
                        onClick={() => clearImageField('instansiLogo')}
                        title="Hapus Logo"
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('logoInstansiInput');
                      if (el) el.click();
                    }}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
                      darkMode 
                        ? 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border-emerald-900/40' 
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Pilih Logo
                  </button>
                  <input
                    id="logoInstansiInput"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageFileChange(e, 'instansiLogo')}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Logo Kanan 1 & 2 */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Logo Pendamping (Kanan)
                </label>
                <div className="flex gap-4">
                  {/* Logo Kanan 1 */}
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className={`relative w-12 h-12 rounded-lg border flex items-center justify-center overflow-hidden ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {data.logoKanan1 ? (
                        <img src={data.logoKanan1} alt="Logo kanan 1" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs font-mono text-slate-400">#1</span>
                      )}
                      {data.logoKanan1 && (
                        <button
                          onClick={() => clearImageField('logoKanan1')}
                          className="absolute top-0 right-0 bg-rose-500 text-white rounded-bl-lg p-0.5 shadow-md hover:bg-rose-600"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => document.getElementById('logoKanan1Input')?.click()}
                      className={`text-[10px] font-semibold underline ${darkMode ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600'}`}
                    >
                      Unggah 1
                    </button>
                    <input
                      id="logoKanan1Input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, 'logoKanan1')}
                      className="hidden"
                    />
                  </div>

                  {/* Logo Kanan 2 */}
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    <div className={`relative w-12 h-12 rounded-lg border flex items-center justify-center overflow-hidden ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}>
                      {data.logoKanan2 ? (
                        <img src={data.logoKanan2} alt="Logo kanan 2" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs font-mono text-slate-400">#2</span>
                      )}
                      {data.logoKanan2 && (
                        <button
                          onClick={() => clearImageField('logoKanan2')}
                          className="absolute top-0 right-0 bg-rose-500 text-white rounded-bl-lg p-0.5 shadow-md hover:bg-rose-600"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => document.getElementById('logoKanan2Input')?.click()}
                      className={`text-[10px] font-semibold underline ${darkMode ? 'text-slate-400 hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600'}`}
                    >
                      Unggah 2
                    </button>
                    <input
                      id="logoKanan2Input"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageFileChange(e, 'logoKanan2')}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Nama Instansi Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nama Instansi (Baris 1)
                </label>
                <input
                  type="text"
                  value={data.instansiNama1}
                  onChange={(e) => onChange({ instansiNama1: e.target.value })}
                  placeholder="Pemerintah Desa Poncol"
                  className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-550' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nama Instansi (Baris 2)
                </label>
                <input
                  type="text"
                  value={data.instansiNama2}
                  onChange={(e) => onChange({ instansiNama2: e.target.value })}
                  placeholder="Kec. Poncol Kab. Magetan"
                  className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    darkMode 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-550' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 🖼️ SECTION 2 — BACKGROUND */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <button
          onClick={() => toggleSection('background')}
          className={`w-full flex items-center justify-between p-4 transition-colors font-semibold text-left ${
            darkMode ? 'bg-slate-950/40 hover:bg-slate-800/40 text-slate-100' : 'bg-slate-50 hover:bg-slate-100/80 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-950/50 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-sm font-bold leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>🖼️ SECTION 2 — Background</p>
              <p className={`text-[11px] font-normal ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Pilih foto latar dan atur overlay kegelapan</p>
            </div>
          </div>
          {activeSections.background ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {activeSections.background && (
          <div className={`p-5 flex flex-col gap-4 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
            {/* Drag & Drop Area */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Upload Foto Background
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full min-h-[140px] border-2 border-dashed rounded-xl cursor-pointer p-4 text-center flex flex-col items-center justify-center transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                    : darkMode
                      ? 'border-slate-750 bg-slate-850/50 hover:bg-slate-800'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFileChange(e, 'bgImage')}
                  className="hidden"
                />
                
                {data.bgImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md">
                      <img src={data.bgImage} alt="background thumbnail" className="w-full h-full object-cover" />
                    </div>
                    <p className={`text-xs font-semibold ${darkMode ? 'text-indigo-400' : 'text-slate-600'}`}>Tersimpan dalam memori browser ✅</p>
                    <p className="text-[10px] text-slate-400">Drag atau klik untuk mengganti background baru</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-indigo-500 mb-2 animate-bounce" />
                    <p className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>Drag & Drop foto di sini, atau Klik</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[280px] mx-auto">
                      Format ideal JPG, PNG, WebP (Maksimal size 10MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Zoom and Coordinate Position Controls */}
            {data.bgImage && (
              <div className="mt-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Move className="w-3.5 h-3.5 text-indigo-500" /> Atur Skala & Posisi Latar
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange({ bgZoom: 100, bgOffsetX: 0, bgOffsetY: 0 })}
                    className="text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 font-bold px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 border border-rose-100 dark:border-rose-900/30 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" /> Reset Posisi
                  </button>
                </div>

                {/* ZOOM CONTROLS */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Ukuran Zoom (Skala Foto)
                    </label>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{(data.bgZoom || 100)}%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onChange({ bgZoom: Math.max(100, (data.bgZoom || 100) - 10) })}
                      className="p-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-all text-xs font-extrabold cursor-pointer h-8 w-8 flex items-center justify-center shrink-0"
                      title="Perkecil (-10%)"
                    >
                      －
                    </button>
                    <input
                      type="range"
                      min="100"
                      max="300"
                      step="5"
                      value={data.bgZoom || 100}
                      onChange={(e) => onChange({ bgZoom: parseInt(e.target.value, 10) })}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ bgZoom: Math.min(300, (data.bgZoom || 100) + 10) })}
                      className="p-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 transition-all text-xs font-extrabold cursor-pointer h-8 w-8 flex items-center justify-center shrink-0"
                      title="Perbesar (+10%)"
                    >
                      ＋
                    </button>
                  </div>
                </div>

                {/* X OFFSET */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Posisi Horisontal (Geser Kiri/Kanan)
                    </label>
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">{data.bgOffsetX || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-600"
                    max="600"
                    value={data.bgOffsetX || 0}
                    onChange={(e) => onChange({ bgOffsetX: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                    <span>◀️ Geser Kiri</span>
                    <span>Pusat (0px)</span>
                    <span>Geser Kanan ▶️</span>
                  </div>
                </div>

                {/* Y OFFSET */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Posisi Vertikal (Geser Atas/Bawah)
                    </label>
                    <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">{data.bgOffsetY || 0}px</span>
                  </div>
                  <input
                    type="range"
                    min="-900"
                    max="900"
                    value={data.bgOffsetY || 0}
                    onChange={(e) => onChange({ bgOffsetY: parseInt(e.target.value, 10) })}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                    <span>◀️ Geser Atas</span>
                    <span>Pusat (0px)</span>
                    <span>Geser Bawah ▶️</span>
                  </div>
                </div>

                <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg text-[10px] text-indigo-950 dark:text-indigo-200 font-medium leading-relaxed">
                  💡 <span className="font-bold">Tips Desainer:</span> Anda juga bisa melakukan <span className="font-bold">drag/geser langsung</span> foto latar pada area <span className="underline">Preview Poster</span> di sebelah kanan secara real-time untuk penempatan yang jauh lebih presisi dan praktis!
                </div>
              </div>
            )}

            {/* Overlay Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Intensitas Overlay
                  </label>
                  <span className={`text-xs font-mono font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>{data.overlayOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={data.overlayOpacity}
                  onChange={(e) => onChange({ overlayOpacity: parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-855 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Warna Overlay Gelap
                </label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={data.overlayColor}
                    onChange={(e) => onChange({ overlayColor: e.target.value })}
                    className={`w-10 h-10 border rounded-lg cursor-pointer shrink-0 ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                    }`}
                  />
                  <input
                    type="text"
                    value={data.overlayColor}
                    onChange={(e) => onChange({ overlayColor: e.target.value })}
                    className={`w-full px-3 py-1.5 text-xs font-mono border rounded-lg ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✍️ SECTION 3 — KONTEN TEKS */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <button
          onClick={() => toggleSection('content')}
          className={`w-full flex items-center justify-between p-4 transition-colors font-semibold text-left ${
            darkMode ? 'bg-slate-950/40 hover:bg-slate-800/40 text-slate-100' : 'bg-slate-50 hover:bg-slate-100/80 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-amber-955/50 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-sm font-bold leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>✍️ SECTION 3 — Konten Teks</p>
              <p className={`text-[11px] font-normal ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tulis Judul, Sub-judul, Tanggal & Quote</p>
            </div>
          </div>
          {activeSections.content ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {activeSections.content && (
          <div className={`p-5 flex flex-col gap-4 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
            {/* Sub-judul */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Sub-judul (Italic Dekoratif)
              </label>
              <input
                type="text"
                value={data.subJudul}
                onChange={(e) => onChange({ subJudul: e.target.value })}
                placeholder="Selamat"
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-550' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Judul Utama */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Judul Utama <span className="text-rose-500 font-bold">*Wajib</span>
              </label>
              <textarea
                value={data.judulUtama}
                onChange={(e) => onChange({ judulUtama: e.target.value })}
                placeholder="HARI PENDIDIKAN NASIONAL"
                rows={2}
                className={`w-full px-3 py-2 text-sm font-extrabold uppercase border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-550' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <p className="text-[10px] text-slate-400 mt-1">Gunakan caps lock untuk teks berukuran besar</p>
            </div>

            {/* Tanggal Picker */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Tanggal Poster
              </label>
              <input
                type="date"
                value={data.tanggal}
                onChange={(e) => onChange({ tanggal: e.target.value })}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white dark:[color-scheme:dark]' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Quote / Kalimat Tema */}
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Quote / Kalimat Tema
              </label>
              <textarea
                value={data.quote}
                onChange={(e) => onChange({ quote: e.target.value })}
                placeholder="Menguatkan Partisipasi Semesta Mewujudkan Pendidikan Bermutu"
                rows={3}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode 
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-550' 
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>
          </div>
        )}
      </div>

      {/* 🎨 SECTION 4 — GAYA DESAIN */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <button
          onClick={() => toggleSection('styling')}
          className={`w-full flex items-center justify-between p-4 transition-colors font-semibold text-left ${
            darkMode ? 'bg-slate-950/40 hover:bg-slate-800/40 text-slate-100' : 'bg-slate-50 hover:bg-slate-100/80 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-955/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-sm font-bold leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>🎨 SECTION 4 — Gaya Desain</p>
              <p className={`text-[11px] font-normal ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Kustomisasi warna, font judul & posisi teks</p>
            </div>
          </div>
          {activeSections.styling ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {activeSections.styling && (
          <div className={`p-5 flex flex-col gap-4 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
            {/* Pilihan Aspek Rasio (Aspect Ratio Chooser) */}
            <div className="mb-2">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                📐 PILIHAN ASPEK RASIO POSTER
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: '9:16', label: '9:16 Story/Reels', desc: 'Instagram Reels, Tiktok, Status WA' },
                  { key: '4:5', label: '4:5 Portrait Feed', desc: 'Feed Instagram Lebih Tinggi' },
                  { key: '1:1', label: '1:1 Square Feed', desc: 'Instagram Grid / Facebook' },
                  { key: '16:9', label: '16:9 Lanskap', desc: 'Presentasi Slide, YouTube' }
                ].map((ratio) => {
                  const isSelected = data.aspectRatio === ratio.key;
                  return (
                    <button
                      key={ratio.key}
                      type="button"
                      onClick={() => onChange({ aspectRatio: ratio.key as any })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600/10 border-blue-500 text-blue-500 shadow-md ring-2 ring-blue-500/20' 
                          : darkMode 
                            ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/80 hover:border-slate-300'
                      }`}
                    >
                      {/* Mini visual aspect ratio box icon! */}
                      <div className="flex items-center justify-center h-10 mb-1.5 pl-0.5">
                        <div 
                          className={`border-2 rounded transition-all duration-300 ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-500/15' 
                              : darkMode ? 'border-slate-600 bg-slate-900/40' : 'border-slate-400 bg-white'
                          }`}
                          style={{
                            width: ratio.key === '9:16' ? '18px' : ratio.key === '4:5' ? '24px' : ratio.key === '1:1' ? '28px' : '40px',
                            height: ratio.key === '9:16' ? '32px' : ratio.key === '4:5' ? '30px' : ratio.key === '1:1' ? '28px' : '22.5px',
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-bold block truncate leading-tight w-full">{ratio.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Separator */}
            <div className={`h-px my-1 ${darkMode ? 'bg-slate-800/80' : 'bg-slate-100'}`} />

            {/* Color Pickers row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Warna Judul */}
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Warna Judul
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={data.warnaJudul}
                    onChange={(e) => onChange({ warnaJudul: e.target.value })}
                    className={`w-8 h-8 rounded-lg cursor-pointer shrink-0 border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200'}`}
                  />
                  <input
                    type="text"
                    value={data.warnaJudul}
                    onChange={(e) => onChange({ warnaJudul: e.target.value })}
                    className={`w-full px-2 py-1 text-xs font-mono border rounded-md ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Warna Sub-judul */}
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Warna Sub-judul
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={data.warnaSubJudul}
                    onChange={(e) => onChange({ warnaSubJudul: e.target.value })}
                    className={`w-8 h-8 rounded-lg cursor-pointer shrink-0 border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200'}`}
                  />
                  <input
                    type="text"
                    value={data.warnaSubJudul}
                    onChange={(e) => onChange({ warnaSubJudul: e.target.value })}
                    className={`w-full px-2 py-1 text-xs font-mono border rounded-md ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Warna Badge Tanggal */}
              <div>
                <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Warna Badge Tanggal
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={data.warnaBadgeTanggal}
                    onChange={(e) => onChange({ warnaBadgeTanggal: e.target.value })}
                    className={`w-8 h-8 rounded-lg cursor-pointer shrink-0 border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200'}`}
                  />
                  <input
                    type="text"
                    value={data.warnaBadgeTanggal}
                    onChange={(e) => onChange({ warnaBadgeTanggal: e.target.value })}
                    className={`w-full px-2 py-1 text-xs font-mono border rounded-md ${
                      darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Font Selection Dropdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Font Judul Utama
                </label>
                <select
                  value={data.fontJudul}
                  onChange={(e) => onChange({ fontJudul: e.target.value as any })}
                  className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode ? 'bg-slate-805 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="Oswald" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Oswald (Tebal, Tegas & Modern)</option>
                  <option value="Impact" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Impact (Bold Padat - Fallback)</option>
                  <option value="Poppins" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Poppins (Modern Minimalis)</option>
                  <option value="Montserrat" className={darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Montserrat (Klasik Elegan)</option>
                </select>
              </div>

              {/* Posisi Teks Alignment */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Posisi Teks Konten Utama
                </label>
                <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => onChange({ posisiTeks: 'kiri' })}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      data.posisiTeks === 'kiri' 
                        ? darkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ⬅️ Kiri
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ posisiTeks: 'tengah' })}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      data.posisiTeks === 'tengah' 
                        ? darkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ↔️ Tengah
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ posisiTeks: 'kanan' })}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      data.posisiTeks === 'kanan' 
                        ? darkMode ? 'bg-slate-800 text-white shadow-sm' : 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ➡️ Kanan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📱 SECTION 5 — FOOTER MEDIA SOSIAL */}
      <div className={`rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
        darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <button
          onClick={() => toggleSection('footer')}
          className={`w-full flex items-center justify-between p-4 transition-colors font-semibold text-left ${
            darkMode ? 'bg-slate-950/40 hover:bg-slate-800/40 text-slate-100' : 'bg-slate-50 hover:bg-slate-100/80 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-955/50 text-purple-400' : 'bg-purple-50 text-purple-600'}`}>
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-sm font-bold leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>📱 SECTION 5 — Footer Media Sosial</p>
              <p className={`text-[11px] font-normal ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tampilkan username & website instansi</p>
            </div>
          </div>
          {activeSections.footer ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {activeSections.footer && (
          <div className={`p-5 flex flex-col gap-4 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
            {/* Tampilkan Footer Toggle switch */}
            <div className={`flex items-center justify-between p-3 border rounded-xl ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <p className={`text-xs font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Tampilkan Footer Banner?</p>
                <p className="text-[10px] text-slate-400">Aktifkan untuk menampilkan username media sosial di bagian bawah poster</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={data.showFooter} 
                  onChange={(e) => onChange({ showFooter: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Sub fields inside Footer settings */}
            {data.showFooter && (
              <div className="flex flex-col gap-4 animate-fade-in">
                
                {/* Social media multi-select chips */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Ikon Sosial Aktif (Pilih Multi-Chip)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableIcons.map((icon) => {
                      const isActive = data.footerIcons.includes(icon.key);
                      return (
                        <button
                          key={icon.key}
                          type="button"
                          onClick={() => toggleSocialIcon(icon.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-purple-600 border-purple-600 text-white shadow-md'
                              : darkMode
                                ? 'bg-slate-850 border-slate-700 text-slate-300 hover:bg-slate-800'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <SocialIcon name={icon.key} className={isActive ? 'text-white' : 'text-slate-650'} size={14} />
                          {icon.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Username & website domain inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Nama Akun / Handle
                    </label>
                    <input
                      type="text"
                      value={data.footerNamaAkun}
                      onChange={(e) => onChange({ footerNamaAkun: e.target.value })}
                      placeholder="@pemdesponcol"
                      className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        darkMode 
                          ? 'bg-slate-805 border-slate-700 text-white placeholder-slate-550' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      URL Website
                    </label>
                    <input
                      type="text"
                      value={data.footerUrl}
                      onChange={(e) => onChange({ footerUrl: e.target.value })}
                      placeholder="pemdesponcol.go.id"
                      className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        darkMode 
                          ? 'bg-slate-805 border-slate-700 text-white placeholder-slate-550' 
                          : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Footer Gradient Colors */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl border ${
                  darkMode ? 'bg-slate-950 border-slate-805' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Warna Gradient Kiri Footer
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={data.footerColor1}
                        onChange={(e) => onChange({ footerColor1: e.target.value })}
                        className={`w-8 h-8 rounded-lg cursor-pointer shrink-0 border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-300'}`}
                      />
                      <input
                        type="text"
                        value={data.footerColor1}
                        onChange={(e) => onChange({ footerColor1: e.target.value })}
                        className={`w-full px-2 py-1 text-xs border font-mono rounded-md ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Warna Gradient Kanan Footer
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={data.footerColor2}
                        onChange={(e) => onChange({ footerColor2: e.target.value })}
                        className={`w-8 h-8 rounded-lg cursor-pointer shrink-0 border ${darkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-300'}`}
                      />
                      <input
                        type="text"
                        value={data.footerColor2}
                        onChange={(e) => onChange({ footerColor2: e.target.value })}
                        className={`w-full px-2 py-1 text-xs border font-mono rounded-md ${
                          darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
