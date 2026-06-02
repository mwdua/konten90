import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(firebaseApp);

// Central Master Spreadsheet ID for Multi-Tenant registration registry & master logging
export const MASTER_SHEET_ID = (import.meta as any).env?.VITE_MASTER_SPREADSHEET_ID || '1DOZcAkthe_r-zdV-RcS-RYNOVAkyxOiWpw66zp-0duU';

const provider = new GoogleAuthProvider();
// Set required scopes for accessing drive files created by application and spreadsheets
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// Set prompt to select account to avoid silent loops
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache variables for access token and state, with fallback to sessionStorage
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem('kontengo_google_oauth_token');
  } catch (e) {
    return null;
  }
})();
let isSigningIn = false;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess: (user: User, token: string) => void,
  onAuthFailure: () => void
) => {
  // Try to retrieve token from memory or sessionStorage if already active
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          cachedAccessToken = sessionStorage.getItem('kontengo_google_oauth_token');
        } catch (e) {
          cachedAccessToken = null;
        }
      }
      
      if (cachedAccessToken) {
        onAuthSuccess(user, cachedAccessToken);
      } else {
        // If we lost the token but user is signed in, we can ask them to sign in again to get fresh credentials
        onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('kontengo_google_oauth_token');
      } catch (e) {}
      onAuthFailure();
    }
  });
};

// Sign in with Google Dialog
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    await setPersistence(auth, browserSessionPersistence);
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google.');
    }
    
    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem('kontengo_google_oauth_token', cachedAccessToken);
    } catch (e) {
      console.warn('Fail set token in sessionStorage', e);
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Error during Google sign-in:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Log out and clear memory
export const googleLogOut = async (): Promise<void> => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('kontengo_google_oauth_token');
  } catch (e) {}
};

// Helper to check token status
export const getCachedToken = (): string | null => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = sessionStorage.getItem('kontengo_google_oauth_token');
    } catch (e) {
      cachedAccessToken = null;
    }
  }
  return cachedAccessToken;
};

// Clear token on 401 Unauthorized
export const handleAuthError = (status: number) => {
  if (status === 401) {
    cachedAccessToken = null;
    try {
      sessionStorage.removeItem('kontengo_google_oauth_token');
    } catch (e) {}
    auth.signOut();
  }
};

/**
 * GOOGLE DRIVE FUNCTIONS
 */

// Search for active folder or create it if missing
export const getOrCreateFolder = async (folderName: string, accessToken: string): Promise<string> => {
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  
  // 1. Search for folder
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (searchRes.status === 401) {
    handleAuthError(401);
    throw new Error("Sesi Google Anda telah berakhir (401). Silakan hubungkan kembali akun Anda.");
  }
  
  if (!searchRes.ok) {
    throw new Error(`Failed to search Drive folder: ${searchRes.statusText}`);
  }
  
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id; // Return existing folder ID
  }
  
  // 2. Create directory folder if not exists
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  
  if (createRes.status === 401) {
    handleAuthError(401);
    throw new Error("Sesi Google Anda telah berakhir (401). Silakan hubungkan kembali akun Anda.");
  }
  
  if (!createRes.ok) {
    throw new Error(`Failed to create Drive folder: ${createRes.statusText}`);
  }
  
  const folderData = await createRes.json();
  return folderData.id;
};

// Upload PNG Blob to Drive folder with shared link enabled
export const uploadImageToDrive = async (
  imageBlob: Blob, 
  fileName: string, 
  folderId: string, 
  accessToken: string
): Promise<{ id: string; viewLink: string }> => {
  
  // 1. Multipart body creation for File Metadata + File Content
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  
  const metadata = {
    name: fileName,
    mimeType: 'image/png',
    parents: [folderId]
  };
  
  // Convert blob to base64 so we can construct a multipart string easily
  const reader = new FileReader();
  const base64Promise = new Promise<string>((resolve) => {
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Content = reader.result.split(',')[1];
        resolve(base64Content);
      }
    };
    reader.readAsDataURL(imageBlob);
  });
  
  const base64Data = await base64Promise;
  
  const multipartBody = 
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: image/png\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelimiter;
    
  // 2. Upload file
  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink';
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });
  
  if (uploadRes.status === 401) {
    handleAuthError(401);
    throw new Error("Sesi Google Anda telah berakhir (401). Silakan hubungkan kembali akun Anda.");
  }
  
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Failed to upload to Drive: ${errorText || uploadRes.statusText}`);
  }
  
  const fileData = await uploadRes.json();
  const fileId = fileData.id;
  
  // 3. Make the image file readable by anyone with the shareable link (optional, but requested for Sheets visualization & shareability)
  try {
    const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
    if (permRes.status === 401) {
      handleAuthError(401);
    }
  } catch (err) {
    console.warn('Could not update permission to anyone:', err);
  }
  
  return {
    id: fileId,
    viewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`
  };
};


