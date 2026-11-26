# OJS Multi-Journal BRIDA Kota Makassar

Portal **Open Journal Systems (OJS) Multi-Journal** terintegrasi untuk Badan Riset dan Inovasi Daerah (BRIDA) Kota Makassar — mengelola 4 jurnal ilmiah (`J-SINTESA`, `JEKOMA`, `J-TEKNIKA`, `J-KESTAS`) secara *end-to-end* mulai dari pengiriman naskah berstandar SINTA/ARJUNA, penelaahan sejawat *multi-reviewer*, penerbitan DOI, hingga ruang diskusi *Trending Topik* bergaya Threads/X.

## Struktur Proyek

```text
ojs-brida/
├── backend-ojs/        # REST API Laravel 9 + MySQL + Cloud Storage (Supabase) + Docker
│   ├── app/
│   │   ├── Http/Controllers/   # SubmissionController, ForumController
│   │   ├── Models/             # Journal, Issue, Submission, Review, User, Forum & Social Models
│   │   └── Services/           # CloudStorageService (Supabase Storage / fallback disk lokal)
│   ├── database/               # Migrations & Seeders (CloudBootstrapSeeder, ForumSeeder)
│   ├── docker/start.sh         # Startup script otomatis untuk Render (migrate + seed aman)
│   ├── Dockerfile              # Image PHP 8.2 + Apache (pdo_mysql, zip, fileinfo, mbstring)
│   └── .env.cloud.example      # Template variabel lingkungan cloud
└── frontend-ojs/       # SPA React 19 + Vite + Tailwind CSS v4
    ├── public/assets/          # Logo resmi BRIDA & aset visual portal
    ├── src/
    │   ├── config.js           # Konfigurasi dinamis VITE_API_BASE & resolveFileUrl()
    │   ├── Login.jsx           # Autentikasi real (Login & Registrasi akun)
    │   ├── Dashboard.jsx       # Portal Publik, Dasbor, Unggah Standar SINTA, Review & Users
    │   └── ForumTrending.jsx   # Trending Topik & Diskusi Jurnal (Like, Komen, Share)
    ├── vercel.json             # Konfigurasi routing SPA untuk Vercel
    └── .env.example            # Template variabel lingkungan frontend
```

## Fitur Utama
- **Multi-Journal Management**: Kelola berbagai jurnal terakreditasi SINTA, edisi (Volume/Nomor), dan penerbitan DOI otomatis.
- **Standarisasi Naskah SINTA / ARJUNA & OJS (Gatekeeper)**: Validasi real-time & server-side untuk jumlah kata judul (5–20 kata), abstrak (150–250 kata, 1 paragraf, bebas sitasi), kata kunci (3–6 unik), checklist OJS, inspeksi struktur IMRAD `.docx`/`.pdf`, serta unduh template `.docx` resmi.
- **Double-Blind Multi-Reviewer**: Penugasan multi-reviewer, **hak Reviewer menerima/menolak undangan review** dengan alasan, dukungan penunjukan Reviewer ke-3 (*Third Opinion*) & *Tie-Breaker* Chief Editor, serta progress tracker real-time di semua role.
- **Trending Topik & Diskusi Jurnal (Ala Threads / X)**: Terbuka untuk pengunjung publik dan semua role — klik topik trending untuk melihat jurnal terbit terkait lengkap dengan interaksi **Like, Komen, dan Share (termasuk Salin Sitasi APA)**.

## Menjalankan di Lokal (XAMPP)
1. **Backend**:
   ```bash
   cd backend-ojs
   php artisan migrate --seed
   php artisan serve --host=0.0.0.0 --port=8000
   ```
2. **Frontend**:
   ```bash
   cd frontend-ojs
   npm install
   npm run dev -- --host 0.0.0.0 --port 5173
   ```

## Deploy ke Cloud (100% Gratis)
- **Database**: Aiven for MySQL (Free Plan)
- **Cloud Storage (PDF/DOCX)**: Supabase Storage (Public bucket `manuscripts`)
- **Backend API**: Render (Docker — Root Directory: `backend-ojs`)
- **Frontend**: Vercel (Vite — Root Directory: `frontend-ojs`, env `VITE_API_BASE`)
