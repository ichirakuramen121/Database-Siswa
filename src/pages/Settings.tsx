import { useStore } from '../store';
import { Save, Copy, Check, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { GAS_TEMPLATE } from '../lib/constants';
import QRCode from "react-qr-code";

export default function Settings() {
  const { settings, setSettings } = useStore();
  const [url, setUrl] = useState(settings.scriptUrl);
  const [appName, setAppName] = useState(settings.appName || 'EduConnect');
  const [folderId, setFolderId] = useState(settings.folderId || '');
  const [copied, setCopied] = useState(false);

  const shareConfigUrl = settings.scriptUrl ? `${window.location.origin}${window.location.pathname}?config=${encodeURIComponent(btoa(JSON.stringify({ scriptUrl: settings.scriptUrl, folderId: settings.folderId, appName: settings.appName })))}` : '';

  const handleSave = () => {
    setSettings({ ...settings, scriptUrl: url, appName, folderId });
    alert("Pengaturan Berhasil Disimpan!");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(GAS_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-indigo-900">Pengaturan</h2>
        <p className="text-gray-500 mt-1 font-medium">Konfigurasi database dengan Google Apps Script.</p>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl p-5 sm:p-8 rounded-3xl sm:rounded-[2rem] border border-white/90 shadow-lg">
        <h3 className="text-xl font-bold mb-6 text-indigo-900">Konfigurasi Umum</h3>
        <div className="space-y-4 mb-8">
          <div>
            <label className="label">Nama Aplikasi</label>
            <input 
              type="text" 
              className="input w-full text-sm sm:text-base" 
              placeholder="Contoh: EduConnect"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
            />
          </div>
        </div>

        <h3 className="text-xl font-bold mb-6 text-indigo-900">Integrasi Google Sheets & Drive</h3>
        
        <div className="space-y-4">
          <div>
            <label className="label">Google Apps Script Web App URL</label>
            <input 
              type="text" 
              className="input w-full text-sm sm:text-base" 
              placeholder="https://script.google.com/macros/s/.../exec"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">Dapatkan URL ini dari proses deploy Google Apps Script.</p>
          </div>
          <div>
            <label className="label">Folder ID Google Drive (Opsional)</label>
            <input 
              type="text" 
              className="input w-full text-sm sm:text-base" 
              placeholder="Contoh: 1BxiMVs0XzM... (Ambil dari URL folder)"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">Jika dikosongkan, script akan otomatis membuat folder "SISWA_UPLOADS".</p>
          </div>
          <button onClick={handleSave} className="btn w-full sm:w-auto">
            <Save size={18} />
            Simpan Konfigurasi
          </button>
        </div>

        {shareConfigUrl && (
          <div className="mt-8 pt-8 border-t border-white/40">
            <h3 className="text-xl font-bold mb-4 text-indigo-900 flex items-center gap-2">
              <Smartphone size={24} className="text-indigo-600" />
              Hubungkan ke Handphone Anda
            </h3>
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 bg-white p-3 rounded-2xl shadow-sm border border-indigo-50">
                <QRCode value={shareConfigUrl} size={150} level="M" />
              </div>
              <div>
                <h4 className="font-bold text-indigo-900 mb-2">Sinkronisasi Super Cepat!</h4>
                <p className="text-sm text-indigo-700/80 mb-4 leading-relaxed">
                  Buka aplikasi kamera atau pemindai (scanner) di Handphone Anda, dan scan QR Code di samping untuk membuka aplikasi versi Mobile. Konfigurasi Google Sheets Anda akan otomatis tersinkronisasi.
                </p>
                <div className="flex bg-white border border-indigo-100 rounded-lg overflow-hidden relative">
                  <input type="text" readOnly value={shareConfigUrl} className="w-full text-xs text-slate-500 p-2 outline-none cursor-text" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-white/40">
          <h4 className="font-semibold text-indigo-900 mb-3 text-lg">Panduan Instalasi Script</h4>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2 mb-6 leading-relaxed">
            <li>Buat Google Spreadsheet baru di Google Drive Anda.</li>
            <li>Klik menu <strong>Ekstensi</strong> {'>'} <strong>Apps Script</strong>.</li>
            <li>Hapus semua kode yang ada, copy paste kode di bawah ini <b>(Pastikan menyalin ulang karena ada tambahan izin Drive)</b>.</li>
            <li>Klik tombol <strong>Simpan</strong> (ikon Disket).</li>
            <li className="text-rose-600 font-bold">SANGAT PENTING UNTUK IZIN UPLOAD: Pilih fungsi <code>setup</code> di dropdown bagian atas editor, lalu klik <strong>Jalankan (Run)</strong>.</li>
            <li className="text-rose-600 font-bold">Akan muncul popup "Otorisasi Diperlukan". Klik Tinjau Izin {'>'} Pilih akun Anda {'>'} Klik Lanjutan (Advanced) di bawah {'>'} Klik Buka project (tidak aman) {'>'} Izinkan (Allow).</li>
            <li>Klik tombol biru <strong>Terapkan (Deploy)</strong> {'>'} <strong>Deployment Baru (New deployment)</strong>. <i>(Jika tidak buat deployment baru, izin tidak akan terupdate!)</i></li>
            <li>Pilih Jenis <strong>Aplikasi Web (Web App)</strong>.</li>
            <li>Atur Akses {'>'} Jalankan sebagai: <strong>Saya (Me)</strong>, Siapa yang memiliki akses: <strong>Siapa saja (Anyone)</strong>.</li>
            <li>Klik Terapkan.</li>
            <li>Copy URL Web App dan paste di form konfigurasi di atas.</li>
          </ol>

          <div className="relative">
            <button 
              onClick={handleCopy}
              className="absolute top-2 right-2 p-2 bg-slate-800 text-white rounded hover:bg-slate-700 transition"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-sm overflow-auto h-96">
              <code>{GAS_TEMPLATE}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