/**
 * GOOGLE SHEETS FUNCTIONS
 */

// Create a new Spreadsheet and initialize headers
export const createNewSpreadsheet = async (title: string, accessToken: string): Promise<string> => {
  const url = 'https://sheets.googleapis.com/v4/spreadsheets';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      },
      sheets: [
        {
          properties: {
            title: 'Daftar Desain Poster'
          }
        }
      ]
    })
  });
  
  if (res.status === 401) {
    handleAuthError(401);
    throw new Error("Sesi Google Anda telah berakhir (401). Silakan hubungkan kembali akun Anda.");
  }
  
  if (!res.ok) {
    throw new Error(`Failed to create spreadsheet: ${res.statusText}`);
  }
  
  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  
  // Add Header Row
  const headers = [
    [
      'No', 
      'Waktu Ekspor', 
      'Nama Instansi', 
      'Pimpinan/Sub-Judul', 
      'Judul Utama', 
      'Format Rasio', 
      'Quotes / Editorial', 
      'Link Gambar GDrive'
    ]
  ];
  
  await appendRowToSpreadsheet(spreadsheetId, 'Daftar Desain Poster', headers, accessToken);
  
  return spreadsheetId;
};

// Check if spreadsheet is valid
export const getSpreadsheetTitle = async (spreadsheetId: string, accessToken: string): Promise<string> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties(title)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.status === 401) {
    handleAuthError(401);
    throw new Error("Sesi Google Anda telah berakhir (401). Silakan hubungkan kembali akun Anda.");
  }
  
  if (!res.ok) {
    throw new Error(`Spreadsheet tidak ditemukan atau tidak memiliki akses.`);
  }
  
  const data = await res.json();
  return data.properties.title;
};

// Check if sheet exists, or prepare the first sheet for highest visibility to the user
export const ensureSheetExists = async (spreadsheetId: string, accessToken: string): Promise<string> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.status === 401) {
    handleAuthError(401);
    throw new Error("Sesi Google Anda telah berakhir (401). Silakan hubungkan kembali akun Anda.");
  }
  
  if (!res.ok) {
    throw new Error(`Gagal membaca metadata spreadsheet. Pastikan Anda memiliki akses pengeditan.`);
  }
  
  const data = await res.json();
  const sheets = data.sheets || [];
  if (sheets.length === 0) {
    throw new Error(`Spreadsheet tidak memiliki lembar halaman (sheet).`);
  }
  
  // Always use the very first sheet for highest visibility to the user (e.g., "Sheet1")
  const firstSheetName = sheets[0].properties?.title || "Sheet1";
  
  // Check if the headers exist in the first sheet
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${firstSheetName}'!A1:H1`)}`;
  const checkRes = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (checkRes.status === 401) {
    handleAuthError(401);
  }
  
  let needsHeaders = true;
  if (checkRes.ok) {
    const checkData = await checkRes.json();
    if (checkData.values && checkData.values.length > 0 && checkData.values[0].length > 0) {
      needsHeaders = false;
    }
  }
  
  if (needsHeaders) {
    const headers = [
      [
        'No', 
        'Waktu Ekspor', 
        'Nama Instansi', 
        'Pimpinan/Sub-Judul', 
        'Judul Utama', 
        'Format Rasio', 
        'Quotes / Editorial', 
        'Link Gambar GDrive'
      ]
    ];
    // Update or write the first row with headers
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${firstSheetName}'!A1:H1`)}?valueInputOption=USER_ENTERED`;
    const upRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range: `'${firstSheetName}'!A1:H1`,
        majorDimension: 'ROWS',
        values: headers
      })
    });
    if (upRes.status === 401) {
      handleAuthError(401);
    }
  }
  
  return firstSheetName;
};

// Append list values row
export const appendRowToSpreadsheet = async (
  spreadsheetId: string, 
  sheetName: string, 
  values: string[][], 
  accessToken: string
): Promise<void> => {
  const range = encodeURIComponent(`'${sheetName}'!A1`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: `'${sheetName}'!A1`,
      majorDimension: 'ROWS',
      values: values
    })
  });
  
  if (res.status === 401) {
    handleAuthError(401);
    throw new Error("Sesi Google Anda telah berakhir (401). Silakan hubungkan kembali akun Anda.");
  }
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to append row to Sheets: ${errorText || res.statusText}`);
  }
};

// Fetch current logged poster rows to show inside application
export const getSpreadsheetRows = async (
  spreadsheetId: string, 
  sheetName: string,
  accessToken: string
): Promise<string[][]> => {
  const range = encodeURIComponent(`'${sheetName}'!A2:H1000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.status === 401) {
    handleAuthError(401);
    throw new Error("Sesi Google Anda telah berakhir (401). Silakan hubungkan kembali akun Anda.");
  }
  
  if (!res.ok) {
    throw new Error(`Gagal memuat baris dari Sheets: ${res.statusText}`);
  }
  
  const data = await res.json();
  return data.values || [];
};
