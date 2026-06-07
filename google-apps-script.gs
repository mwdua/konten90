/**
 * ==============================================================================
 * KONTENGO - GOOGLE APPS SCRIPT (Sinergi Poster Instansi)
 * Developer: Arunika Kreatif Media
 * URL Logo: https://res.cloudinary.com/maswardi/image/upload/v1768753170/akm_500_x_300_px_op0l8f.png
 * Version: 2.0 (Dynamic Auto-Heal & Responsive Detection)
 * ==============================================================================
 * 
 * SCRIPT INI UNTUK DIPASANG DI SPREADSHEET TARGET:
 * 1. Buka Google Spreadsheet Anda.
 * 2. Klik menu "Ekstensi" -> "Apps Script".
 * 3. Hapus semua kode default, lalu paste kode di bawah ini.
 * 4. Klik tombol "Simpan" (ikon disket) dan Refresh halaman spreadsheet Anda.
 * 5. Menu baru "Tindakan KontenGO 🎉" akan muncul di toolbar atas!
 */

// Global Config
const APP_DEVELOPER = 'Arunika Kreatif Media';
const LOGO_URL = 'https://res.cloudinary.com/maswardi/image/upload/v1768753170/akm_500_x_300_px_op0l8f.png';

/**
 * Trigger otomatis ketika Spreadsheet dibuka.
 * Membuat menu kustom untuk interaksi cepat admin.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Tindakan KontenGO 🎉')
    .addItem('🖼️ Generate Pratinjau Gambar (Thumbnail)', 'generateThumbnails')
    .addSeparator()
    .addItem('📊 Perbarui Info & Statistik Desain', 'showStatistics')
    .addItem('❓ Bantuan & Detail Pengembang', 'showDeveloperInfo')
    .addToUi();
}

/**
 * Helper untuk mendeteksi sheet poster secara dinamis berdasarkan baris header.
 * Hal ini menghindari error/mismatch akibat penamaan halaman (e.g. Sheet1 vs Daftar Desain Poster).
 */
function getPosterSheetAndHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let selectedSheet = null;
  let headerValues = [];

  // 1. Cari sheet yang baris pertamanya memiliki header "Link Gambar GDrive"
  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    if (s.getLastRow() > 0) {
      const lastCol = Math.min(s.getLastColumn(), 20);
      if (lastCol >= 1) {
        const rowValues = s.getRange(1, 1, 1, lastCol).getValues()[0];
        const hasGdriveHeader = rowValues.some(val => {
          const sVal = String(val).trim().toLowerCase();
          return sVal === 'link gambar gdrive' || sVal === 'link gdrive' || sVal === 'drive link';
        });

        if (hasGdriveHeader) {
          selectedSheet = s;
          headerValues = rowValues.map(val => String(val).trim().toLowerCase());
          break;
        }
      }
    }
  }

  // 2. Jika tidak ketemu, cari halaman bernama "Daftar Desain Poster"
  if (!selectedSheet) {
    selectedSheet = ss.getSheetByName('Daftar Desain Poster');
    if (selectedSheet && selectedSheet.getLastRow() > 0) {
      const lastCol = Math.min(selectedSheet.getLastColumn(), 20);
      headerValues = selectedSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(val => String(val).trim().toLowerCase());
    }
  }

  // 3. Jika masih tidak ketemu, gunakan halaman pertama yang aktif
  if (!selectedSheet && sheets.length > 0) {
    selectedSheet = ss.getActiveSheet() || sheets[0];
    if (selectedSheet && selectedSheet.getLastRow() > 0) {
      const lastCol = Math.min(selectedSheet.getLastColumn(), 20);
      headerValues = selectedSheet.getRange(1, 1, 1, lastCol).getValues()[0].map(val => String(val).trim().toLowerCase());
    }
  }

  return {
    sheet: selectedSheet,
    headers: headerValues
  };
}

/**
 * Mengubah link Google Drive biasa menjadi link thumbnail langsung,
 * lalu menaruh formula =IMAGE() ke dalam Kolom Thumbnail untuk pratinjau instan.
 */
