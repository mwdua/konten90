import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  googleLogOut, 
  initAuth, 
  getOrCreateFolder, 
  createNewSpreadsheet, 
  getSpreadsheetTitle, 
  getSpreadsheetRows,
  getCachedToken,
  ensureSheetExists,
  MASTER_SHEET_ID
} from '../utils/googleWorkspace';
import { 
  FileSpreadsheet, 
  FolderCheck, 
  ExternalLink, 
  PlusCircle, 
  LogOut, 
  RefreshCw, 
  Database, 
  CloudLightning, 
  CheckCircle, 
  HelpCircle, 
  FolderOpen,
  Code,
  Copy,
  Key,
  ShieldAlert,
  Lock,
  Settings
} from 'lucide-react';

interface GoogleSyncPanelProps {
  darkMode: boolean;
  onSyncConfigured: (spreadsheetId: string | null, folderId: string | null) => void;
  onPostExport: (exportFn: (imageBlob: Blob, mainTitle: string, subTitle: string, instansi: string, ratio: string, quote: string) => Promise<string | null>) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

interface SyncedDesign {
  no: string;
  waktu: string;
  instansi: string;
  subJudul: string;
  judulUtama: string;
  rasio: string;
  links: string;
}

export const GoogleSyncPanel: React.FC<GoogleSyncPanelProps> = ({
  darkMode,
  onSyncConfigured,
  onPostExport,
  showToast
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Spreadsheet Config
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('kontengo_sheet_id') || '14LJl7I5ripWTQ_E2Qihs9uIZCI0JYh5PzynKmMKyHF4';
  });
  const [sheetName, setSheetName] = useState<string>('Daftar Desain Poster');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>('');
  
  // G Drive Config
  const [folderId, setFolderId] = useState<string>(() => {
    return localStorage.getItem('kontengo_folder_id') || '18k-UyqXdsf1C36wu6ysHaZxWeAxtczWp';
  });
  const [folderName, setFolderName] = useState<string>('Arsip Utama KontenGO');

