import { useState, useEffect, useRef } from 'react';
import { PosterData, DEFAULT_POSTER_DATA } from './types';
import { PreviewCanvas } from './components/PreviewCanvas';
import { FormPanel } from './components/FormPanel';
import { HistoryGallery } from './components/HistoryGallery';
import { GoogleSyncPanel } from './components/GoogleSyncPanel';
import { LoginScreen } from './components/LoginScreen';
import { 
  uploadImageToDrive, 
  appendRowToSpreadsheet, 
  getCachedToken, 
  getOrCreateFolder, 
  ensureSheetExists,
  initAuth,
  googleSignIn,
  googleLogOut,
  MASTER_SHEET_ID
} from './utils/googleWorkspace';
import html2canvas from 'html2canvas';
import { 
  Sparkles, 
  Moon, 
  Sun, 
  RotateCcw, 
  Download, 
  Eye, 
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Smartphone,
  LayoutGrid,
  Laptop,
  CloudLightning,
  FolderOpen,
  FileSpreadsheet,
  LogOut,
  RefreshCw
} from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [posterData, setPosterData] = useState<PosterData>(DEFAULT_POSTER_DATA);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  
  // Designated Spreadsheet & Folder IDs automatically locked for cleaner integration
  const [syncSpreadsheetId, setSyncSpreadsheetId] = useState<string>('14LJl7I5ripWTQ_E2Qihs9uIZCI0JYh5PzynKmMKyHF4');
  const [syncFolderId, setSyncFolderId] = useState<string>('18k-UyqXdsf1C36wu6ysHaZxWeAxtczWp');
  
  // Navigation: Toggling between Design Studio and Shared Gallery
  const [activeTab, setActiveTab] = useState<'studio' | 'gallery'>('studio');
  
  // App-level Google OAuth State
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSignProcessing, setIsSignProcessing] = useState<boolean>(false);
  const [showUserDropdown, setShowUserDropdown] = useState<boolean>(false);

  // Multi-Tenant state
  const [loggedInTenant, setLoggedInTenant] = useState<any>(null);
  const [isLoadingTenant, setIsLoadingTenant] = useState<boolean>(true);

  // Custom non-blocking Confirmation Modal state (works flawlessly without iframe restrictions)
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  } | null>(null);

  const askConfirmation = (options: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }) => {
    setConfirmConfig({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Ya, Lanjutkan',
      cancelText: options.cancelText || 'Batal',
      onConfirm: options.onConfirm,
      type: options.type || 'warning',
    });
  };

  const canvasRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);

  // Initialize Google Auth Status listeners
  useEffect(() => {
    const unsubscribe = initAuth(
      (activeUser, activeToken) => {
        setUser(activeUser);
        setToken(activeToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsSignProcessing(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        showToast('🔓 Akun Google berhasil ditautkan!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('⚠️ Gagal menautkan Google atau otentikasi dibatalkan.', 'error');
    } finally {
      setIsSignProcessing(false);
    }
  };

  const handleGoogleLogout = async () => {
    askConfirmation({
      title: 'Putuskan Akun Google',
      message: 'Apakah Anda yakin ingin memutuskan integrasi Google Drive & Sheets dari aplikasi ini?',
      confirmText: 'Ya, Putuskan Connection',
      type: 'danger',
      onConfirm: async () => {
        try {
          await googleLogOut();
          setUser(null);
          setToken(null);
          showToast('🔒 Koneksi Google Berhasil Diputuskan.', 'info');
        } catch (err) {
          console.error(err);
          showToast('⚠️ Gagal memutuskan integrasi Google.', 'error');
        }
      }
    });
  };

  const handleTenantLogout = () => {
    askConfirmation({
      title: 'Keluar Dari Sesi',
      message: 'Apakah Anda yakin ingin keluar dari aplikasi KontenGO? Anda perlu memasukkan kembali Kode Unik untuk masuk ke sesi instansi Anda.',
      confirmText: 'Ya, Keluar Sesi',
      type: 'danger',
      onConfirm: () => {
        localStorage.removeItem('kontengo_logged_in_tenant');
        localStorage.removeItem('kontengo_sheet_id');
        localStorage.removeItem('kontengo_folder_id');
        localStorage.removeItem('kontengo_kode_unik');
        localStorage.removeItem('kontengo_nama_desa');
        setLoggedInTenant(null);
        showToast('🔒 Keluar dari Sesi Multi-Tenant.', 'info');
      }
    });
  };

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kontengo_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Fallback for any missing keys in default data
        setPosterData({ ...DEFAULT_POSTER_DATA, ...parsed });
      }
    } catch (e) {
      console.error("Gagal membaca data dari LocalStorage:", e);
    }

    // Load theme preference from LocalStorage or default to dark
    const savedTheme = localStorage.getItem('kontengo_theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    } else {
      setDarkMode(true);
    }

    // Load spreadsheet and folder IDs to sync top bar profile menu links
    const savedSheetId = localStorage.getItem('kontengo_sheet_id');
    if (savedSheetId) {
      setSyncSpreadsheetId(savedSheetId);
    }
    const savedFolderId = localStorage.getItem('kontengo_folder_id');
    if (savedFolderId) {
      setSyncFolderId(savedFolderId);
    }

    // Load Tenant authorization status
    try {
      const savedTenant = localStorage.getItem('kontengo_logged_in_tenant');
      if (savedTenant) {
        const parsedTenant = JSON.parse(savedTenant);
        setLoggedInTenant(parsedTenant);
        if (parsedTenant.spreadsheetId) setSyncSpreadsheetId(parsedTenant.spreadsheetId);
        if (parsedTenant.folderId) setSyncFolderId(parsedTenant.folderId);
        
        // Auto-configure instansiNama if first loaded and form is pristine
        const activeData = localStorage.getItem('kontengo_data');
        if (!activeData && parsedTenant.villageName) {
          setPosterData(prev => ({
            ...prev,
            instansiNama1: `PEMERINTAH DESA ${parsedTenant.villageName.toUpperCase()}`,
            instansiNama2: `Kecamatan Poncol Kabupaten Magetan`
          }));
        }
      }
    } catch (e) {
      console.error("Gagal memuat tenant dari LocalStorage:", e);
    }
    setIsLoadingTenant(false);
  }, []);

  // Save theme selection to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('kontengo_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Save to LocalStorage on change
  const handleDataChange = (newData: Partial<PosterData>) => {
    const updated = { ...posterData, ...newData };
    setPosterData(updated);
    try {
      // Hilangkan data base64 gambar yang sangat besar agar tidak melebihi batasan kuota LocalStorage (5MB)
      const dataToSave = {
        ...updated,
        instansiLogo: null,
        logoKanan1: null,
        logoKanan2: null,
        bgImage: null
      };
      localStorage.setItem('kontengo_data', JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Gagal menyimpan ke LocalStorage:", e);
    }
  };

  // Toast notifications helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const newToast: Toast = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    // Auto delete after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  // Custom Toast removal
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Reset data to defaults
  const handleReset = () => {
    askConfirmation({
      title: 'Setel Ulang Desain',
      message: 'Apakah Anda yakin ingin menyetel ulang semua input ke template awal? Seluruh editing tulisan yang ada saat ini akan terhapus.',
      confirmText: 'Ya, Reset Desain',
      type: 'warning',
      onConfirm: () => {
        setPosterData(DEFAULT_POSTER_DATA);
        localStorage.setItem('kontengo_data', JSON.stringify(DEFAULT_POSTER_DATA));
        showToast("🔄 Aplikasi berhasil disetel ulang!", "success");
      }
    });
  };

  // Scroll smoothly to preview (excellent on mobile!)
  const handleScrollToPreview = () => {
    if (previewSectionRef.current) {
      previewSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast("🎯 Menampilkan preview poster", "info");
    }
  };

  // Switch to studio mode and apply selected template data
  const handleLoadTemplateFromGallery = (templateData: Partial<PosterData>) => {
    handleDataChange(templateData);
    setActiveTab('studio');
    // Smooth scroll down to preview panel on load
    setTimeout(() => {
      if (previewSectionRef.current) {
        previewSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Download Poster PNG with high fidelity using Blob URL
  const handleExportPNG = async () => {
    if (!posterData.judulUtama.trim()) {
      showToast("❌ Judul Utama poster wajib diisi sebelum didownload!", "error");
      return;
    }

    setIsExporting(true);
    const getDesignHeight = (ratio: string) => {
      switch (ratio) {
        case '1:1':
          return 1080;
        case '4:5':
          return 1350;
        case '16:9':
          return 608;
        case '9:16':
        default:
          return 1920;
      }
    };
    const exportHeight = getDesignHeight(posterData.aspectRatio);
    const resolutionText = posterData.aspectRatio === '1:1' ? '1080x1080px' : posterData.aspectRatio === '4:5' ? '1080x1350px' : posterData.aspectRatio === '16:9' ? '1080x608px' : '1080x1920px';
    showToast(`⏳ Memproses download gambar poster ${resolutionText}...`, "info");

    // TEMPORARILY REPLACE oklch AND oklab IN ALL DOCUMENT STYLESHEETS TO PREVENT html2canvas PARSING CRASH
    const tempStyleElements: HTMLStyleElement[] = [];
    const restoredNodes: { node: Node; parent: Node; nextSibling: Node | null }[] = [];

    // Precise, complete conversion math for OKLCH and OKLAB to standard RGB/RGBA strings
    const oklToRgb = (colorStr: string): string => {
      try {
        const isCh = colorStr.toLowerCase().includes('oklch');
        const cleanStr = colorStr.replace(/^(oklch|oklab)\s*\(/i, '').replace(/\)$/, '').trim();
        
        // Split by spaces or slashes
        const parts = cleanStr.split(/\s*[\s/]\s*/);
        if (parts.length < 3) {
          return '#1e293b'; // general standard fallback color
        }
        
        const parsePart = (val: string, maxVal: number = 1) => {
          if (val.endsWith('%')) {
            return (parseFloat(val) / 100) * maxVal;
          }
          return parseFloat(val);
        };

        const L = parsePart(parts[0]);
        const val2 = parsePart(parts[1]); // C or a
        const val3 = parts[2]; // H or b
        
        let alpha = 1;
        if (parts.length > 3) {
          alpha = parsePart(parts[3]);
        }

        let a = 0;
        let b = 0;

        if (isCh) {
          // OKLCH
          const C = val2;
          let H_deg = parseFloat(val3);
          if (val3.endsWith('rad')) {
            H_deg = (parseFloat(val3) * 180) / Math.PI;
          } else if (val3.endsWith('grad')) {
            H_deg = (parseFloat(val3) * 360) / 400;
          } else if (val3.endsWith('turn')) {
            H_deg = parseFloat(val3) * 360;
          }
          const H_rad = (H_deg * Math.PI) / 180;
          a = C * Math.cos(H_rad);
          b = C * Math.sin(H_rad);
        } else {
          // OKLAB
          a = val2;
          b = parsePart(val3);
        }

        // Convert OKLAB matrix to LMS
        const l_lms = L + 0.3963377774 * a + 0.2158037573 * b;
        const m_lms = L - 0.1055613458 * a - 0.0638541728 * b;
        const s_lms = L - 0.0894841775 * a - 1.2914855480 * b;

        // Cube elements
        const l = Math.pow(Math.max(0, l_lms), 3);
        const m = Math.pow(Math.max(0, m_lms), 3);
        const s = Math.pow(Math.max(0, s_lms), 3);

        // Convert LMS matrix to Linear sRGB
        const r_lin = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
        const g_lin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
        const b_lin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

        // Apply gamma correction matching standard Web sRGB
        const gamma = (val: number) => {
          const clamped = Math.max(0, Math.min(1, val));
          return clamped <= 0.0031308
            ? 12.92 * clamped
            : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
        };

        const r = Math.round(gamma(r_lin) * 255);
        const g = Math.round(gamma(g_lin) * 255);
        const b_val = Math.round(gamma(b_lin) * 255);

        if (alpha === 1) {
          return `rgb(${r}, ${g}, ${b_val})`;
        } else {
          return `rgba(${r}, ${g}, ${b_val}, ${alpha})`;
        }
      } catch (err) {
        console.warn("Failed converting individual OKLAB/OKLCH color, using fallback:", err);
        return '#1e293b';
      }
    };

    // Scans custom CSS code block and replaces oklch/oklab signatures seamlessly
    const replaceOklColors = (cssText: string): string => {
      let result = '';
      let i = 0;
      const len = cssText.length;
      while (i < len) {
        const sub5 = cssText.slice(i, i + 6).toLowerCase();
        const isOklch = sub5.startsWith('oklch(');
        const isOklab = sub5.startsWith('oklab(');
        
        if (isOklch || isOklab) {
          const startIdx = i;
          const startTag = isOklch ? 'oklch(' : 'oklab(';
          i += startTag.length;
          let bracketCount = 1;
          while (i < len && bracketCount > 0) {
            if (cssText[i] === '(') {
              bracketCount++;
            } else if (cssText[i] === ')') {
              bracketCount--;
            }
            i++;
          }
          const colorExpr = cssText.slice(startIdx, i);
          result += oklToRgb(colorExpr);
        } else {
          result += cssText[i];
          i++;
        }
      }
      return result;
    };

    // Temporarily proxy and patch window.getComputedStyle properties so that computed CSS variables
    // containing oklch or oklab are seamlessly converted on retrieval during html2canvas render pass.
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(el, pseudoElt) {
      const style = originalGetComputedStyle.call(window, el, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return function(propertyName: string) {
              const rawVal = target.getPropertyValue(propertyName);
              if (rawVal && (rawVal.toLowerCase().includes('oklch') || rawVal.toLowerCase().includes('oklab'))) {
                return replaceOklColors(rawVal);
              }
              return rawVal;
            };
          }
          const val = target[prop as any];
          if (typeof val === 'function') {
            return val.bind(target);
          }
          if (typeof val === 'string') {
            if (val.toLowerCase().includes('oklch') || val.toLowerCase().includes('oklab')) {
              return replaceOklColors(val);
            }
          }
          return val;
        }
      });
    };

    try {
      // Find all live style elements and stylesheet links in the head or body
      const styleElements = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
      
      for (const el of styleElements) {
        const parent = el.parentNode;
        if (!parent) continue;
        
        // Save current position for accurate DOM restoration
        restoredNodes.push({
          node: el,
          parent,
          nextSibling: el.nextSibling
        });

        if (el.tagName.toLowerCase() === 'style') {
          const originalText = (el as HTMLStyleElement).innerHTML;
          const cleanedText = replaceOklColors(originalText);
          
          const tempStyle = document.createElement('style');
          tempStyle.className = "temp-html2canvas-clean-style";
          tempStyle.innerHTML = cleanedText;
          document.head.appendChild(tempStyle);
          tempStyleElements.push(tempStyle);
        } else if (el.tagName.toLowerCase() === 'link') {
          // Attempt to extract and clean link CSS rules (if same-origin)
          let cleanedText = '';
          let successfullyRead = false;
          try {
            const sheet = (el as HTMLLinkElement).sheet;
            if (sheet && sheet.cssRules) {
              const originalText = Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
              cleanedText = replaceOklColors(originalText);
              successfullyRead = true;
            }
          } catch (e) {
            console.warn("Could not read rules of external stylesheet link directly:", e);
          }
          
          if (successfullyRead && cleanedText) {
            const tempStyle = document.createElement('style');
            tempStyle.className = "temp-html2canvas-clean-style";
            tempStyle.innerHTML = cleanedText;
            document.head.appendChild(tempStyle);
            tempStyleElements.push(tempStyle);
          }
        }
      }

      // PHYSICALLY REMOVE all original style/link tags from the live DOM (makes them completely invisible to html2canvas)
      restoredNodes.forEach(item => {
        if (item.node.parentNode) {
          item.node.parentNode.removeChild(item.node);
        }
      });

      const element = canvasRef.current;
      if (!element) {
        throw new Error("Elemen poster tidak ditemukan!");
      }

      // Save original transform and parent styling to avoid clipping/distortion inside scaled elements
      const originalTransform = element.style.transform;
      element.style.transform = 'none';

      const parentElement = element.parentElement;
      let originalParentHeight = "";
      let originalParentOverflow = "";
      if (parentElement) {
        originalParentHeight = parentElement.style.height;
        originalParentOverflow = parentElement.style.overflow;
        parentElement.style.height = `${exportHeight}px`;
        parentElement.style.overflow = 'visible';
      }

      // Briefly wait to let UI elements render/settle
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Capture using html2canvas with correct settings
      const canvas = await html2canvas(element, {
        scale: 2, // Double pixel density for extreme high-definition clarity
        useCORS: true,
        allowTaint: false, // Must be false to prevent SecurityError when drawing cross-origin images
        backgroundColor: null,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1080,
        windowHeight: exportHeight,
        width: 1080,
        height: exportHeight
      });

      // Restore original scale transform style and parents immediately
      element.style.transform = originalTransform;
      if (parentElement) {
        parentElement.style.height = originalParentHeight;
        parentElement.style.overflow = originalParentOverflow;
      }

      // Convert to blob inside a Promise so that asynchronous errors are caught in the catch block 
      // and loading spinner stays active until the blob download completes
      await new Promise<void>((resolve, reject) => {
        try {
          if (!canvas) {
            reject(new Error("Gagal merender kanvas poster!"));
            return;
          }

          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error("Gagal membuat data file gambar!"));
              return;
            }
            
            try {
              const blobUrl = URL.createObjectURL(blob);
              const link = document.createElement("a");
              const sanitizedTitle = posterData.judulUtama
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "_")
                .substring(0, 30);
              const dateStr = posterData.tanggal || "no_date";
              const fileName = `KontenGO-${sanitizedTitle}-${dateStr}.png`;
              
              link.download = fileName;
              link.href = blobUrl;
              
              // Append to body temporarily to ensure click triggers correctly on all devices
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              // Revoke the object URL to release browser memory
              setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
              showToast("✅ Berhasil didownload! Silakan periksa file di perangkat Anda.", "success");

              // Sync to Drive & Sheets
              const activeToken = getCachedToken();
              const activeSheetId = localStorage.getItem('kontengo_sheet_id') || syncSpreadsheetId || '14LJl7I5ripWTQ_E2Qihs9uIZCI0JYh5PzynKmMKyHF4';

              if (activeToken) {
                showToast("🛰️ Menyinkronkan poster ke Google Drive & Sheets...", "info");
                try {
                  const targetFolderId = localStorage.getItem('kontengo_folder_id') || syncFolderId || '18k-UyqXdsf1C36wu6ysHaZxWeAxtczWp';

                  // 2. Upload file to GDrive with retry fallback
                  let uploadResult;
                  try {
                    uploadResult = await uploadImageToDrive(blob, fileName, targetFolderId, activeToken);
                  } catch (e) {
                    console.warn("Retrying upload dynamically...", e);
                    uploadResult = await uploadImageToDrive(blob, fileName, targetFolderId, activeToken);
                  }

                  // 3. Ensure target sheet is authenticated & exists in this Spreadsheet
                  const resolvedSheetName = await ensureSheetExists(activeSheetId, activeToken);
                  
                  // 4. Create and append row data
                  const timestampStr = new Date().toLocaleString('id-ID');
                  const rowData = [
                    [
                      '=ROW()-1', 
                      timestampStr, 
                      `${posterData.instansiNama1} ${posterData.instansiNama2}`,
                      posterData.subJudul,
                      posterData.judulUtama,
                      posterData.aspectRatio,
                      posterData.quote,
                      uploadResult.viewLink
                    ]
                  ];
                  
                  // Write to user/village-specific Spreadsheet
                  await appendRowToSpreadsheet(activeSheetId, resolvedSheetName, rowData, activeToken);

                  // Also write to the central Master/Induk Spreadsheet if it is different
                  if (activeSheetId !== MASTER_SHEET_ID) {
                    try {
                      const resolvedMasterSheetName = await ensureSheetExists(MASTER_SHEET_ID, activeToken);
                      await appendRowToSpreadsheet(MASTER_SHEET_ID, resolvedMasterSheetName, rowData, activeToken);
                    } catch (mErr) {
                      console.warn("Muted: Failed to append to central master spreadsheet due to permission/access constraints.", mErr);
                    }
                  }
                  
                  showToast("☁️ Poster berhasil terarsip di Google Drive & Sheets!", "success");
                } catch (gErr: any) {
                  console.error("Gagal melakukan otomatisasi pencatatan google sync:", gErr);
                  showToast(`⚠️ Gagal menyinkronkan data: ${gErr.message || 'Periksa koneksi'}`, "error");
                }
              } else {
                // Warn user that they haven't connected Google account yet
                showToast("💡 Tautkan akun Google Anda di kanan atas halaman untuk menyimpan poster & melacak riwayat secara otomatis di Google Spreadsheet!", "info");
              }

              resolve();
            } catch (err) {
              reject(err);
            }
          }, "image/png", 1.0);
        } catch (err) {
          reject(err);
        }
      });

    } catch (err: any) {
      console.error(err);
      showToast(`❌ Gagal: ${err.message || 'Error tidak dikenal saat unduh'}`, "error");
    } finally {
      // 1. Restore original getComputedStyle instantly
      window.getComputedStyle = originalGetComputedStyle;

      // 2. Remove all clean temporary style elements
      tempStyleElements.forEach(el => el.remove());

      // 3. Restore all original stylesheet nodes to their precise DOM positions in reverse order.
      // Doing this in reverse order safely handles successive brother siblings without insertBefore index conflicts.
      restoredNodes.reverse().forEach(item => {
        try {
          const parentExists = item.parent && (document.contains(item.parent) || item.parent.ownerDocument === document);
          if (parentExists) {
            if (item.nextSibling && item.nextSibling.parentNode === item.parent && document.contains(item.nextSibling)) {
              item.parent.insertBefore(item.node, item.nextSibling);
            } else {
              item.parent.appendChild(item.node);
            }
          } else {
            document.head.appendChild(item.node);
          }
        } catch (err) {
          console.warn("Soft conflict when restoring stylesheet node, appending as fallback:", err);
          try {
            document.head.appendChild(item.node);
          } catch (e) {
            console.error("Critical failure inserting style element:", e);
          }
        }
      });
      setIsExporting(false);
    }
  };

  if (isLoadingTenant) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menghubungkan Sesi Cloud...</span>
        </div>
      </div>
    );
  }

  if (!loggedInTenant) {
    return (
      <LoginScreen 
        darkMode={darkMode}
        user={user}
        token={token}
        onGoogleSignIn={handleGoogleLogin}
        onGoogleSignOut={handleGoogleLogout}
        onLoginSuccess={(tenant) => {
          setLoggedInTenant(tenant);
          if (tenant.spreadsheetId) setSyncSpreadsheetId(tenant.spreadsheetId);
          if (tenant.folderId) setSyncFolderId(tenant.folderId);
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* 1. TOPBAR HEADER */}
      <header className={`sticky top-0 z-40 px-2 py-2 sm:px-4 sm:py-3 border-b backdrop-blur-md transition-colors duration-300 ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 xs:gap-2 sm:gap-3">
          
          {/* Logo Brand / Icon */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <img 
              src="https://res.cloudinary.com/maswardi/image/upload/v1780153515/kontenGO_ku5hax.png" 
              alt="KontenGO Logo" 
              className="w-7.5 h-7.5 sm:w-10 sm:h-10 object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col justify-center leading-none">
              <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
                <span className="hidden sm:inline font-heading font-black text-base md:text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-indigo-550 to-amber-400 bg-clip-text text-transparent leading-none">
                  KontenGO
                </span>
                {loggedInTenant && (
                  <span className="py-0.5 px-2 text-[8px] sm:text-[9px] font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 rounded-full select-none shrink-0 leading-none">
                    {loggedInTenant.villageName}
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-[8px] sm:text-[9.5px] text-slate-400 font-semibold font-sans mt-0.5 whitespace-nowrap">Poster Creator Instansi</p>
            </div>
          </div>

          {/* Main Navigation Tab Selector (Studio vs Galeri) */}
          <div className="flex items-center gap-0.5 xs:gap-1 bg-slate-950/5 dark:bg-slate-900/40 p-0.5 xs:p-1 rounded-xl border border-slate-200/55 dark:border-slate-800 shadow-inner shrink-0">
            <button
              onClick={() => setActiveTab('studio')}
              className={`py-1 px-1.5 xs:px-2.5 sm:px-3 text-[9px] xs:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all select-none leading-none ${
                activeTab === 'studio'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 xs:w-3.5 xs:h-3.5 animate-pulse text-amber-500 shrink-0" />
              <span>Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`py-1 px-1.5 xs:px-2.5 sm:px-3 text-[9px] xs:text-[11px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all select-none leading-none ${
                activeTab === 'gallery'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FolderOpen className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-emerald-400 shrink-0" />
              <span>Galeri<span className="hidden sm:inline"> Arsip</span></span>
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Google Auth Status Badge */}
            {user ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={`flex items-center gap-1 p-0.5 pr-1 xs:p-1 xs:pr-2 rounded-xl border transition-all ${
                    darkMode 
                      ? 'border-slate-800 bg-slate-950/65 hover:bg-slate-800 text-slate-100' 
                      : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800'
                  }`}
                  title={`${user.displayName} (${user.email})`}
                >
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName} 
                      className="w-4.5 h-4.5 xs:w-5.5 xs:h-5.5 rounded-full border border-emerald-500 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-4.5 h-4.5 xs:w-5.5 xs:h-5.5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[8px] xs:text-[9px] font-black shrink-0">
                      {user.displayName?.charAt(0) || 'G'}
                    </div>
                  )}
                  <span className="hidden tracking-wider sm:inline text-[10px] text-slate-400 font-bold uppercase leading-none">Akun</span>
                  <span className="w-1 h-1 xs:w-1.5 xs:h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                </button>
                
                {showUserDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                    <div className={`absolute right-0 mt-2.5 w-56 p-4 rounded-2xl border shadow-2xl z-50 flex flex-col gap-3 font-sans ${
                      darkMode ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/90' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/40'
                    }`}>
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
                        {user.photoURL && (
                          <img src={user.photoURL} className="w-7 h-7 rounded-full border border-indigo-500/20" referrerPolicy="no-referrer" />
                        )}
                        <div className="flex flex-col leading-tight overflow-hidden">
                          <span className="text-[11px] font-black truncate">{user.displayName}</span>
                          <span className="text-[9px] text-slate-400 truncate mt-0.5">{user.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 text-[10px]">
                        <a 
                          href={`https://docs.google.com/spreadsheets/d/${syncSpreadsheetId || '14LJl7I5ripWTQ_E2Qihs9uIZCI0JYh5PzynKmMKyHF4'}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-bold"
                          onClick={() => setShowUserDropdown(false)}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Buka Google Sheets
                        </a>
                        <a 
                          href={syncFolderId ? `https://drive.google.com/drive/folders/${syncFolderId}` : "https://drive.google.com"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 font-bold"
                          onClick={() => setShowUserDropdown(false)}
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Buka Google Drive
                        </a>
                      </div>

                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          handleGoogleLogout();
                        }}
                        className="w-full py-1.5 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all font-bold text-[10px] text-center"
                      >
                        Putuskan Hubungan Google
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isSignProcessing}
                className="flex items-center gap-1 py-1 px-1.5 sm:px-3 rounded-xl border border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 transition-all text-xs font-black uppercase tracking-wider text-indigo-500 dark:text-indigo-400 cursor-pointer shrink-0"
                title="Sinergi arsip instansi otomatis dengan mengoneksikan akun Google"
              >
                <CloudLightning className="w-4 h-4 text-indigo-500 animate-pulse shrink-0" />
                <span className="hidden sm:inline">Tautkan Google</span>
              </button>
            )}

            {/* Keluar Aplikasi (Tenant Logout) */}
            {loggedInTenant && (
              <button
                onClick={handleTenantLogout}
                title="Keluar Sesi Instansi"
                className={`p-1 sm:py-1.5 sm:px-3 rounded-xl border flex items-center gap-1 transition-all text-xs font-black uppercase tracking-wider select-none hover:scale-[1.02] active:scale-[0.98] shrink-0 ${
                  darkMode 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20' 
                    : 'bg-rose-5 border-rose-100 text-rose-600 hover:bg-rose-100'
                }`}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0 text-rose-500 dark:text-rose-450" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            )}

            {/* Toggle Theme */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? "Aktifkan Light Mode" : "Aktifkan Dark Mode"}
              className={`p-1 xs:p-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 shrink-0 ${
                darkMode 
                  ? 'bg-slate-850 border-slate-800 text-amber-400 hover:bg-slate-800 shadow shadow-amber-500/5' 
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-250 shadow shadow-black/5'
              }`}
            >
              {darkMode ? <Sun className="w-3.5 h-3.5 shrink-0" /> : <Moon className="w-3.5 h-3.5 shrink-0" />}
            </button>

            {/* Tentang Kami / Info Button */}
            <button
              onClick={() => setIsAboutOpen(true)}
              title="Tentang Developer & KontenGO"
              className={`p-1 xs:p-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 flex items-center gap-1 xs:gap-1.5 shrink-0 select-none ${
                darkMode 
                  ? 'bg-slate-850 border-slate-800 text-indigo-400 hover:bg-slate-800 shadow shadow-indigo-500/5' 
                  : 'bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-250 shadow shadow-indigo-500/5'
              }`}
            >
              <Info className="w-3.5 h-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
              <span className="hidden md:inline text-[11px] font-black uppercase tracking-wider">Tentang</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN HUB APPS LAYOUT */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {activeTab === 'studio' ? (
          /* STUDIO TAB VIEW - GORGEOUS CLEAN 2-COLUMN LAYOUT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUMN 1: FORM INPUTS PANEL */}
            <div className="lg:col-span-5 flex flex-col gap-4 order-2 lg:order-1">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 px-1 leading-none select-none">
                <span className="text-emerald-500 font-extrabold text-base">•</span> DATA FORM POSTER
              </h2>
              <FormPanel 
                data={posterData}
                onChange={handleDataChange}
                onReset={handleReset}
                onExport={handleExportPNG}
                isExporting={isExporting}
                darkMode={darkMode}
              />
            </div>

            {/* COLUMN 2: CENTER PREVIEW PANEL */}
            <div 
              ref={previewSectionRef}
              className="lg:col-span-7 flex flex-col gap-4 order-1 lg:order-2 self-start lg:sticky lg:top-24"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5 leading-none select-none">
                  <span className="text-indigo-500 font-extrabold text-base">•</span> LIVE CANVAS PREVIEW
                </h2>
                
                <button
                  onClick={handleReset}
                  className="text-xs font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-all"
                  title="Sapu Bersih Semua Data"
                >
                  <RotateCcw className="w-3 h-3" /> Setel Ulang Form
                </button>
              </div>
              
              <div className={`p-4 rounded-3xl border shadow-xl ${
                darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200/60'
              }`}>
                <PreviewCanvas data={posterData} canvasRef={canvasRef} onChange={handleDataChange} />
              </div>
            </div>

          </div>
        ) : (
          /* SPREADSHEET DATABASE ARCHIVE GALLERY TAB VIEW */
          <div className="animate-fade-in">
            <HistoryGallery 
              darkMode={darkMode}
              onLoadToStudio={handleLoadTemplateFromGallery}
              showToast={showToast}
            />
          </div>
        )}

      </main>

      {/* 3. FIXED BOTTOM BAR (for Mobile Screens) */}
      <div className={`fixed bottom-0 left-0 w-full z-30 p-3 border-t bg-white/95 backdrop-blur-md flex items-center justify-around gap-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] md:hidden transition-colors ${
        darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <button
          onClick={handleReset}
          className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
          title="Reset semua form"
        >
          <RotateCcw className="w-4 h-4 text-rose-500" />
          Reset
        </button>

        <button
          onClick={handleScrollToPreview}
          className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1 active:scale-95"
        >
          <Eye className="w-4 h-4 text-indigo-500" />
          Lihat Preview
        </button>

        <button
          onClick={handleExportPNG}
          disabled={isExporting}
          className="flex-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-md shadow-emerald-500/15 active:scale-95"
        >
          {isExporting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ⏳ Memproses...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Gambar
            </>
          )}
        </button>
      </div>

      {/* 4. FLOATING TOAST STACKS */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 md:bottom-6 z-50 flex flex-col gap-2.5 w-[90%] max-w-md pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`p-3.5 rounded-2xl shadow-xl border flex items-start gap-3 pointer-events-auto cursor-pointer select-none toast-animation transition-all transform hover:scale-[1.01] ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-100'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-100'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-950 dark:border-indigo-900 dark:text-indigo-100'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-indigo-500 shrink-0" />
            )}
            
            <p className="text-xs sm:text-sm font-medium flex-1">{toast.message}</p>
            
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* 5. ABOUT US & DEVELOPER PROFILE MODAL */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={() => setIsAboutOpen(false)}
          />
          
          {/* Modal Container */}
          <div className={`relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border shadow-2xl transition-all flex flex-col ${
            darkMode 
              ? 'bg-slate-900 border-slate-800 text-slate-100' 
              : 'bg-white border-slate-200 text-slate-800'
          }`}>
            {/* Header */}
            <div className={`sticky top-0 z-10 p-5 border-b flex items-center justify-between ${
              darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className="p-1 px-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 font-bold text-xs flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> About Us
                </div>
              </div>
              <button 
                onClick={() => setIsAboutOpen(false)}
                className={`p-1.5 rounded-xl transition-all hover:scale-105 active:scale-95 ${
                  darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-black'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 flex flex-col gap-6">
              {/* Description */}
              <div className="flex flex-col gap-2">
                <p className="text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  <strong className="bg-gradient-to-r from-emerald-400 via-indigo-400 to-amber-400 bg-clip-text text-transparent font-black">KontenGO (Poster Creator Instansi)</strong> adalah sistem pembuat poster dan kartu ucapan publikasi instansi modern yang dirancang khusus untuk mewadahi kebutuhan pemerintah desa, institusi pendidikan, lembaga dinas regional, serta organisasi sosial kemasyarakatan lainnya dalam menghasilkan materi poster publikasi bermartabat secara cepat, simetris, dan mewah.
                </p>
              </div>

              {/* Fitur Unggulan */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Fitur Utama Aplikasi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h5 className="text-xs font-extrabold uppercase tracking-wide">Nama Instansi Berwarna Emas</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Logo instansi serta label teks dilapisi warna emas berkelas untuk tampilan mewah dan presisi.</p>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h5 className="text-xs font-extrabold uppercase tracking-wide">Multi-Rasio Fleksibel</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Dukung berbagai layout populer: 9:16 (Story), 1:1 (Post), 4:5 (Feeds), dan 16:9 (Landscape) dengan adaptasi tajam.</p>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h5 className="text-xs font-extrabold uppercase tracking-wide">Foto Latar & Filter Kustom</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Sesuaikan tingkat kegelapan, rona, dan skala foto latar belakang Anda agar teks poster tetap mudah dibaca.</p>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    darkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h5 className="text-xs font-extrabold uppercase tracking-wide">Unduhan HD Tanpa Watermark</h5>
                      <p className="text-[11px] text-slate-400 mt-1">Ekspor hasil desain ke gambar PNG kualitas tinggi seketika dengan aman, siap publikasi.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Developer Profile Section (Arunika Kreatif Media) */}
              <div className={`p-5 rounded-2xl border flex flex-col md:flex-row gap-5 items-center ${
                darkMode ? 'bg-indigo-950/10 border-indigo-500/10' : 'bg-indigo-50/30 border-indigo-100/60'
              }`}>
                {/* Developer Logo */}
                <div className={`w-36 h-20 rounded-xl border border-dashed flex items-center justify-center p-2 shrink-0 ${
                  darkMode ? 'bg-slate-950/25 border-indigo-500/25' : 'bg-white border-indigo-200'
                }`}>
                  <img 
                    src="https://res.cloudinary.com/maswardi/image/upload/v1768753170/akm_500_x_300_px_op0l8f.png" 
                    alt="Arunika Kreatif Media Logo" 
                    className="w-full h-full object-contain filter drop-shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Developer Info and Description */}
                <div className="flex-1 text-center md:text-left">
                  <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none block">Pengembang Aplikasi</span>
                  <h4 className="font-heading font-black text-base md:text-lg text-slate-900 dark:text-white mt-1">Arunika Kreatif Media</h4>
                  <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-400 mt-0.5 font-medium italic">"Media Publikasi & Kreativitas Digital Nusantara"</p>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Arunika Kreatif Media berdedikasi tinggi dalam mendampingi langkah transformasi digital terintegrasi untuk instansi sektor publik dan kemasyarakatan melalui penyediaan layanan visual, kreasi konten, serta perangkat lunak yang andal.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex items-center justify-between text-[11px] text-slate-400 ${
              darkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <span>© {new Date().getFullYear()} KontenGO. All rights reserved.</span>
              <button 
                onClick={() => setIsAboutOpen(false)}
                className="px-4 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 dark:bg-slate-100 dark:hover:bg-slate-250 dark:text-slate-900 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom non-blocking Confirmation Modal */}
      {confirmConfig && confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop Overlay */}
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity" 
            onClick={() => setConfirmConfig(null)}
          />
          
          {/* Dialog Container */}
          <div className={`relative w-full max-w-sm p-6 rounded-3xl border shadow-2xl transition-all flex flex-col gap-4 font-sans ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/90' : 'bg-white border-slate-200 text-slate-800 shadow-slate-300/40'
          }`}>
            {/* Header / Icon */}
            <div className="flex items-start gap-3.5">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                confirmConfig.type === 'danger' 
                  ? 'bg-rose-500/10 text-rose-500' 
                  : confirmConfig.type === 'warning'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-indigo-500/10 text-indigo-500'
              }`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <h4 className="text-sm font-black uppercase tracking-wide leading-tight">
                  {confirmConfig.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-medium mt-1">
                  {confirmConfig.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setConfirmConfig(null)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors select-none ${
                  darkMode 
                    ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' 
                    : 'bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                }`}
              >
                {confirmConfig.cancelText}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmConfig.onConfirm();
                  setConfirmConfig(null);
                }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider text-white transition-all select-none shadow-md ${
                  confirmConfig.type === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/10'
                    : confirmConfig.type === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/10'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/10'
                }`}
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
