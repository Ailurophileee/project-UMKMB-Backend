# 🚀 Capstone Project - Backend UMKM API

Repositori ini merupakan pusat logika *Back-End* (Server & Database) untuk aplikasi Manajemen Keuangan UMKM, dibangun menggunakan **Node.js** dan **Express.js** dengan arsitektur modern (*Production-Ready*).

---

## 🛠️ Alur Perjalanan Request (Arsitektur Folder)

Agar pengerjaan fitur (*Full-Stack*) antar halaman berjalan rapi tanpa bentrok, kita menggunakan pendekatan **Separation of Concerns** (pemisahan tanggung jawab). Berikut adalah peta alur bagaimana sebuah *request* dari React diproses hingga menghasilkan data:

```text
[ React Client ] 
       │
       ▼
 1. src/server.js               --> Entry point, menyalakan port server (listen)
       │
       ▼
 2. src/server/server-bersama.js --> Konfigurasi Express, pasang CORS & middleware global
       │
       ▼
 3. src/routes/route-bersama.js  --> Gerbang utama routing (menampung semua jalur URL besar)
       │
       ▼
 4. src/middlewares/auth.js      --> [Satpam] Mengecek validasi token JWT di Header
       │   └─► Memanggil `src/security/token-manager.js` (Untuk verifikasi token)
       │   └─► Jika gagal, melempar error ke `src/exceptions/auth-error.js`
       │
       ▼
 5. src/services/product/        --> [Pusat Fitur] (Salsa/Salamah ngoding di sini per halaman)
       ├── routes.js             --> Menerima request aman, mengarah ke Controller
       ├── validator.js          --> Memvalidasi format input user agar aman
       ├── controller.js         --> Otak fitur, mengatur logika bisnis halaman
       └── repositories.js       --> Kurir Database, satu-satunya yang menyentuh MySQL
       │
       ▼
 6. src/utils/response.js        --> Pembungkus bungkusan akhir standar API ({ code, status, message, data })