  // Multi-tenant "Kode Unik" (Access Code) Config
  const [kodeUnik, setKodeUnik] = useState<string>(() => {
    return localStorage.getItem('kontengo_kode_unik') || '';
  });
  const [namaDesa, setNamaDesa] = useState<string>(() => {
    return localStorage.getItem('kontengo_nama_desa') || '';
  });
  const [tempKodeUnik, setTempKodeUnik] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
  // Custom Sync Rows from Sheet
  const [syncedItems, setSyncedItems] = useState<SyncedDesign[]>([]);
  const [isRefreshingLogs, setIsRefreshingLogs] = useState<boolean>(false);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('kontengo_auto_sync');
    return saved !== 'false';
  });
  const [showScript, setShowScript] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [showLogOutConfirm, setShowLogOutConfirm] = useState<boolean>(false);
  const [showResetCodeConfirm, setShowResetCodeConfirm] = useState<boolean>(false);

  // Init authentication listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (activeUser, activeToken) => {
        setUser(activeUser);
        setToken(activeToken);
        setIsLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Write default spreadsheetId and folderId to localStorage if empty
  useEffect(() => {
    if (!localStorage.getItem('kontengo_sheet_id')) {
      localStorage.setItem('kontengo_sheet_id', '14LJl7I5ripWTQ_E2Qihs9uIZCI0JYh5PzynKmMKyHF4');
    }
    if (!localStorage.getItem('kontengo_folder_id')) {
      localStorage.setItem('kontengo_folder_id', '18k-UyqXdsf1C36wu6ysHaZxWeAxtczWp');
    }
  }, []);

  // Fetch title of spreadsheet and list logs when spreadsheetId and token change
  useEffect(() => {
    if (token) {
      if (spreadsheetId) {
        fetchSpreadsheetInfo();
      } else {
        setSpreadsheetTitle('');
        setSyncedItems([]);
      }
      onSyncConfigured(spreadsheetId || null, folderId || null);
    } else {
      setSpreadsheetTitle('');
      setSyncedItems([]);
      onSyncConfigured(null, null);
    }
  }, [token, spreadsheetId, folderId]);

  // Persists sheet config and auto-sync preference
  useEffect(() => {
    localStorage.setItem('kontengo_auto_sync', String(isAutoSyncEnabled));
  }, [isAutoSyncEnabled]);

  const fetchSpreadsheetInfo = async () => {
    if (!token || !spreadsheetId) return;
    setIsRefreshingLogs(true);
    try {
      const title = await getSpreadsheetTitle(spreadsheetId, token);
      setSpreadsheetTitle(title);
      
      // Auto-heal or check if the sheet exists
      const verifiedSheetName = await ensureSheetExists(spreadsheetId, token);
      setSheetName(verifiedSheetName);
      
      // Fetch latest logs
      const rows = await getSpreadsheetRows(spreadsheetId, verifiedSheetName, token);
      
      const parsedItems: SyncedDesign[] = rows.map((row) => ({
        no: row[0] || '',
        waktu: row[1] || '',
        instansi: row[2] || '',
        subJudul: row[3] || '',
        judulUtama: row[4] || '',
        rasio: row[5] || '',
        links: row[7] || ''
      }));
      // Reverse to get latest on top
      setSyncedItems(parsedItems.reverse().slice(0, 5));
    } catch (err: any) {
      console.error(err);
      setSpreadsheetTitle('🚨 Gagal Memuat Spreadsheet');
      showToast('❌ Gagal menyinkronkan dokumen Spreadsheet Anda. Validasi ID atau kepemilikan.', 'error');
    } finally {
      setIsRefreshingLogs(false);
    }
  };

  const handleLogin = async () => {
    setIsProcessing(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showToast('🔓 Berhasil menghubungkan akun Google Anda!', 'success');
        
        // Automatically check/create folder
        const activeToken = result.accessToken;
        const currentFolderId = folderId || await getOrCreateFolder(folderName, activeToken);
        setFolderId(currentFolderId);
        localStorage.setItem('kontengo_folder_id', currentFolderId);
        
        // Check if spreadsheetId is empty and suggest creating one
        if (!spreadsheetId) {
          const autoSheetId = await createNewSpreadsheet('Sinergi KontenGO - Arsip Poster', activeToken);
          setSpreadsheetId(autoSheetId);
          localStorage.setItem('kontengo_sheet_id', autoSheetId);
          showToast('📂 Spreadsheet baru "Sinergi KontenGO" otomatis berhasil dibuat!', 'success');
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('⚠️ Gagal login Google atau izin ditolak.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogOut = async () => {
    try {
      await googleLogOut();
      setUser(null);
      setToken(null);
      setSyncedItems([]);
      setSpreadsheetTitle('');
      setKodeUnik('');
      setNamaDesa('');
      localStorage.removeItem('kontengo_kode_unik');
      localStorage.removeItem('kontengo_nama_desa');
      showToast('🔒 Koneksi Google Berhasil Diputuskan.', 'info');
    } catch (err) {
      console.error(err);
      showToast('⚠️ Gagal melakukan Logout.', 'error');
    }
  };

  const handleVerifyKodeUnik = async (inputCode: string) => {
    if (!token) {
      showToast("⚠️ Hubungkan akun Google terlebih dahulu sebelum memverifikasi.", "error");
      return;
    }
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      showToast("⚠️ Silakan masukkan Kode Unik Anda.", "error");
      return;
    }
    
    setIsProcessing(true);
    try {
      // 1. Verify we can access the master sheet
      let resolvedMasterName;
      try {
        resolvedMasterName = await ensureSheetExists(MASTER_SHEET_ID, token);
      } catch (e: any) {
        console.error("Gagal verifikasi sheet induk:", e);
        throw new Error("Gagal menghubungi Spreadsheet Induk. Sesi Anda tidak valid atau akun Google ini tidak ditambahkan sebagai editor.");
      }

      // 2. Read the master spreadsheet registry
      let rows;
      try {
        rows = await getSpreadsheetRows(MASTER_SHEET_ID, 'Daftar Desa/Lembaga', token);
      } catch (e: any) {
        throw new Error("Gagal memuat tab 'Daftar Desa/Lembaga' di Spreadsheet Induk. Pastikan Admin telah membuat tab pendaftaran tersebut.");
      }
      
      // 3. Match code against Column A (Index 0) for unique login code/password
      const matchedRow = rows.find(
        (row) => row[0] && row[0].toString().trim().toUpperCase() === cleanCode
      );
      
      if (!matchedRow) {
        throw new Error(`Kode Unik / Password "${cleanCode}" tidak ditemukan atau belum didaftarkan di Spreadsheet Induk.`);
      }
      
      const targetDesa = matchedRow[1] || 'Desa Akses';
      const targetSheet = matchedRow[2] || '';
      const targetFolder = matchedRow[3] || '';
      const status = matchedRow[4] || 'AKTIF';
      
      if (status.toUpperCase() !== 'AKTIF') {
        throw new Error(`Akses untuk ${targetDesa} saat ini berstatus "${status}" (Tidak Aktif).`);
      }
      
      if (!targetFolder || !targetSheet) {
        throw new Error(`Akses terdaftar, namun Folder & Sheet belum selesai di-generate untuk ${targetDesa}. Minta admin menjalankan menu 'Buat Folder, Sheet & Kode Unik Desa' di Spreadsheet Induk.`);
      }
      
      // Save local village data and sync properties
      setKodeUnik(cleanCode);
      setNamaDesa(targetDesa);
      setSpreadsheetId(targetSheet);
      setFolderId(targetFolder);
      
      localStorage.setItem('kontengo_kode_unik', cleanCode);
      localStorage.setItem('kontengo_nama_desa', targetDesa);
      localStorage.setItem('kontengo_sheet_id', targetSheet);
      localStorage.setItem('kontengo_folder_id', targetFolder);
      
      onSyncConfigured(targetSheet, targetFolder);
      showToast(`🔑 Sukses Kunci Akses! Selamat datang Operator ${targetDesa}! 🤝`, "success");
      
    } catch (err: any) {
      console.error("Gagal memproses kode unik:", err);
      showToast(`❌ ${err.message || "Gagal verifikasi Kode Unik."}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateAutoSpreadsheet = async () => {
    if (!token) return;
    setIsProcessing(true);
    try {
      const newId = await createNewSpreadsheet('Arsip Poster Instansi - KontenGO', token);
      setSpreadsheetId(newId);
      localStorage.setItem('kontengo_sheet_id', newId);
      showToast('📄 Berhasil membuat file Spreadsheet baru di Google Drive!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('❌ Gagal membuat spreadsheet baru.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveFolder = async () => {
    if (!token) return;
    if (!folderName.trim()) {
      showToast('Nama folder tidak boleh kosong.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      const currentFolderId = await getOrCreateFolder(folderName, token);
      setFolderId(currentFolderId);
      localStorage.setItem('kontengo_folder_id', currentFolderId);
      showToast(`📁 Berhasil menyinkronkan folder Google Drive: "${folderName}"`, 'success');
    } catch (err) {
      console.error(err);
      showToast('❌ Gagal mencari atau membuat folder di Google Drive.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`p-5 rounded-2xl border flex flex-col gap-4.5 ${
      darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 leading-none">
          <Database className="w-3.5 h-3.5 text-indigo-500" /> Sinergi Drive & Sheets
        </h4>
        {user && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[9px] text-emerald-500 font-bold uppercase">Unyielding Link</span>
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Memeriksa Sesi...</span>
        </div>
      ) : !user ? (
        <div className="flex flex-col gap-3 py-1.5">
          <p className="text-[11px] leading-relaxed text-slate-400">
            Hubungkan pengerjaan poster secara instan dengan menyimpan file gambar di folder <strong className="text-slate-200 dark:text-slate-300">Google Drive</strong> dan mencatat metadata di <strong className="text-slate-200 dark:text-slate-300">Spreadsheet</strong>.
          </p>
          
          <button
            onClick={handleLogin}
            disabled={isProcessing}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-all active:scale-[0.98] select-none text-indigo-600 dark:text-indigo-400 font-bold text-xs"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <CloudLightning className="w-4 h-4 text-indigo-500 shrink-0" />
            )}
            Sambungkan Akun Google
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* User Sign Info */}
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
            darkMode ? 'bg-slate-950/45 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 overflow-hidden">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'Google Profile'} 
                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-indigo-500/30"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-extrabold shrink-0">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="overflow-hidden leading-tight flex flex-col">
                <span className="text-[11px] font-black truncate">{user.displayName || 'Developer'}</span>
                <span className="text-[9px] text-slate-400 truncate">{user.email || 'developer_profile'}</span>
              </div>
            </div>

            {showLogOutConfirm ? (
              <div className="flex items-center gap-1 shrink-0 bg-rose-500/10 p-1 px-1.5 rounded-xl border border-rose-500/20 animate-fade-in">
                <span className="text-[8px] font-extrabold text-rose-500 uppercase mr-1">Putus?</span>
                <button
                  onClick={() => {
                    handleLogOut();
                    setShowLogOutConfirm(false);
                  }}
                  className="text-[9px] font-black text-white bg-rose-650 hover:bg-rose-550 p-1 px-2 rounded-lg transition-transform active:scale-95 leading-none"
                >
                  Ya
                </button>
                <button
                  onClick={() => setShowLogOutConfirm(false)}
                  className={`text-[9px] font-black p-1 px-2 rounded-lg transition-all leading-none ${
                    darkMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-205'
                  }`}
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLogOutConfirm(true)}
                title="Putus Hubungan Akun Google"
                className="p-1 px-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Settings Section */}
          <div className="flex flex-col gap-3">
             {/* Multi-Tenant Concept Explanation Banner */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-500/10 text-[10px] leading-relaxed flex flex-col gap-1.5 font-sans">
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <CloudLightning className="w-3.5 h-3.5 animate-pulse text-amber-500" /> Konsep Multi-Desa & Lembaga
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-normal">
                Sistem ini mendukung dual-sinkronisasi cerdas: data poster Anda dicatat di <strong className="text-slate-700 dark:text-slate-200">Spreadsheet & Drive lokal desa masing-masing</strong>, sekaligus direkap ke dalam <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Spreadsheet Induk Pusat</strong> untuk rekapan terpadu.
              </p>
            </div>

            {/* KODE AKSES DESA / LEMBAGA (Tenant Authentication Dashboard) */}
            <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
              darkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50/40 border-indigo-500/10'
            }`}>
              {kodeUnik ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
                      <Key className="w-4 h-4 text-emerald-500 animate-pulse" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Desa/Lembaga Aktif</span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 truncate block leading-tight">
                        {namaDesa || 'Terhubung'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-[9px] bg-slate-950/45 dark:bg-slate-950/60 p-2 rounded-lg font-mono text-slate-400 border border-slate-800/60 flex items-center justify-between">
                    <span>Akses: <strong className="text-indigo-400">{kodeUnik}</strong></span>
                    <span className="text-[8px] font-extrabold uppercase text-emerald-400">AKTIF</span>
                  </div>

                  {showResetCodeConfirm ? (
                    <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-rose-500/5 border border-rose-500/15 animate-fade-in">
                      <p className="text-[9px] font-semibold text-rose-400 text-center">Yakin ingin mengganti Kode Akses Desa / Lembaga?</p>
                      <div className="flex items-center gap-1.5 justify-center">
                        <button
                          onClick={() => {
                            setKodeUnik('');
                            setNamaDesa('');
                            localStorage.removeItem('kontengo_kode_unik');
                            localStorage.removeItem('kontengo_nama_desa');
                            setShowResetCodeConfirm(false);
                            showToast("🔓 Kode Unik berhasil direset.", "info");
                          }}
                          className="text-[9px] font-black text-white bg-rose-600 hover:bg-rose-500 py-1 px-2.5 rounded-md transition-all select-none uppercase"
                        >
                          Ya, Ganti
                        </button>
                        <button
                          onClick={() => setShowResetCodeConfirm(false)}
                          className={`text-[9px] font-black py-1 px-2.5 rounded-md transition-all select-none uppercase border ${
                            darkMode ? 'bg-slate-900 border-slate-850 hover:bg-slate-800 text-slate-400' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowResetCodeConfirm(true)}
                      className={`w-full py-1.5 px-3 rounded-lg text-[10px] font-bold text-center border transition-all ${
                        darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Ganti Kode Akses / Switch Desa
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-1.5 leading-none">
                    <Lock className="w-3.5 h-3.5" /> Masuk Akses Desa / Lembaga
                  </span>
                  <p className="text-[9.5px] text-slate-400 leading-normal">
                    Masukkan Kode Unik dari Admin Utama untuk sinkronisasi folder GDrive & sheet desa Anda secara otomatis tanpa setting manual.
                  </p>
                  
                  <div className="flex gap-1.5">
                    <input 
                      type="text"
                      placeholder="Contoh: KTG-BOJONGGEDE-A1B2"
                      value={tempKodeUnik}
                      onChange={(e) => setTempKodeUnik(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleVerifyKodeUnik(tempKodeUnik);
                        }
                      }}
                      className={`flex-1 p-2 px-3 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono tracking-wide ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                    <button
                      onClick={() => handleVerifyKodeUnik(tempKodeUnik)}
                      disabled={isProcessing}
                      className="px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black transition-all active:scale-95 flex items-center justify-center gap-1 select-none shrink-0"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Key className="w-3.5 h-3.5" />
                      )}
                      Masuk
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Multi-Tenant Apps Script Code Card */}
            <div className={`p-3 rounded-xl border flex flex-col gap-2 ${
              darkMode ? 'bg-slate-950/25 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                  <Code className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Skrip Apps Script Admin
                </span>
                <button
                  onClick={() => setShowScript(!showScript)}
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md transition-colors ${
                    darkMode ? 'bg-slate-800 hover:bg-slate-700 text-indigo-400' : 'bg-slate-200 hover:bg-slate-250 text-indigo-600'
                  }`}
                >
                  {showScript ? 'Sembunyikan' : 'Buka Skrip'}
                </button>
              </div>

              {showScript && (
                <div className="flex flex-col gap-2 animate-fade-in mt-1 font-sans">
                  <p className="text-[9px] text-slate-400 leading-normal">
                    Pasang skrip ini di <strong>Spreadsheet Induk</strong> (Ekstensi &rarr; Apps Script) untuk otomatisasi generate Folder, local Sheets, dan <strong>Kode Unik Akses</strong> bagi setiap operator desa baru!
                  </p>
                  
                  <div className="relative">
                    <pre className="p-2 px-2.5 rounded-lg bg-slate-950 text-slate-300 font-mono text-[8px] h-[140px] overflow-y-auto leading-relaxed border border-slate-800/80">
                      {`function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 KontenGO Master')
    .addItem('Buat Folder, Sheet & Kode Unik Desa', 'provisionNewTenants')
    .addToUi();
}

function provisionNewTenants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Daftar Desa/Lembaga");
  
  // Jika tab Daftar Desa belum ada, buat otomatis beserta headernya sesuai konsep baru
  if (!sheet) {
    sheet = ss.insertSheet("Daftar Desa/Lembaga");
    const headers = ["Kode Unik / Password", "Nama Desa / Lembaga", "ID Spreadsheet Desa", "ID Folder Desa", "Status", "Tgl Registrasi", "Email Operator"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    SpreadsheetApp.getUi().alert("Sheet 'Daftar Desa/Lembaga' baru saja dibuat secara otomatis.\\n\\nSilakan isi Nama Desa / Lembaga di Kolom B (Baris ke-2), lalu jalankan menu ini kembali!");
    return;
  }
  
  const range = sheet.getDataRange();
  const values = range.getValues();
  const lastRow = values.length;
  
  // Periksa apakah baris data kosong (hanya berisi header)
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("Belum ada data desa atau lembaga. Silakan isi Nama Desa di kolom B (baris ke-2) terlebih dahulu!");
    return;
  }
  
  let counter = 0;
  for (let i = 1; i < lastRow; i++) {
    const rowNum = i + 1;
    
    // Kolom mapping sesuai struktur baru:
    // A (index 0): Kode Unik / Password
    // B (index 1): Nama Desa
    // C (index 2): ID Spreadsheet Desa
    // D (index 3): ID Folder Desa
    // E (index 4): Status
    // F (index 5): Tgl Registrasi
    // G (index 6): Email Operator
    
    let uniqueCode = values[i][0] ? values[i][0].toString().trim() : '';
    const villageName = values[i][1] ? values[i][1].toString().trim() : ''; 
    let spreadsheetId = values[i][2] ? values[i][2].toString().trim() : '';
    let folderId = values[i][3] ? values[i][3].toString().trim() : '';
    let status = values[i][4] ? values[i][4].toString().trim() : '';
    const operatorEmail = values[i][6] ? values[i][6].toString().trim() : '';
    
    if (villageName) {
      let changed = false;
      
      // 1. Auto generate Kode Unik (Access Key / Password) jika kosong
      if (!uniqueCode) {
        const slug = villageName.toUpperCase()
          .replace(/[^A-Z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const chars = '0123456789ABCDEF';
        let randStr = '';
        for (let j = 0; j < 4; j++) {
          randStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        uniqueCode = "KTG-" + (slug || "DESA") + "-" + randStr;
        sheet.getRange(rowNum, 1).setValue(uniqueCode);
        changed = true;
      }
      
      // 2. Auto-generate Spreadsheet Desa khusus jika kosong
      if (!spreadsheetId) {
        try {
          const sheetName = villageName + " - Sinergi KontenGO";
          const newSS = SpreadsheetApp.create(sheetName);
          const tab = newSS.getSheets()[0];
          tab.setName("Daftar Desain Poster");
          
          const headers = ['No', 'Waktu Ekspor', 'Nama Instansi', 'Pimpinan/Sub-Judul', 'Judul Utama', 'Format Rasio', 'Quotes / Editorial', 'Link Gambar GDrive'];
          tab.appendRow(headers);
          
          // Beri style header berwarna gelap modern
          const hRange = tab.getRange(1, 1, 1, 8);
          hRange.setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");
          
          if (operatorEmail) {
            try {
              const file = DriveApp.getFileById(newSS.getId());
              file.addEditor(operatorEmail);
            } catch (editorE) {
              Logger.log("Gagal share spreadsheet ke email operator: " + editorE.message);
            }
          }
          
          spreadsheetId = newSS.getId();
          sheet.getRange(rowNum, 3).setValue(spreadsheetId);
          changed = true;
        } catch (e) {
          Logger.log("Error create sheet: " + e.message);
        }
      }
      
      // 3. Auto-generate Folder Google Drive jika kosong
      if (!folderId) {
        try {
          const folderName = villageName + " - Arsip KontenGO";
          const newFolder = DriveApp.createFolder(folderName);
          if (operatorEmail) {
            try {
              newFolder.addEditor(operatorEmail);
            } catch (editorE) {
              Logger.log("Gagal share folder ke email operator: " + editorE.message);
            }
          }
          folderId = newFolder.getId();
          sheet.getRange(rowNum, 4).setValue(folderId);
          changed = true;
        } catch (e) {
          Logger.log("Error create folder: " + e.message);
        }
      }
      
      // 4. Set status & Tanggal jika ada perubahan
      if (changed) {
        if (!status) {
          sheet.getRange(rowNum, 5).setValue("AKTIF");
        }
        sheet.getRange(rowNum, 6).setValue(new Date());
        counter++;
      }
    }
  }
  SpreadsheetApp.getUi().alert("Proses selesai! Berhasil memproses " + counter + " Desa/Lembaga.");
}`}
                    </pre>

                    <button
                      onClick={() => {
                        const codeText = `function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 KontenGO Master')
    .addItem('Buat Folder, Sheet & Kode Unik Desa', 'provisionNewTenants')
    .addToUi();
}

function provisionNewTenants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Daftar Desa/Lembaga");
  
  if (!sheet) {
    sheet = ss.insertSheet("Daftar Desa/Lembaga");
    const headers = ["Kode Unik / Password", "Nama Desa / Lembaga", "ID Spreadsheet Desa", "ID Folder Desa", "Status", "Tgl Registrasi", "Email Operator"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#4f46e5").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
    SpreadsheetApp.getUi().alert("Sheet 'Daftar Desa/Lembaga' baru saja dibuat secara otomatis.\\n\\nSilakan isi Nama Desa / Lembaga di Kolom B (Baris ke-2), lalu jalankan menu ini kembali!");
    return;
  }
  
  const range = sheet.getDataRange();
  const values = range.getValues();
  const lastRow = values.length;
  
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("Belum ada data desa atau lembaga. Silakan isi Nama Desa di kolom B (baris ke-2) terlebih dahulu!");
    return;
  }
  
  let counter = 0;
  for (let i = 1; i < lastRow; i++) {
    const rowNum = i + 1;
    
    let uniqueCode = values[i][0] ? values[i][0].toString().trim() : '';
    const villageName = values[i][1] ? values[i][1].toString().trim() : ''; 
    let spreadsheetId = values[i][2] ? values[i][2].toString().trim() : '';
    let folderId = values[i][3] ? values[i][3].toString().trim() : '';
    let status = values[i][4] ? values[i][4].toString().trim() : '';
    const operatorEmail = values[i][6] ? values[i][6].toString().trim() : '';
    
    if (villageName) {
      let changed = false;
      
      if (!uniqueCode) {
        const slug = villageName.toUpperCase()
          .replace(/[^A-Z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        const chars = '0123456789ABCDEF';
        let randStr = '';
        for (let j = 0; j < 4; j++) {
          randStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        uniqueCode = "KTG-" + (slug || "DESA") + "-" + randStr;
        sheet.getRange(rowNum, 1).setValue(uniqueCode);
        changed = true;
      }
      
      if (!spreadsheetId) {
        try {
          const sheetName = villageName + " - Sinergi KontenGO";
          const newSS = SpreadsheetApp.create(sheetName);
          const tab = newSS.getSheets()[0];
          tab.setName("Daftar Desain Poster");
          
          const headers = ['No', 'Waktu Ekspor', 'Nama Instansi', 'Pimpinan/Sub-Judul', 'Judul Utama', 'Format Rasio', 'Quotes / Editorial', 'Link Gambar GDrive'];
          tab.appendRow(headers);
          
          const hRange = tab.getRange(1, 1, 1, 8);
          hRange.setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");
          
          if (operatorEmail) {
            try {
              const file = DriveApp.getFileById(newSS.getId());
              file.addEditor(operatorEmail);
            } catch (editorE) {
              Logger.log("Gagal share spreadsheet ke email operator: " + editorE.message);
            }
          }
          
          spreadsheetId = newSS.getId();
          sheet.getRange(rowNum, 3).setValue(spreadsheetId);
          changed = true;
        } catch (e) {
          Logger.log("Error create sheet: " + e.message);
        }
      }
      
      if (!folderId) {
        try {
          const folderName = villageName + " - Arsip KontenGO";
          const newFolder = DriveApp.createFolder(folderName);
          if (operatorEmail) {
            try {
              newFolder.addEditor(operatorEmail);
            } catch (editorE) {
              Logger.log("Gagal share folder ke email operator: " + editorE.message);
            }
          }
          folderId = newFolder.getId();
          sheet.getRange(rowNum, 4).setValue(folderId);
          changed = true;
        } catch (e) {
          Logger.log("Error create folder: " + e.message);
        }
      }
      
      if (changed) {
        if (!status) {
          sheet.getRange(rowNum, 5).setValue("AKTIF");
        }
        sheet.getRange(rowNum, 6).setValue(new Date());
        counter++;
      }
    }
  }
  SpreadsheetApp.getUi().alert("Proses selesai! Berhasil memproses " + counter + " Desa/Lembaga.");
}`;
                        navigator.clipboard.writeText(codeText);
                        setCopiedScript(true);
                        showToast("📋 Skrip disalin ke clipboard!", "success");
                        setTimeout(() => setCopiedScript(false), 3000);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 transition-colors"
                      title="Salin Kode Skrip"
                    >
                      {copiedScript ? (
                        <span className="text-[7.5px] font-extrabold text-emerald-400">Copied!</span>
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-1 text-[8.5px] text-slate-400 leading-normal pl-1.5 border-l-2 border-indigo-500/45">
                    <strong>Langkah Penggunaan:</strong>
                    <span>1. Di Spreadsheet Induk, buat tab sheet baru bernama <strong className="text-indigo-400">Daftar Desa/Lembaga</strong></span>
                    <span>2. Buat kolom header: <strong>A: Kode Unik / Password</strong>, <strong>B: Nama Desa / Lembaga</strong>, <strong>C: ID Spreadsheet Desa</strong>, <strong>D: ID Folder Desa</strong>, <strong>E: Status (AKTIF/TIDAK AKTIF)</strong>, <strong>F: Tgl Registrasi</strong>, <strong>G: Email Operator</strong></span>
                    <span>3. Tempelkan skrip ini di <strong>Ekstensi &rarr; Apps Script</strong>, klik Simpan, lalu klik fungsi <strong className="text-slate-200">onOpen</strong> untuk load menu baru.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Settings Toggle Button */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-2.5 mt-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 leading-none select-none">
                <Settings className="w-3 h-3 text-indigo-400 shrink-0" /> Pengaturan Manual (Bypass)
              </span>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded transition-all leading-none ${
                  showAdvanced ? 'text-indigo-500 bg-indigo-500/10' : 'text-slate-400 hover:text-indigo-400 hover:underline'
                }`}
              >
                {showAdvanced ? "Sembunyikan Manual" : "Tampilkan Manual"}
              </button>
            </div>

            {showAdvanced && (
              <div className="flex flex-col gap-3.5 pt-1 border-t border-slate-200/50 dark:border-slate-800/40 animate-fade-in">
                {/* Folder setting */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Folder Penyimpanan GDrive</span>
                    <span className="font-mono text-[9px] text-indigo-500 font-bold">{folderId ? 'Aktif' : 'Belum Sinkron'}</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      placeholder="Nama Folder Baru..."
                      className={`flex-1 p-2 px-3 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans font-semibold md:min-w-0 ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                    <button
                      onClick={handleSaveFolder}
                      disabled={isProcessing}
                      title="Sinkronkan Folder GDrive"
                      className={`p-2 rounded-xl border text-xs font-bold transition-all active:scale-95 shrink-0 select-none ${
                        darkMode 
                          ? 'bg-slate-800/80 border-slate-700 text-indigo-400 hover:bg-slate-700' 
                          : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100/80'
                      }`}
                    >
                      Sync
                    </button>
                  </div>
                </div>

                {/* Spreadsheet selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Spreadsheet Target</span>
                    {spreadsheetTitle && (
                      <span className={`text-[9px] font-bold max-w-[130px] truncate ${
                        spreadsheetTitle.includes('Gagal') ? 'text-rose-500' : 'text-emerald-500'
                      }`} title={spreadsheetTitle}>
                        {spreadsheetTitle}
                      </span>
                    )}
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <input 
                      type="text" 
                      value={spreadsheetId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSpreadsheetId(val);
                        localStorage.setItem('kontengo_sheet_id', val);
                      }}
                      placeholder="Masukkan ID Spreadsheet Anda..."
                      className={`p-2 px-3 rounded-xl text-xs border focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-mono md:min-w-0 ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                    
                    {spreadsheetTitle.includes('Gagal') && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] leading-relaxed flex flex-col gap-1 font-sans">
                        <span className="font-extrabold flex items-center gap-1">⚠️ Spreadsheet Tidak Dapat Diakses</span>
                        <span>ID Spreadsheet di atas adalah template default. Karena Anda baru menautkan akun Google, silakan klik tombol <strong>"Buat Arsip Baru"</strong> di bawah untuk membuat file pencatatan Anda sendiri secara otomatis!</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCreateAutoSpreadsheet}
                        disabled={isProcessing}
                        className="flex-1 py-1.5 px-3 rounded-xl border border-dashed border-indigo-500/25 bg-indigo-500/5 hover:bg-indigo-500/10 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 flex items-center justify-center gap-1 transition-all"
                      >
                        <PlusCircle className="w-3 h-3" /> Buat Arsip Baru
                      </button>

                      {spreadsheetId && !spreadsheetTitle.includes('Gagal') && (
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`py-1.5 px-3 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                            darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <FileSpreadsheet className="w-3 h-3 text-emerald-500" /> Buka Sheet <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enable Auto-Sync preference */}
            <div className="flex items-center gap-2 pt-1 font-sans">
              <input 
                id="auto-sync"
                type="checkbox" 
                checked={isAutoSyncEnabled}
                onChange={(e) => setIsAutoSyncEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="auto-sync" className="text-[10px] font-bold text-slate-400 cursor-pointer select-none">
                Auto-sync ke GDrive saat diunduh
              </label>
            </div>
          </div>

          {/* Connected Spreadsheet logs list */}
          {spreadsheetId && (
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between border-b pb-1 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500 animate-pulse" /> 5 LOG TERAKHIR SHEET
                </span>
                <button
                  onClick={fetchSpreadsheetInfo}
                  disabled={isRefreshingLogs}
                  className="p-1 px-1.5 rounded hover:bg-slate-800 transition-colors text-slate-400 flex items-center gap-1 text-[9px] font-extrabold uppercase"
                >
                  <RefreshCw className={`w-2.5 h-2.5 text-indigo-500 ${isRefreshingLogs ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {syncedItems.length === 0 ? (
                <p className="text-[10px] italic text-slate-500 text-center py-2 leading-relaxed">
                  Belum ada log poster. Log otomatis terisi saat Anda mengunduh desain poster.
                </p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[175px] overflow-y-auto pr-0.5">
                  {syncedItems.map((item, index) => (
                    <div 
                      key={index} 
                      className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all text-[11px] leading-tight ${
                        darkMode ? 'bg-slate-950/30 border-slate-800/80 hover:bg-slate-950/50' : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-heading font-extrabold text-slate-900 dark:text-slate-100 truncate flex-1">
                          {item.judulUtama || 'Tanpa Judul'}
                        </span>
                        <span className="font-mono text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-lg shrink-0 font-bold uppercase">
                          {item.rasio}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[120px]" title={item.instansi}>
                          {item.instansi}
                        </span>
                        <span className="font-sans text-[8px] italic text-slate-500">
                          {item.waktu ? item.waktu.split(' ')[0] : ''}
                        </span>
                      </div>

                      {item.links && (
                        <a 
                          href={item.links} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="self-end text-[9px] font-bold text-indigo-500 dark:text-indigo-400 flex items-center gap-0.5 hover:underline"
                        >
                          <FolderOpen className="w-3 h-3 text-emerald-500" /> Lihat di GDrive <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
