export const GAS_TEMPLATE = `// CODE UNTUK GOOGLE APPS SCRIPT (Code.gs)
// 1. Buat Spreadsheet Baru di Google Drive
// 2. Klik Ekstensi > Apps Script
// 3. Paste kode ini, lalu klik Simpan
// 4. Klik Terapkan (Deploy) > Deployment Baru
// 5. Pilih "Aplikasi Web"
// 6. Jalankan sebagai: "Saya"
// 7. Siapa yang memiliki akses: "Siapa saja" (Anyone)
// 8. Copy URL Web App yang dihasilkan dan paste di pengaturan aplikasi ini.

const SHEET_NAME = "DataSiswa";

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "id", "nis", "nisn", "name", "class", "gender", "dob", "address", 
      "parentName", "status", "ijazahNo", "ijazahUrl", "berkasUrl", 
      "kkUrl", "akteUrl", "fotoUrl",
      "createdAt", "updatedAt"
    ]);
    sheet.getRange(1, 1, 1, 18).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  
  // Memancing agar Google meminta izin akses Google Drive saat setup() dijalankan
  try {
    DriveApp.getRootFolder();
  } catch(e) {}
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (payload.action === "upload") {
      return handleUpload(payload);
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if(!sheet) {
      setup();
      sheet = ss.getSheetByName(SHEET_NAME);
    }

    if (payload.action === "sync") {
      // Sync all data from app to sheet (overwrite sheet with app data for simplicity if needed,
      // or we can just append/update. Let's do a full sync / replace for simplicity in this demo)
      
      const records = payload.data; // Array of student objects
      
      // Clear existing, keeping headers
      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
      
      if (records && records.length > 0) {
        const rows = records.map(s => [
          s.id || "", s.nis || "", s.nisn || "", s.name || "", s.class || "", s.gender || "", 
          s.dob || "", s.address || "", s.parentName || "", s.status || "", 
          s.ijazahNo || "", s.ijazahUrl || "", s.berkasUrl || "", 
          s.kkUrl || "", s.akteUrl || "", s.fotoUrl || "",
          s.createdAt || "", s.updatedAt || ""
        ]);
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
      return jsonResponse({ success: true, message: "Data synced successfully" });
    }

    if (payload.action === "pull") {
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return jsonResponse({ data: [] });
      
      const headers = data[0];
      const records = [];
      
      for (let i = 1; i < data.length; i++) {
          let row = data[i];
          let obj = {};
          for (let j = 0; j < headers.length; j++) {
             obj[headers[j]] = row[j];
          }
          records.push(obj);
      }
      return jsonResponse({ data: records });
    }

  } catch (error) {
    return jsonResponse({ error: error.toString() });
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if(!sheet) {
      setup();
      return jsonResponse({ data: [] });
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return jsonResponse({ data: [] });
    
    const headers = data[0];
    const records = [];
    
    for (let i = 1; i < data.length; i++) {
        let row = data[i];
        let obj = {};
        for (let j = 0; j < headers.length; j++) {
           obj[headers[j]] = row[j];
        }
        records.push(obj);
    }
    return jsonResponse({ data: records });
  } catch(err) {
      return jsonResponse({ error: err.toString() });
  }
}

function handleUpload(payload) {
  try {
    let folder;
    if (payload.folderId) {
      // Menangani error jika Folder ID salah
      try {
        folder = DriveApp.getFolderById(payload.folderId);
      } catch (e) {
        return jsonResponse({ error: "Folder ID tidak valid atau tidak dapat diakses." });
      }
    } else {
      const folderName = payload.folderName || "SISWA_UPLOADS";
      const folders = DriveApp.getFoldersByName(folderName);
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder(folderName);
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      }
    }
    
    // Pastikan folder ada sebelum membuat file
    if (!folder) {
      return jsonResponse({ error: "Gagal mendapatkan atau membuat folder upload." });
    }
    
    const blob = Utilities.newBlob(Utilities.base64Decode(payload.base64), payload.mimeType, payload.filename);
    const file = folder.createFile(blob);
    
    // Allow anyone to view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return jsonResponse({ success: true, url: file.getUrl() });
  } catch (err) {
    return jsonResponse({ error: "Upload failed: " + err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
