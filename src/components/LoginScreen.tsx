import React, { useState } from 'react';
import { 
  Key, 
  CloudLightning, 
  FileSpreadsheet, 
  Lock, 
  ShieldAlert, 
  ArrowRight,
  Server,
  UserCheck,
  CheckCircle,
  HelpCircle,
  X
} from 'lucide-react';
import { MASTER_SHEET_ID } from '../utils/googleWorkspace';

interface LoginScreenProps {
  darkMode: boolean;
  user: any;
  token: string | null;
  onGoogleSignIn: () => Promise<void>;
  onGoogleSignOut: () => Promise<void>;
  onLoginSuccess: (tenantData: {
    uniqueCode: string;
    villageName: string;
    spreadsheetId: string;
    folderId: string;
    operatorEmail: string;
  }) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  darkMode,
  user,
  token,
  onGoogleSignIn,
  onGoogleSignOut,
  onLoginSuccess,
  showToast
}) => {
  const [inputCode, setInputCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showHowTo, setShowHowTo] = useState<boolean>(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorText("Silakan masukkan Kode Unik Akses!");
      return;
    }
    if (!token) {
      setErrorText("Sesi Google belum terhubung! Silakan aktifkan tautan Google terlebih dahulu.");
      return;
    }

    setIsVerifying(true);
    try {
      // Dynamic import to prevent dependency load time problems
      const { getSpreadsheetTitle, getSpreadsheetRows } = await import('../utils/googleWorkspace');

      // 1. Check with Spreadsheet Induk (Read-only verification)
      let resolvedMasterTitle;
      try {
        resolvedMasterTitle = await getSpreadsheetTitle(MASTER_SHEET_ID, token);
      } catch (err: any) {
        console.error("Gagal verifikasi sheet induk:", err);
        throw new Error("Gagal membaca Spreadsheet Induk. Pastikan Akun Google Anda memiliki izin akses minimal Viewer pada Spreadsheet Pendaftaran.");
      }

      // 2. Fetch rows
      let rows;
      try {
        rows = await getSpreadsheetRows(MASTER_SHEET_ID, 'Daftar Desa/Lembaga', token);
      } catch (err: any) {
        throw new Error("Tab 'Daftar Desa/Lembaga' tidak ditemukan di Spreadsheet Induk pendaftaran.");
      }

      // 3. Find unique code in registered rows (Column A / index 0)
      // Normalize function to strip all space characters (including invisible unicode ones)
      const normalizeCode = (str: string) => {
        return str
          .replace(/[\s\u200B\u200C\u200D\uFEFF\u00A0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, '')
          .trim()
          .toUpperCase();
      };

      const cleanInput = normalizeCode(cleanCode);

      // Attempt 1: Exact search with space normalization
      let matchedRow = rows.find((row) => {
        if (!row[0]) return false;
        return normalizeCode(row[0].toString()) === cleanInput;
      });

      // Attempt 2 (Fallback): If exact matches failed, strip all non-alphanumeric characters (A-Z, 0-9)
      // This protects against decorative punctuation or discrepancies such as * # - _ space 
      if (!matchedRow) {
        const strictAlphaNumInput = cleanInput.replace(/[^A-Z0-9]/g, '');
        if (strictAlphaNumInput.length >= 4) {
          matchedRow = rows.find((row) => {
            if (!row[0]) return false;
            const rowAlpha = row[0].toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
            return rowAlpha === strictAlphaNumInput;
          });
        }
      }

      if (!matchedRow) {
        let debugDetails = 'Kosong';
        if (rows && rows.length > 0) {
          debugDetails = rows.map((r, i) => `#${i+2}: "${r[0] || 'N/A'}" (Len: ${(r[0] || '').toString().length})`).join(', ');
        }
        throw new Error(`Kode Unik / Password "${cleanCode}" tidak terdaftar di database Spreadsheet Induk.\n\nData terbaca di Sheet: [${debugDetails}].\n\nPastikan Anda telah mendeploy/mem-publish ulang Google Apps Script Anda ke "Version: New" (Sangat Penting agar perubahan API aktif).`);
      }

      const targetDesa = matchedRow[1] || 'Desa Akses';
      const targetSheet = matchedRow[2] || '';
      const targetFolder = matchedRow[3] || '';
      const status = matchedRow[4] || 'AKTIF';
      const operatorEmail = matchedRow[6] || '';

      if (status.toUpperCase() !== 'AKTIF') {
        throw new Error(`Lisensi/Akses untuk ${targetDesa} saat ini berstatus "${status}" (Tidak Aktif). Hubungi admin.`);
      }

      if (!targetFolder || !targetSheet) {
        throw new Error(`Akses terdaftar, namun database untuk ${targetDesa} belum selesai digenerate oleh developer.`);
      }

      // Automatically store in localStorage
      localStorage.setItem('kontengo_sheet_id', targetSheet);
      localStorage.setItem('kontengo_folder_id', targetFolder);
      localStorage.setItem('kontengo_kode_unik', cleanCode);
      localStorage.setItem('kontengo_nama_desa', targetDesa);
      
      const sessionData = {
        uniqueCode: cleanCode,
        villageName: targetDesa,
        spreadsheetId: targetSheet,
        folderId: targetFolder,
        operatorEmail
      };
      
      localStorage.setItem('kontengo_logged_in_tenant', JSON.stringify(sessionData));

      // Callback to root component
      showToast(`🎉 Akses Berhasil divalidasi sebagai operator ${targetDesa}!`, 'success');
      onLoginSuccess(sessionData);

    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Gagal memproses validasi masuk.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between p-4 font-sans relative overflow-hidden transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      {/* Top logo header */}
      <div className="flex justify-end p-2 sm:p-4 z-10">
        <button
          onClick={() => setShowHowTo(!showHowTo)}
          className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg border transition-all ${
            darkMode 
              ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white' 
              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" /> Panduan Akses
        </button>
      </div>

      {/* Main Container */}
      <div className="max-w-[440px] w-full mx-auto my-auto flex flex-col gap-6 z-10 px-2 sm:px-4">
        
        {/* Core Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="relative group mb-3">
            <div className="absolute inset-0 bg-indigo-500/15 rounded-full blur-xl group-hover:bg-indigo-500/25 transition-all duration-300 transform scale-110" />
            <img 
              src="https://res.cloudinary.com/maswardi/image/upload/v1780153515/kontenGO_ku5hax.png" 
              alt="KontenGO" 
              className="w-20 h-20 object-contain relative drop-shadow-[0_4px_16px_rgba(31,41,55,0.2)] animate-fade-in"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl leading-tight bg-gradient-to-r from-emerald-400 via-indigo-500 to-amber-400 bg-clip-text text-transparent transform select-none px-1">
            KontenGO
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1.5 leading-none">
            Multi-Tenant Web Studio
          </p>
          <p className="text-[11px] leading-relaxed text-slate-400/80 mt-2 max-w-xs">
            Portal Pembuat Poster & Media Publikasi untuk Pemerintah Desa, Sekolah, Lembaga, dan Instansi.
          </p>
        </div>

        {/* Card Body */}
        <div className={`p-6 rounded-3xl border-2 shadow-2xl transition-all relative ${
          darkMode 
            ? 'bg-slate-900/60 backdrop-blur-md border-slate-800/80 bubble-glow' 
            : 'bg-white/95 border-slate-200/90 shadow-slate-300/40'
        }`}>
          
          <div className="flex flex-col gap-5">
            {/* Step 1: Google Account Link (Predefined security rules enforcement) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                Langkah 1: Sinergi Cloud
                {token ? (
                  <span className="text-[10px] font-black tracking-normal text-emerald-500 bg-emerald-500/10 p-0.5 px-2 rounded-full flex items-center gap-1 leading-none uppercase">
                    Aktif
                  </span>
                ) : (
                  <span className="text-[9px] font-black tracking-normal text-amber-500 bg-amber-500/10 p-0.5 px-2 rounded-full leading-none uppercase">
                    Belum Terhubung
                  </span>
                )}
              </label>

              {token ? (
                <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-colors ${
                  darkMode ? 'bg-slate-900 border-slate-850' : 'bg-slate-50 border-slate-100'
                }`}>
                  <div className="flex items-center gap-2 overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} className="w-6.5 h-6.5 rounded-full border border-emerald-500 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-6.5 h-6.5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-[10px] font-black shrink-0">
                        {user?.displayName?.charAt(0) || 'G'}
                      </div>
                    )}
                    <div className="flex flex-col leading-tight overflow-hidden">
                      <span className="text-[10.5px] font-extrabold truncate text-slate-200 dark:text-slate-1000">{user?.displayName}</span>
                      <span className="text-[8.5px] text-slate-400 truncate mt-0.5">{user?.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={onGoogleSignOut}
                    className="text-[9px] font-extrabold text-rose-500 hover:text-rose-400 bg-rose-500/5 hover:bg-rose-500/15 py-1 px-2 rounded-md transition-all shrink-0"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={onGoogleSignIn}
                  className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-indigo-500/25"
                >
                  <CloudLightning className="w-4 h-4 text-amber-400 animate-pulse" />
                  Hubungkan Akun Google
                </button>
              )}
            </div>

            {/* Step 2: Unique Code Input Form */}
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  Langkah 2: Password / Kode Unik Akses
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    disabled={!token || isVerifying}
                    placeholder={token ? "Masukan Kode Desa (Contoh: KTG-PONCOL-C1A2)" : "Tautkan akun Google Anda terlebih dahulu"}
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-black transition-all border outline-none font-sans ${
                      !token 
                        ? 'bg-slate-800/10 border-slate-800/25 text-slate-500 dark:text-slate-400 cursor-not-allowed selection:bg-transparent'
                        : darkMode 
                          ? 'bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                          : 'bg-slate-50/50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Error Box */}
              {errorText && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border-2 border-rose-500/15 text-rose-500 text-[10.5px] leading-relaxed flex items-start gap-2 animate-shake font-sans">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-extrabold uppercase text-[9px] tracking-wider block">Gagal Sinkronisasi</strong>
                    <span className="mt-0.5 block">{errorText}</span>
                  </div>
                </div>
              )}

              {/* Verify button */}
              <button
                type="submit"
                disabled={!token || isVerifying || !inputCode.trim()}
                className={`w-full py-2.5 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all select-none leading-none border shadow-lg transform ${
                  !token || !inputCode.trim()
                    ? 'bg-slate-800/50 border-transparent text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                    : isVerifying
                      ? 'bg-indigo-600/80 border-indigo-500 text-white cursor-wait'
                      : 'bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.01] border-emerald-500 text-white shadow-emerald-500/15 active:scale-[0.99]'
                }`}
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 shrink-0" />
                    Masuk Studio KontenGO <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer info/sub-text */}
        <p className="text-[10px] text-center text-slate-500 leading-normal font-sans">
          Sistem Cloud Multi-Tenant oleh <strong>Arunika Kreatif Media</strong>
        </p>

      </div>

      {/* Panduan Modal */}
      {showHowTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setShowHowTo(false)} />
          <div className={`relative w-full max-w-md max-h-[80vh] overflow-y-auto rounded-3xl p-6 border shadow-2xl transition-all ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Panduan Masuk Aplikasi
              </h2>
              <button onClick={() => setShowHowTo(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3 font-sans text-xs text-slate-400 leading-relaxed">
              <p>
                Aplikasi <strong>KontenGO</strong> menggunakan sistem database cloud terintegrasi di Google Sheets untuk mengontrol hak akses operasional desa.
              </p>
              
              <div className="flex flex-col gap-2 bg-slate-950/20 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-indigo-500/10">
                <strong className="text-slate-200">Cara Masuk:</strong>
                <ol className="list-decimal pl-4 flex flex-col gap-1.5">
                  <li>Hubungkan Akun Google Anda di <strong>Langkah 1</strong>.</li>
                  <li>Masukkan <strong>Kode Unik / Password Akses</strong> desa Anda di <strong>Langkah 2</strong> (Dibuat otomatis oleh Admin di Spreadsheet Induk).</li>
                  <li>Sistem akan mencocokkan Kode Unik tersebut dengan Registry Aktif di Spreadsheet Induk.</li>
                  <li>Jika valid, Anda akan langsung dialihkan ke ruang kerja Desa Anda!</li>
                </ol>
              </div>

              <div className="flex flex-col gap-1 text-[9.5px]">
                <span className="font-bold text-slate-300">Catatan untuk Admin / Developer:</span>
                <span>Pastikan sheet pendaftaran master di Google Sheets berada di ID: <br /><code className="block p-1 bg-slate-950/50 rounded font-mono break-all mt-1">{MASTER_SHEET_ID}</code></span>
              </div>
            </div>
            
            <button 
              onClick={() => setShowHowTo(false)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl font-bold text-xs mt-5 transition-all text-center"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}

      {/* Bottom copy */}
      <footer className="text-center p-2 text-[9px] text-slate-500/80 mt-auto leading-none">
        © 2026 KontenGO • Member of Arunika Kreatif Media
      </footer>

    </div>
  );
};
