import React, { useState, useEffect } from 'react';
import { 
  getSpreadsheetRows, 
  ensureSheetExists, 
  getCachedToken 
} from '../utils/googleWorkspace';
import { 
  Search, 
  Filter, 
  Calendar, 
  Building, 
  ExternalLink, 
  FolderOpen, 
  RefreshCw, 
  Layers, 
  Edit, 
  Eye, 
  CloudLightning,
  AlertCircle,
  FileSpreadsheet,
  Check,
  X
} from 'lucide-react';
import { PosterData } from '../types';

interface HistoryGalleryProps {
  darkMode: boolean;
  onLoadToStudio: (data: Partial<PosterData>) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface SyncedDesign {
  no: string;
  waktu: string;
  instansi: string;
  subJudul: string;
  judulUtama: string;
  rasio: string;
  quote: string;
  gdriveLink: string;
}

const DEFAULT_SPREADSHEET_ID = '14LJl7I5ripWTQ_E2Qihs9uIZCI0JYh5PzynKmMKyHF4';

export const HistoryGallery: React.FC<HistoryGalleryProps> = ({
  darkMode,
  onLoadToStudio,
  showToast
}) => {
  const [designs, setDesigns] = useState<SyncedDesign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering and Searching State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTenant, setSelectedTenant] = useState<string>('all');
  const [selectedRatio, setSelectedRatio] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  
  // Fullscreen Zoom Modal
  const [zoomedDesign, setZoomedDesign] = useState<SyncedDesign | null>(null);

