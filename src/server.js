import server from './server/server-bersama.js';
import 'dotenv/config';
 
//const port = process.env.PORT;
//const host = process.env.HOST;
 
//server.listen(port, () => {
//  console.log(`Server running at http://${host}:${port}`);
//});

// ✅ JALUR AMAN: Biarkan Render menentukan portnya secara otomatis di awan, 
// atau gunakan fallback ke port 5000 jika dijalankan di komputer lokal kamu.
const port = process.env.PORT || 5000;

// ✅ Hapus atau jangan pasang host di dalam server.listen agar Express otomatis
// melakukan binding ke jaringan publik kontainer Render (0.0.0.0)
server.listen(port, () => {
  console.log(`🚀 Server backend UMKM berhasil berjalan di port: ${port}`);
});