function generateThumbnails() {
  const { sheet, headers } = getPosterSheetAndHeaders();
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error ⚠️', 'Gagal mendeteksi sheet pengarsipan KontenGO. Pastikan Anda telah mengunduh poster minimal satu kali untuk menginisialisasi tabel.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('Info ℹ️', `Sheet "${sheet.getName()}" ditemukan, namun belum ada baris data desain poster yang dicatat.`, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Deteksi Kolom Link GDrive
  let driveColIdx = headers.indexOf('link gambar gdrive');
  if (driveColIdx === -1) {
    driveColIdx = headers.indexOf('link gdrive');
  }
  if (driveColIdx === -1) {
    driveColIdx = headers.indexOf('drive link');
  }
  
  // Default fallback ke kolom 8 (Kolom H) jika header tidak dikenali
  const colDriveNum = (driveColIdx !== -1) ? (driveColIdx + 1) : 8;

  // Cari atau buat kolom Pratinjau Poster (Thumbnail)
  let previewColIdx = headers.indexOf('pratinjau poster (thumbnail)');
  if (previewColIdx === -1) {
    previewColIdx = headers.indexOf('thumbnail');
  }
  if (previewColIdx === -1) {
    previewColIdx = headers.indexOf('pratinjau');
  }

  let colPreviewNum;
  if (previewColIdx === -1) {
    // Tambah kolom baru di sisi paling kanan
    colPreviewNum = sheet.getLastColumn() + 1;
    sheet.getRange(1, colPreviewNum).setValue('Pratinjau Poster (Thumbnail)').setFontWeight('bold').setBackground('#e0e7ff');
  } else {
    colPreviewNum = previewColIdx + 1;
  }

  const urlsRange = sheet.getRange(2, colDriveNum, lastRow - 1, 1);
  const urls = urlsRange.getValues();
  
  const previewRange = sheet.getRange(2, colPreviewNum, lastRow - 1, 1);
  const formulasAndValues = [];

  for (let i = 0; i < urls.length; i++) {
    const driveUrl = String(urls[i][0]).trim();
    if (driveUrl && (driveUrl.indexOf('drive.google.com') !== -1 || driveUrl.indexOf('docs.google.com') !== -1 || driveUrl.indexOf('googleusercontent.com') !== -1)) {
      const fileId = extractFileId(driveUrl);
      if (fileId) {
        // Buat URL direct thumbnail dari API Google Drive
        const thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}=w200-h200`;
        formulasAndValues.push([`=IMAGE("${thumbnailUrl}", 1)`]);
      } else {
        formulasAndValues.push(['']);
      }
    } else {
      formulasAndValues.push(['']);
    }
  }

  // Tulis formula secara batch untuk kecepatan transmisi optimal
  previewRange.setValues(formulasAndValues);
  
  // Atur kemenarikan baris (tinggi baris setara 85px agar poster kelihatan utuh)
  sheet.setRowHeights(2, lastRow - 1, 85);
  sheet.setColumnWidth(colPreviewNum, 110);

  SpreadsheetApp.getUi().alert('Sukses 🎉', `Berhasil merender gambar poster instan di Kolom Baru (Pratinjau) pada sheet "${sheet.getName()}". Gunakan visualisasi ini untuk manajemen konten yang lebih rapi!`, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Pembantu untuk mengekstrak File ID dari berbagai pola link Google Drive
 */
function extractFileId(url) {
  if (!url) return null;
  // Pola standard id: d/FILE_ID/view atau id=FILE_ID
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

/**
 * Menampilkan statistik dinamis tentang koleksi desain poster yang tersimpan
 */
function showStatistics() {
  const { sheet, headers } = getPosterSheetAndHeaders();
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error ⚠️', 'Sheet database tidak ditemukan.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('Statistik KontenGO', 'Belum ada poster yang tersimpan di arsip.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Cari kolom Instansi & Rasio secara dinamis
  let instansiColIdx = headers.indexOf('nama instansi');
  if (instansiColIdx === -1) instansiColIdx = headers.indexOf('instansi');
  const colInstansiNum = (instansiColIdx !== -1) ? (instansiColIdx + 1) : 3;

  let rasioColIdx = headers.indexOf('format rasio');
  if (rasioColIdx === -1) rasioColIdx = headers.indexOf('rasio');
  const colRasioNum = (rasioColIdx !== -1) ? (rasioColIdx + 1) : 6;

  // Baca data
  const totalPoster = lastRow - 1;
  const instansiRange = sheet.getRange(2, colInstansiNum, totalPoster, 1).getValues();
  const rasioRange = sheet.getRange(2, colRasioNum, totalPoster, 1).getValues();

  let rasisMap = {};
  let instansiMap = {};

  for (let i = 0; i < totalPoster; i++) {
    const instansi = String(instansiRange[i][0]).trim() || 'Umum';
    const rasio = String(rasioRange[i][0]).trim() || '9:16';
    
    instansiMap[instansi] = (instansiMap[instansi] || 0) + 1;
    rasisMap[rasio] = (rasisMap[rasio] || 0) + 1;
  }

  // Format Pesan Pop-up
  let statsMessage = `📊 RINGKASAN DATA KONTENGO (Sheet: "${sheet.getName()}") 📊\n`;
  statsMessage += `==================================\n`;
  statsMessage += `Total Poster Terarsip: ${totalPoster} Desain\n\n`;
  
  statsMessage += `📐 Distribusi Rasio Tampilan:\n`;
  for (let r in rasisMap) {
    statsMessage += `   • ${r}: ${rasisMap[r]} Poster\n`;
  }
  
  statsMessage += `\n🏢 Kontributor Instansi:\n`;
  for (let inst in instansiMap) {
    statsMessage += `   • ${inst}: ${instansiMap[inst]} Poster\n`;
  }
  statsMessage += `==================================\n`;
  statsMessage += `Sinkronisasi dinamis oleh ekosistem digital KontenGO.`;

  SpreadsheetApp.getUi().alert('Analitis Poster Instansi', statsMessage, SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Menampilkan Info Dialog Pengembang Arunika Kreatif Media
 */
function showDeveloperInfo() {
  const htmlOutput = HtmlService.createHtmlOutput(
    `<div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; line-height: 1.6; text-align: center; color: #1e293b;">
       <div style="background-color: #f8fafc; border-radius: 16px; padding: 15px; margin-bottom: 20px; display: inline-block; border: 1px dashed #cbd5e1;">
         <img src="${LOGO_URL}" alt="${APP_DEVELOPER} Logo" style="max-height: 80px; object-fit: contain; margin-bottom: 10px;" />
         <h2 style="margin: 5px 0 0 0; color: #4f46e5; font-size: 1.4rem; font-weight: 800;">${APP_DEVELOPER}</h2>
         <p style="margin: 2px 0; font-size: 0.85rem; color: #64748b; font-style: italic;">"Media Publikasi & Kreativitas Digital Nusantara"</p>
       </div>
       <p style="text-align: left; font-size: 0.9rem; margin-bottom: 15px;">
         Portal integrasi data <strong>KontenGO</strong> didukung penuh oleh <strong>${APP_DEVELOPER}</strong> untuk menyelaraskan publikasi data instansi, desa, organisasi sektoral, dan sekolah secara cepat, rapi, dan tepercaya.
       </p>
       <div style="background-color: #f1f5f9; border-radius: 12px; padding: 12px; text-align: left; font-size: 0.85rem; color: #334155; margin-bottom: 20px;">
         <strong>ℹ️ Cara kerja Apps Script V2 ini:</strong><br>
         - <strong>Deteksi Otomatis</strong>: Melacak lembar kerja aktif dengan regex pintar, terhindar dari kaku penamaan sheet.<br>
         - <strong>Thumbnail Generator</strong>: Menyematkan render gambar poster dari GDrive ke file Spreadsheet.<br>
         - <strong>Data Statik Instan</strong>: Menyajikan analisis proporsi data real-time dengan satu klik.
       </div>
       <div style="font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
         © ${new Date().getFullYear()} KontenGO & ${APP_DEVELOPER}. Semua Hak Dilindungi.
       </div>
     </div>`
  )
  .setWidth(450)
  .setHeight(480)
  .setTitle('Detail Mitra Pengembang');
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Tentang Kreator & Developer');
}

/**
 * ==============================================================================
 * INTERNAL WEB APP API FOR VERCEL DEPLOYMENT (OPTION A: WEB APP PROXY API)
 * Allows KontenGO Frontend on Vercel to access Sheets & Drive securely without Firebase!
 * ==============================================================================
 */

function doPost(e) {
  var result = {};
  try {
    var params;
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    } else {
      params = {};
    }

    var action = params.action;
    
    if (action === "getMasterRows") {
      var masterId = params.masterId || "1DOZcAkthe_r-zdV-RcS-RYNOVAkyxOiWpw66zp-0duU";
      var ss = SpreadsheetApp.openById(masterId);
      var sheetName = params.sheetName || "Daftar Desa/Lembaga";
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error("Sheet '" + sheetName + "' tidak ditemukan di Spreadsheet Induk.");
      }
      var lastRow = sheet.getLastRow();
      var values = [];
      if (lastRow >= 2) {
        values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
      }
      result = { status: "success", values: values };
    } 
    else if (action === "getRows") {
      var spreadsheetId = params.spreadsheetId;
      var sheetName = params.sheetName || "Daftar Desain Poster";
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error("Halaman sheet tidak ditemukan.");
      }
      var lastRow = sheet.getLastRow();
      var values = [];
      if (lastRow >= 2) {
        values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
      }
      result = { status: "success", values: values };
    }
    else if (action === "appendRow") {
      var spreadsheetId = params.spreadsheetId;
      var sheetName = params.sheetName || "Daftar Desain Poster";
      var rowData = params.values; // Array of arrays
      
      var ss = SpreadsheetApp.openById(spreadsheetId);
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        var sheets = ss.getSheets();
        sheet = sheets[0];
      }
      
      // If sheet has no rows, write headers first
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'No', 
          'Waktu Ekspor', 
          'Nama Instansi', 
          'Pimpinan/Sub-Judul', 
          'Judul Utama', 
          'Format Rasio', 
          'Quotes / Editorial', 
          'Link Gambar GDrive'
        ]);
      }
      
      for (var i = 0; i < rowData.length; i++) {
        sheet.appendRow(rowData[i]);
      }
      result = { status: "success" };
    }
    else if (action === "uploadFile") {
      var folderId = params.folderId;
      var base64Data = params.base64Data;
      var fileName = params.fileName;
      
      var folder = DriveApp.getFolderById(folderId);
      var contentType = "image/png";
      var bytes = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(bytes, contentType, fileName);
      var file = folder.createFile(blob);
      
      // Set to anyone with link view scope
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      result = {
        status: "success",
        id: file.getId(),
        viewLink: file.getUrl()
      };
    }
    else {
      throw new Error("Aksi API '" + action + "' tidak dikenali.");
    }
  } catch (error) {
    result = { status: "error", message: error.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  var action = (e && e.parameter) ? e.parameter.action : null;
  if (action === "check") {
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "API Google Apps Script KontenGO Aktif!" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return doPost(e);
}