  // Parse GDrive file ID for rendering inline thumbnail image
  const extractFileId = (url: string): string | null => {
    if (!url) return null;
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const fetchHistory = async (force: boolean = false) => {
    const token = getCachedToken();
    if (!token) {
      setError("Silakan sambungkan akun Google Anda melalui tombol di bagian atas halaman untuk mengakses arsip.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resolvedSheetName = await ensureSheetExists(DEFAULT_SPREADSHEET_ID, token);
      const rows = await getSpreadsheetRows(DEFAULT_SPREADSHEET_ID, resolvedSheetName, token);

      const parsed: SyncedDesign[] = rows.map((row) => ({
        no: row[0] || '',
        waktu: row[1] || '',
        instansi: row[2] || 'Umum',
        subJudul: row[3] || '',
        judulUtama: row[4] || 'Untitled Poster',
        rasio: row[5] || '9:16',
        quote: row[6] || '',
        gdriveLink: row[7] || ''
      }));

      setDesigns(parsed);
      if (force) {
        showToast("🔄 Arsip poster berhasil diperbarui!", "success");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal memuat arsip. Pastikan Anda memiliki akses pengeditan ke Spreadsheet target.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch automatically on mount depending on token availability
  useEffect(() => {
    const token = getCachedToken();
    if (token) {
      fetchHistory();
    }
  }, []);

  // Fetch unique tenants (institutions) for multi-tenant filtering dropdown
  const uniqueTenants = Array.from(new Set(designs.map(d => d.instansi.trim()).filter(Boolean)));
  // Fetch unique ratios
  const uniqueRatios = Array.from(new Set(designs.map(d => d.rasio.trim()).filter(Boolean)));

  // Filter and search logic
  const filteredDesigns = designs
    .filter((d) => {
      const matchesSearch = d.judulUtama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            d.subJudul.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            d.quote.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTenant = selectedTenant === 'all' || d.instansi.trim() === selectedTenant;
      const matchesRatio = selectedRatio === 'all' || d.rasio.trim() === selectedRatio;
      
      return matchesSearch && matchesTenant && matchesRatio;
    })
    .sort((a, b) => {
      // Sort logic based on row number (or timestamp if parsed, but row number is sequential as 'No')
      const numA = parseInt(a.no) || 0;
      const numB = parseInt(b.no) || 0;
      return sortOrder === 'latest' ? numB - numA : numA - numB;
    });

  // Load a design template back to the active Studio Form
  const handleApplyTemplate = (item: SyncedDesign) => {
    // Attempt to split the instansi string if it contains multiple lines or commas
    // Standard template maps:
    // instansiNama1: "Pemerintah Desa Poncol"
    // instansiNama2: "Kec. Poncol Kab. Magetan"
    let inst1 = item.instansi;
    let inst2 = '';

    const splitters = ['\n', ' - ', ' -', '- ', ', '];
    for (let splitter of splitters) {
      if (item.instansi.includes(splitter)) {
        const parts = item.instansi.split(splitter);
        inst1 = parts[0].trim();
        inst2 = parts.slice(1).join(splitter).trim();
        break;
      }
    }

    onLoadToStudio({
      instansiNama1: inst1,
      instansiNama2: inst2,
      subJudul: item.subJudul,
      judulUtama: item.judulUtama,
      quote: item.quote,
      aspectRatio: (item.rasio as any) || '9:16'
    });

    showToast(`📥 Berhasil memuat layout "${item.judulUtama}" ke Studio!`, "success");
  };

  const getAspectPlaceholderRatio = (ratio: string) => {
    switch (ratio) {
      case '1:1': return 'aspect-square';
      case '4:5': return 'aspect-[4/5]';
      case '16:9': return 'aspect-[16/9]';
      case '9:16':
      default:
        return 'aspect-[9/16]';
    }
  };

  const hasActiveToken = !!getCachedToken();

  return (
    <div className="flex flex-col gap-6">
      
      {/* HEADER SUMMARY BAR */}
      <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4.5 ${
        darkMode ? 'bg-gradient-to-br from-slate-900 to-indigo-950/20 border-slate-800' : 'bg-gradient-to-br from-white to-indigo-50/5 border-slate-200'
      }`}>
        <div className="flex-1">
          <h3 className="font-heading font-black text-lg sm:text-xl md:text-2xl tracking-tight bg-gradient-to-r from-emerald-500 via-indigo-500 to-amber-500 bg-clip-text text-transparent">
            Galeri Poster & Arsip Instansi
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Arsip terpusat yang mencatat poster publikasi yang dirilis lintas instansi (Multi-Tenant). Semua data disinkronkan secara real-time ke Google Spreadsheet dan Drive.
          </p>
        </div>

        {hasActiveToken && (
          <button
            onClick={() => fetchHistory(true)}
            disabled={loading}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl border text-xs font-bold transition-all active:scale-[0.98] ${
              darkMode 
                ? 'bg-slate-800 border-slate-700 text-indigo-400 hover:bg-slate-700/80' 
                : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100/80'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Perbarui Arsip
          </button>
        )}
      </div>

      {!hasActiveToken ? (
        /* ACCENT WARNING CARD FOR NO AUTH WITH LOGIN TRIGGER */
        <div className={`p-8 rounded-3xl border flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-6 gap-4 ${
          darkMode ? 'bg-slate-900/55 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center animate-pulse">
            <CloudLightning className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h4 className="font-heading font-extrabold text-base text-slate-950 dark:text-slate-100">Hubungkan Akun Google Anda</h4>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-md">
              Arsip poster KontenGO dioptimalkan melalui integrasi cloud. Hubungkan akun Google Anda lewat tombol <strong>"Tautkan Google"</strong> di kanan atas halaman untuk membuka list galeri poster.
            </p>
          </div>
        </div>
      ) : error ? (
        /* ERROR OCCURRED WARNING WITH RETRY CONTROLS */
        <div className={`p-8 rounded-3xl border text-center max-w-xl mx-auto my-4 flex flex-col items-center gap-3.5 ${
          darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-rose-50/20 border-rose-150'
        }`}>
          <AlertCircle className="w-8 h-8 text-rose-500" />
          <div>
            <h4 className="text-xs font-black text-rose-500 uppercase tracking-widest leading-none">Error Muat Database</h4>
            <p className="text-[11px] text-slate-400 mt-2 font-sans font-medium max-w-md">{error}</p>
          </div>
          <button
            onClick={() => fetchHistory(true)}
            className="mt-1 py-1.5 px-3.5 rounded-lg text-xs font-bold border border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/15 transition-all"
          >
            Coba Sinkronisasi Ulang
          </button>
        </div>
      ) : loading ? (
        /* FULL SCREEN SKELETON PLACEHOLDER LOADING */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`p-4 rounded-3xl border flex flex-col gap-3 animate-pulse ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="w-full aspect-[9/14] rounded-2xl bg-slate-800/80 dark:bg-slate-800/60" />
              <div className="h-4 w-2/3 rounded-lg bg-slate-800/45 dark:bg-slate-800/25 mt-1" />
              <div className="h-3 w-1/3 rounded-lg bg-slate-800/40 dark:bg-slate-800/22" />
            </div>
          ))}
        </div>
      ) : designs.length === 0 ? (
        /* SPREADSHEET EXISTS BUT NO DESIGN LOG ROWS SAVED YET */
        <div className={`p-10 rounded-3xl border text-center max-w-md mx-auto my-10 flex flex-col items-center gap-4 ${
          darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
          <div>
            <h4 className="font-heading font-black text-xs uppercase tracking-widest text-slate-400">Arsip Kosong</h4>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Belum ada data poster yang tercatat di Google Spreadsheet target.<br />
              <strong className="text-slate-100">Ayo kembali ke tab Studio</strong>, isi konten, dan klik <strong>Download Gambar</strong> untuk mengarsipkan karya pertama Anda!
            </p>
          </div>
        </div>
      ) : (
        /* DETAILED ARCHIVE LAYOUT WITH ADVANCED MULTI-TENANT FILTER & GRID LIST */
        <div className="flex flex-col gap-5">
          
          {/* SEARCH & FILTERS INTERACTIVE PANEL */}
          <div className={`p-4 rounded-2xl border flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between ${
            darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari berdasarkan judul, slogan, atau isi poster..."
                className={`w-full pl-10 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>

            {/* Filter Drops Group */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Tenant Filter (Multi-Tenant Hub) */}
              <div className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-500" />
                <select
                  value={selectedTenant}
                  onChange={(e) => setSelectedTenant(e.target.value)}
                  className={`p-2 px-3 text-xs rounded-xl border focus:outline-none focus:ring-1 font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="all">🏢 Semua Instansi (Multi-Tenant)</option>
                  {uniqueTenants.map((ten) => (
                    <option key={ten} value={ten}>{ten}</option>
                  ))}
                </select>
              </div>

              {/* Aspect Ratio Filter */}
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={selectedRatio}
                  onChange={(e) => setSelectedRatio(e.target.value)}
                  className={`p-2 px-3 text-xs rounded-xl border focus:outline-none focus:ring-1 font-bold ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="all">📐 Semua Rasio</option>
                  {uniqueRatios.map((rat) => (
                    <option key={rat} value={rat}>Format: {rat}</option>
                  ))}
                </select>
              </div>

              {/* Sorting Order */}
              <button
                onClick={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')}
                className={`p-2 px-3 text-xs rounded-xl border font-bold flex items-center gap-1.5 transition-all select-none hover:bg-slate-800 ${
                  darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-teal-500" /> 
                {sortOrder === 'latest' ? 'Urut: Terbaru' : 'Urut: Terlama'}
              </button>
            </div>
          </div>

          {/* ACTIVE RETRIEVED POSTER GRID LIST */}
          {filteredDesigns.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-xs leading-relaxed">
                Tidak ada poster berarsip yang cocok dengan pencarian atau filter aktif.<br />
                Silakan ubah filter Anda untuk menampilkan poster yang dicari.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDesigns.map((item) => {
                const fileId = extractFileId(item.gdriveLink);
                const hasThumb = !!fileId;
                const thumbUrl = hasThumb ? `https://lh3.googleusercontent.com/d/${fileId}=w400` : null;

                return (
                  <div 
                    key={item.no} 
                    className={`group rounded-3xl border overflow-hidden flex flex-col shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.015] ${
                      darkMode ? 'bg-slate-900/60 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                    }`}
                  >
                    
                    {/* Visual Media Wrapper Frame with Adaptive Aspect Preview ratio of item */}
                    <div className="relative overflow-hidden bg-slate-950 border-b border-slate-800/10 flex items-center justify-center">
                      <div className={`w-full flex items-center justify-center relative ${getAspectPlaceholderRatio(item.rasio)}`}>
                        {hasThumb ? (
                          <img 
                            src={thumbUrl!} 
                            alt={item.judulUtama}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              // If Google lh3 fails to load, handle fallback transparently
                              (e.target as any).style.display = 'none';
                            }}
                          />
                        ) : (
                          /* Gradient Graphic Placeholder for items without valid fileId */
                          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 flex flex-col items-center justify-center p-4">
                            <span className="text-[10px] text-slate-400 font-bold tracking-widest mb-1.5 uppercase leading-none opacity-50">KOSMOLOGI KONTENGO</span>
                            <span className="font-heading font-black text-xs text-slate-300 text-center leading-tight truncate w-full">{item.judulUtama}</span>
                          </div>
                        )}

                        {/* Top Left Formatting Tag Badges over visual preview */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 font-mono">
                          <span className="text-[8px] bg-slate-950/80 backdrop-blur-md text-emerald-400 font-extrabold px-2 py-0.5 rounded-lg uppercase tracking-wide border border-emerald-500/20 shadow-sm leading-none">
                            {item.rasio}
                          </span>
                        </div>

                        {/* Hover Overlay triggers fullscreen viewing zoom option */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 z-10">
                          <button
                            onClick={() => setZoomedDesign(item)}
                            className="bg-indigo-600 hover:bg-indigo-500 p-2 rounded-xl text-white-100 transition-transform transform scale-90 group-hover:scale-100 shadow-lg text-xs font-bold leading-none flex items-center gap-1.5 text-white"
                          >
                            <Eye className="w-4 h-4" /> Zoom
                          </button>
                          
                          <a 
                            href={item.gdriveLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-slate-850 hover:bg-slate-750 p-2 rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-transform transform scale-90 group-hover:scale-100 shadow-lg text-xs font-bold leading-none flex items-center gap-1.5"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> GDrive
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Metadata Content Frame of Poster Card */}
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate leading-tight block select-none" title={item.instansi}>
                          {item.instansi}
                        </span>
                        
                        <h4 className="font-heading font-black text-[13px] leading-tight text-slate-900 dark:text-slate-100 truncate" title={item.judulUtama}>
                          {item.judulUtama}
                        </h4>
                        
                        <p className="text-[10px] text-slate-400 font-medium truncate leading-tight block italic">
                          {item.subJudul || 'Tanpa Pimpinan'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-750/10 dark:border-slate-800 flex-wrap gap-2">
                        {/* Audit Log Stamp Date Info */}
                        <div className="flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{item.waktu ? item.waktu.split(' ')[0] : 'No Date'}</span>
                        </div>

                        {/* Applying action back to Studio Form */}
                        <button
                          onClick={() => handleApplyTemplate(item)}
                          className="text-[9px] font-extrabold text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 flex items-center gap-0.5 hover:underline font-heading uppercase tracking-wider"
                          title="Gunakan poster ini sebagai cetakan template di Studio"
                        >
                          <Edit className="w-3 h-3 text-indigo-500" /> Load ke Studio
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN ZOOM LIGHTBOX MODAL */}
      {zoomedDesign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
            onClick={() => setZoomedDesign(null)}
          />
          
          <div className={`relative w-full max-w-lg rounded-3xl border shadow-2xl p-4 flex flex-col gap-3 z-10 transition-transform ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest font-heading">Pratinjau HD ({zoomedDesign.rasio})</span>
              <button 
                onClick={() => setZoomedDesign(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                title="Tutup Zoom"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative overflow-hidden bg-slate-950 rounded-2xl flex items-center justify-center">
              <div className={`w-full relative flex items-center justify-center ${getAspectPlaceholderRatio(zoomedDesign.rasio)}`}>
                {extractFileId(zoomedDesign.gdriveLink) ? (
                  <img 
                    src={`https://lh3.googleusercontent.com/d/${extractFileId(zoomedDesign.gdriveLink)}=w600`}
                    alt={zoomedDesign.judulUtama}
                    className="absolute inset-0 w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">Gambar GDrive Kosong</div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 mt-1 leading-tight">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{zoomedDesign.instansi}</span>
              <h5 className="font-heading font-black text-sm text-slate-900 dark:text-white truncate">{zoomedDesign.judulUtama}</h5>
              <p className="text-[10px] text-slate-400 italic mt-0.5">{zoomedDesign.subJudul}</p>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button
                onClick={() => {
                  handleApplyTemplate(zoomedDesign);
                  setZoomedDesign(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/20 text-white font-heading font-bold text-xs flex items-center justify-center gap-1 shadow transition-all active:scale-95"
              >
                <Edit className="w-3.5 h-3.5 text-white" /> Sunting Poster
              </button>
              
              <a 
                href={zoomedDesign.gdriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs flex items-center justify-center gap-1 transition-all"
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-400" /> Google Drive <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
