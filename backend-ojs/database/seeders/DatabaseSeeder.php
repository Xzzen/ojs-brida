<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Journal;
use App\Models\Issue;
use App\Models\Submission;
use App\Models\Review;
use Illuminate\Support\Facades\Storage;

class DatabaseSeeder extends Seeder
{
    /**
     * Membuat file PDF asli yang valid sehingga bisa langsung dibuka di browser
     */
    private function createSamplePdf(string $filename, string $journalName, string $title, string $authors, string $doi, string $abstract): string
    {
        $clean = function ($str) {
            $str = preg_replace('/[^\x20-\x7E]/', ' ', $str);
            return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $str);
        };

        $lines = [];
        $lines[] = "PORTAL E-JOURNAL OJS BRIDA KOTA MAKASSAR";
        $lines[] = strtoupper($clean($journalName));
        $lines[] = "DOI: " . ($doi ?: "10.31290/brida.preprint.2026");
        $lines[] = "--------------------------------------------------------------------------------";
        $lines[] = "";
        $lines[] = "JUDUL ARTIKEL ILMIAH:";

        foreach (explode("\n", wordwrap($clean($title), 72, "\n")) as $l) {
            $lines[] = $l;
        }
        $lines[] = "";
        $lines[] = "PENULIS: " . $clean($authors);
        $lines[] = "INSTITUSI: Badan Riset dan Inovasi Daerah (BRIDA) & Universitas Hasanuddin";
        $lines[] = "--------------------------------------------------------------------------------";
        $lines[] = "";
        $lines[] = "ABSTRAK:";

        foreach (explode("\n", wordwrap($clean($abstract), 78, "\n")) as $l) {
            $lines[] = $l;
        }
        $lines[] = "";
        $lines[] = "--------------------------------------------------------------------------------";
        $lines[] = "1. PENDAHULUAN";
        $lines[] = "Dokumen ini merupakan naskah resmi yang tersimpan pada repositori terisolasi";
        $lines[] = "Sistem Inovasi OJS Multi-Journal BRIDA Kota Makassar. Seluruh berkas telah";
        $lines[] = "melalui pemindaian MIME-type dan validasi arsitektur defensif berbasis Laravel.";
        $lines[] = "";
        $lines[] = "2. METODOLOGI & IMPLEMENTASI";
        $lines[] = "Penelitian ini menggunakan pendekatan kualitatif dan kuantitatif terukur";
        $lines[] = "sesuai standar pedoman publikasi ilmiah Tridharma Perguruan Tinggi.";

        $streamLines = "BT\n/F1 10 Tf\n50 780 Td\n14 TL\n";
        foreach ($lines as $idx => $line) {
            if ($idx === 0) {
                $streamLines .= "(" . $line . ") Tj\n";
            } else {
                $streamLines .= "T* (" . $line . ") Tj\n";
            }
        }
        $streamLines .= "ET";

        $len = strlen($streamLines);

        $objects = [];
        $objects[1] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
        $objects[2] = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
        $objects[3] = "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n";
        $objects[4] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
        $objects[5] = "5 0 obj\n<< /Length $len >>\nstream\n$streamLines\nendstream\nendobj\n";

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $num => $obj) {
            $offsets[$num] = strlen($pdf);
            $pdf .= $obj;
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 6\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= 5; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }
        $pdf .= "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n$xrefOffset\n%%EOF";

        Storage::disk('public')->put('submissions/' . $filename, $pdf);
        return 'submissions/' . $filename;
    }

    public function run()
    {
        // 1. Seed Users (Multi-Role)
        $admin = User::create([
            'name' => 'Dr. Ir. H. Andi Syahrul, M.Si.',
            'email' => 'admin@brida.go.id',
            'role' => 'admin',
            'affiliation' => 'BRIDA Kota Makassar (Kepala Dewan Redaksi)',
            'orcid_id' => '0000-0001-8821-9012',
            'specialty' => 'Manajemen Inovasi & Kebijakan Publik',
            'password' => bcrypt('password'),
        ]);

        $editor = User::create([
            'name' => 'Muh Fadhil Alrifa Saputra, S.Kom.',
            'email' => 'editor@brida.go.id',
            'role' => 'editor',
            'affiliation' => 'Universitas Hasanuddin / Pengelola Jurnal BRIDA',
            'orcid_id' => '0000-0002-3310-1106',
            'specialty' => 'Arsitektur Perangkat Lunak & Keamanan Sistem',
            'password' => bcrypt('password'),
        ]);

        $rev1 = User::create([
            'name' => 'Prof. Dr. Eng. Azwan Alghifari, M.T.',
            'email' => 'reviewer@brida.go.id',
            'role' => 'reviewer',
            'affiliation' => 'Departemen Teknik Informatika UNHAS',
            'orcid_id' => '0000-0003-1094-4411',
            'specialty' => 'Cloud Computing, Keamanan Siber & Basis Data',
            'password' => bcrypt('password'),
        ]);

        $rev2 = User::create([
            'name' => 'Dr. Baso Rafiansyah, S.Sos., M.A.P.',
            'email' => 'baso.reviewer@unhas.ac.id',
            'role' => 'reviewer',
            'affiliation' => 'Fakultas Ilmu Sosial & Ilmu Politik UNHAS',
            'orcid_id' => '0000-0002-1068-7789',
            'specialty' => 'Smart Governance, Ekonomi Kreatif & Kebijakan Daerah',
            'password' => bcrypt('password'),
        ]);

        $rev3 = User::create([
            'name' => 'Dr. dr. Siti Nurhaliza, M.Kes.',
            'email' => 'siti.reviewer@unhas.ac.id',
            'role' => 'reviewer',
            'affiliation' => 'Fakultas Kesehatan Masyarakat UNHAS',
            'orcid_id' => '0000-0004-5521-9980',
            'specialty' => 'Kesehatan Lingkungan Perkotaan & Epidemiologi',
            'password' => bcrypt('password'),
        ]);

        $author1 = User::create([
            'name' => 'Balanza Aryandi Datu Hari Putra',
            'email' => 'author@brida.com',
            'role' => 'author',
            'affiliation' => 'Departemen Teknik Informatika Universitas Hasanuddin',
            'orcid_id' => '0000-0002-1088-5543',
            'specialty' => 'Rekayasa Perangkat Lunak & Cloud Computing',
            'password' => bcrypt('password'),
        ]);

        $author2 = User::create([
            'name' => 'Ir. Rina Kartika, M.P.W.K.',
            'email' => 'rina@bappeda.makassar.go.id',
            'role' => 'author',
            'affiliation' => 'Bappeda Kota Makassar',
            'orcid_id' => '0000-0003-9910-2214',
            'specialty' => 'Perencanaan Wilayah dan Kota',
            'password' => bcrypt('password'),
        ]);

        // 2. Seed Multi-Journals (4 Jurnal Resmi di bawah Portal OJS BRIDA)
        $jSintesa = Journal::create([
            'code' => 'sintesa',
            'title' => 'Jurnal Inovasi dan Riset Daerah (J-SINTESA)',
            'abbreviation' => 'J-SINTESA',
            'issn_print' => '2798-112X',
            'issn_online' => '2798-1138',
            'description' => 'Jurnal utama Badan Riset dan Inovasi Daerah (BRIDA) Kota Makassar yang mempublikasikan hasil penelitian strategis, kajian kebijakan berbasis bukti (evidence-based policy), serta inovasi tata kelola layanan publik daerah.',
            'focus_scope' => 'Inovasi Daerah, Kebijakan Publik, Reformasi Birokrasi, Tata Kelola Pemerintahan Daerah, Evaluasi Pembangunan.',
            'publisher' => 'BRIDA Kota Makassar',
            'chief_editor' => 'Dr. Ir. H. Andi Syahrul, M.Si.',
            'frequency' => '2 Kali Setahun (Juni & Desember)',
            'accreditation' => 'SINTA 2',
            'accent_color' => 'red',
            'is_active' => true,
        ]);

        $jSmartCity = Journal::create([
            'code' => 'smartcity',
            'title' => 'Makassar Journal of Smart City & Digital Security (MJSC)',
            'abbreviation' => 'MJSC',
            'issn_print' => '2801-4412',
            'issn_online' => '2801-4420',
            'description' => 'Jurnal ilmiah teknologi informasi dan rekayasa perangkat lunak yang berfokus pada pengembangan infrastruktur Smart City, keamanan siber aplikasi E-Government, Cloud Computing, dan kecerdasan buatan.',
            'focus_scope' => 'Smart City, Arsitektur Perangkat Lunak, Keamanan Siber (Cyber Security), Cloud Computing, Internet of Things (IoT), Data Science.',
            'publisher' => 'BRIDA Kota Makassar & UNHAS',
            'chief_editor' => 'Prof. Dr. Eng. Azwan Alghifari, M.T.',
            'frequency' => '3 Kali Setahun (April, Agustus, Desember)',
            'accreditation' => 'SINTA 2',
            'accent_color' => 'blue',
            'is_active' => true,
        ]);

        $jMaritim = Journal::create([
            'code' => 'maritim',
            'title' => 'Jurnal Ekonomi Kreatif, Maritim & Sosial Humaniora (JEKMS)',
            'abbreviation' => 'JEKMS',
            'issn_print' => '2810-8819',
            'issn_online' => '2810-8827',
            'description' => 'Wadah publikasi riset terapan bidang ekonomi biru (blue economy), pemberdayaan UMKM Lorong Wisata, pariwisata bahari, serta dinamika sosial budaya masyarakat pesisir dan perkotaan Makassar.',
            'focus_scope' => 'Ekonomi Kreatif, Ekonomi Maritim, UMKM & Koperasi, Pariwisata Berkelanjutan, Sosiologi Perkotaan.',
            'publisher' => 'BRIDA Kota Makassar',
            'chief_editor' => 'Dr. Baso Rafiansyah, S.Sos., M.A.P.',
            'frequency' => '2 Kali Setahun (Mei & November)',
            'accreditation' => 'SINTA 3',
            'accent_color' => 'emerald',
            'is_active' => true,
        ]);

        $jKesehatan = Journal::create([
            'code' => 'kesehatan',
            'title' => 'Journal of Urban Health & Climate Resilience (JUHCR)',
            'abbreviation' => 'JUHCR',
            'issn_print' => '2822-3011',
            'issn_online' => '2822-302X',
            'description' => 'Memuat artikel penelitian ilmiah terkait kesehatan masyarakat perkotaan, pengelolaan sanitasi dan bank sampah, mitigasi bencana iklim pesisir, serta ketahanan pangan dan gizi keluarga.',
            'focus_scope' => 'Kesehatan Masyarakat Kota, Epidemiologi, Sanitasi & Lingkungan, Mitigasi Iklim, Ketahanan Pangan.',
            'publisher' => 'BRIDA Kota Makassar',
            'chief_editor' => 'Dr. dr. Siti Nurhaliza, M.Kes.',
            'frequency' => '2 Kali Setahun (Maret & September)',
            'accreditation' => 'SINTA 3',
            'accent_color' => 'amber',
            'is_active' => true,
        ]);

        // 3. Seed Issues (Terbitan Volume & Nomor per Jurnal)
        $issueSintesaCurr = Issue::create([
            'journal_id' => $jSintesa->id,
            'volume' => 'Vol. 4',
            'number' => 'No. 2',
            'year' => 2026,
            'title' => 'Transformasi Kebijakan Inovasi Daerah Berbasis Bukti',
            'is_current' => true,
            'published_at' => '2026-10-01',
        ]);
        $issueSintesaPrev = Issue::create([
            'journal_id' => $jSintesa->id,
            'volume' => 'Vol. 4',
            'number' => 'No. 1',
            'year' => 2026,
            'title' => 'Akselerasi Layanan Publik Terpadu Kota Makassar',
            'is_current' => false,
            'published_at' => '2026-06-01',
        ]);

        $issueSmartCurr = Issue::create([
            'journal_id' => $jSmartCity->id,
            'volume' => 'Vol. 3',
            'number' => 'No. 2',
            'year' => 2026,
            'title' => 'Keamanan Siber E-Government dan Infrastruktur Cloud Daerah',
            'is_current' => true,
            'published_at' => '2026-08-15',
        ]);

        $issueMaritimCurr = Issue::create([
            'journal_id' => $jMaritim->id,
            'volume' => 'Vol. 2',
            'number' => 'No. 2',
            'year' => 2026,
            'title' => 'Digitalisasi UMKM Pesisir dan Penguatan Ekonomi Lorong Wisata',
            'is_current' => true,
            'published_at' => '2026-09-20',
        ]);

        $issueKesehatanCurr = Issue::create([
            'journal_id' => $jKesehatan->id,
            'volume' => 'Vol. 2',
            'number' => 'No. 1',
            'year' => 2026,
            'title' => 'Mitigasi Iklim Pesisir dan Sanitasi Lingkungan Perkotaan',
            'is_current' => true,
            'published_at' => '2026-09-01',
        ]);

        // 4. Seed Submissions (Published, Accepted, Under Review, Revision, Pending)
        $sub1Title = 'Isolasi Kerentanan dan Restrukturisasi OJS BRIDA: Implementasi Arsitektur Defensif Berbasis Laravel dan React SPA';
        $sub1Abs = 'Platform publikasi jurnal ilmiah merupakan infrastruktur krusial bagi instansi riset. Penelitian ini merancang ulang arsitektur Open Journal Systems (OJS) menggunakan pendekatan Decoupled Architecture berbasis Laravel 9 REST API dan React.js untuk mengisolasi kerentanan source code, memblokir injeksi spam iklan otomatis melalui sanitasi berlapis, serta mengoptimalkan kecepatan akses antarmuka pengguna.';
        $sub1File = $this->createSamplePdf('artikel-arsitektur-defensif-ojs.pdf', $jSmartCity->title, $sub1Title, 'Balanza Aryandi, Muh Fadhil Alrifa, Azwan Alghifari, Baso Rafiansyah', '10.31290/mjsc.v3i2.101', $sub1Abs);
        $sub1 = Submission::create([
            'journal_id' => $jSmartCity->id,
            'issue_id' => $issueSmartCurr->id,
            'author_id' => $author1->id,
            'co_authors' => 'Muh Fadhil Alrifa Saputra, Azwan Alghifari, Baso Rafiansyah',
            'title' => $sub1Title,
            'abstract' => $sub1Abs,
            'keywords' => 'OJS, Laravel, React SPA, Arsitektur Defensif, Cloud Security',
            'section' => 'Original Research',
            'file_path' => $sub1File,
            'status' => 'published',
            'doi' => '10.31290/mjsc.v3i2.101',
            'pages' => '1-14',
            'views_count' => 428,
            'downloads_count' => 195,
            'editor_notes' => 'Naskah sangat relevan dengan standar keamanan E-Government Kota Makassar. Disetujui untuk diterbitkan pada Vol. 3 No. 2.',
            'published_at' => now()->subDays(12),
        ]);

        $sub2Title = 'Evaluasi Dampak Program Lorong Wisata (Longwis) terhadap Peningkatan Pendapatan UMKM Kuliner di Kecamatan Ujung Pandang';
        $sub2Abs = 'Program Lorong Wisata merupakan inovasi strategis Pemerintah Kota Makassar dalam membangkitkan ekonomi kerakyatan berbasis komunitas. Studi ini menganalisis pertumbuhan omzet 120 pelaku UMKM sebelum dan sesudah digitalisasi pembayaran QRIS serta penataan kawasan lorong wisata.';
        $sub2File = $this->createSamplePdf('evaluasi-ekonomi-lorong-wisata.pdf', $jMaritim->title, $sub2Title, 'Ir. Rina Kartika, Dr. Baso Rafiansyah', '10.31290/jekms.v2i2.204', $sub2Abs);
        $sub2 = Submission::create([
            'journal_id' => $jMaritim->id,
            'issue_id' => $issueMaritimCurr->id,
            'author_id' => $author2->id,
            'co_authors' => 'Dr. Baso Rafiansyah, S.Sos., M.A.P.',
            'title' => $sub2Title,
            'abstract' => $sub2Abs,
            'keywords' => 'Lorong Wisata, UMKM, Ekonomi Kreatif, QRIS, Pemberdayaan',
            'section' => 'Original Research',
            'file_path' => $sub2File,
            'status' => 'published',
            'doi' => '10.31290/jekms.v2i2.204',
            'pages' => '15-28',
            'views_count' => 312,
            'downloads_count' => 144,
            'published_at' => now()->subDays(20),
        ]);

        $sub3Title = 'Indeks Inovasi Daerah Kota Makassar: Analisis Faktor Penentu Keberlanjutan Inovasi Perangkat Daerah (SKPD)';
        $sub3Abs = 'Penelitian ini mengkaji tingkat kematangan inovasi perangkat daerah di lingkup Pemerintah Kota Makassar berdasarkan 20 indikator Indeks Inovasi Daerah (IID) Kementerian Dalam Negeri. Hasil penelitian merekomendasikan penguatan regulasi dan integrasi basis data riset terpusat di BRIDA.';
        $sub3File = $this->createSamplePdf('indeks-inovasi-daerah-makassar.pdf', $jSintesa->title, $sub3Title, 'Dr. Ir. H. Andi Syahrul, Ir. Rina Kartika', '10.31290/sintesa.v4i2.301', $sub3Abs);
        $sub3 = Submission::create([
            'journal_id' => $jSintesa->id,
            'issue_id' => $issueSintesaCurr->id,
            'author_id' => $author2->id,
            'co_authors' => 'Dr. Ir. H. Andi Syahrul, M.Si.',
            'title' => $sub3Title,
            'abstract' => $sub3Abs,
            'keywords' => 'Indeks Inovasi Daerah, BRIDA, Tata Kelola, SKPD, Kebijakan Publik',
            'section' => 'Policy Brief',
            'file_path' => $sub3File,
            'status' => 'published',
            'doi' => '10.31290/sintesa.v4i2.301',
            'pages' => '1-12',
            'views_count' => 519,
            'downloads_count' => 267,
            'published_at' => now()->subDays(25),
        ]);

        $sub4Title = 'Pemodelan Spasial Kerentanan Banjir Rob dan Strategi Adaptasi Masyarakat Pesisir Kecamatan Tallo';
        $sub4Abs = 'Perubahan iklim memicu kenaikan muka air laut yang berdampak pada kawasan pemukiman pesisir utara Kota Makassar. Riset ini menggabungkan citra satelit resolusi tinggi dan pemodelan GIS untuk memetakan zona risiko banjir rob serta merumuskan rekayasa ekologis berbasis sabuk hijau mangrove.';
        $sub4File = $this->createSamplePdf('pemodelan-spasial-banjir-rob-tallo.pdf', $jKesehatan->title, $sub4Title, 'Dr. dr. Siti Nurhaliza, Ir. Rina Kartika', '10.31290/juhcr.v2i1.401', $sub4Abs);
        $sub4 = Submission::create([
            'journal_id' => $jKesehatan->id,
            'issue_id' => $issueKesehatanCurr->id,
            'author_id' => $author2->id,
            'co_authors' => 'Dr. dr. Siti Nurhaliza, M.Kes.',
            'title' => $sub4Title,
            'abstract' => $sub4Abs,
            'keywords' => 'Banjir Rob, GIS, Adaptasi Iklim, Pesisir Tallo, Mangrove',
            'section' => 'Original Research',
            'file_path' => $sub4File,
            'status' => 'published',
            'doi' => '10.31290/juhcr.v2i1.401',
            'pages' => '1-16',
            'views_count' => 276,
            'downloads_count' => 118,
            'published_at' => now()->subDays(18),
        ]);

        $sub5Title = 'Optimalisasi Penyimpanan Dokumen Akademik Terdistribusi Menggunakan Amazon S3 dan VPC Private Subnet';
        $sub5Abs = 'Kebocoran basis data jurnal sering terjadi akibat penyimpanan berkas yang bercampur dengan server aplikasi publik. Studi ini mengimplementasikan pemisahan objek dokumen ilmiah ke dalam bucket terenkripsi dengan akses presigned URL dan isolasi jaringan tertutup.';
        $sub5File = $this->createSamplePdf('optimalisasi-aws-s3-vpc-jurnal.pdf', $jSmartCity->title, $sub5Title, 'Balanza Aryandi, Azwan Alghifari', '10.31290/mjsc.v3i2.108', $sub5Abs);
        $sub5 = Submission::create([
            'journal_id' => $jSmartCity->id,
            'issue_id' => $issueSmartCurr->id,
            'author_id' => $author1->id,
            'co_authors' => 'Azwan Alghifari, Muh Fadhil Alrifa',
            'title' => $sub5Title,
            'abstract' => $sub5Abs,
            'keywords' => 'AWS S3, Cloud Storage, VPC Private Subnet, Keamanan Data',
            'section' => 'Original Research',
            'file_path' => $sub5File,
            'status' => 'accepted',
            'doi' => '10.31290/mjsc.v3i2.108',
            'pages' => '29-40',
            'views_count' => 95,
            'downloads_count' => 42,
            'editor_notes' => 'Telah lolos peer-review dengan nilai sangat baik. Menunggu proses final layouting terbitan.',
        ]);

        $sub6Title = 'Penerapan Algoritma Rate-Limiting dan Sanitasi Payload untuk Mitigasi Serangan Bot Spam pada Portal E-Journal';
        $sub6Abs = 'Serangan injeksi spam iklan judi online menjadi ancaman serius bagi kredibilitas portal OJS perguruan tinggi dan lembaga pemerintah. Penelitian ini menguji efektivitas middleware throttling adaptif dan inspeksi ekstensi berkas ketat pada arsitektur RESTful API.';
        $sub6File = $this->createSamplePdf('mitigasi-bot-spam-ojs.pdf', $jSintesa->title, $sub6Title, 'Muh Fadhil Alrifa Saputra, Balanza Aryandi', '', $sub6Abs);
        $sub6 = Submission::create([
            'journal_id' => $jSintesa->id,
            'issue_id' => null,
            'author_id' => $author1->id,
            'co_authors' => 'Muh Fadhil Alrifa Saputra',
            'title' => $sub6Title,
            'abstract' => $sub6Abs,
            'keywords' => 'Rate Limiting, Anti-Spam, Middleware Laravel, Keamanan OJS',
            'section' => 'Original Research',
            'file_path' => $sub6File,
            'status' => 'under_review',
            'views_count' => 42,
            'downloads_count' => 19,
            'editor_notes' => 'Ditugaskan kepada Reviewer bidang Keamanan Siber untuk evaluasi metodologi pengujian.',
        ]);

        $sub7Title = 'Analisis Efektivitas Bank Sampah Unit (BSU) Digital dalam Mereduksi Timbulan Sampah Plastik Rumah Tangga di Kota Makassar';
        $sub7Abs = 'Transformasi pengelolaan Bank Sampah melalui aplikasi pencatatan tabungan sampah digital mendorong partisipasi warga kota. Studi ini mengevaluasi reduksi tonase sampah plastik di 5 kecamatan percontohan selama periode 2025-2026.';
        $sub7File = $this->createSamplePdf('analisis-bank-sampah-digital.pdf', $jKesehatan->title, $sub7Title, 'Ir. Rina Kartika, M.P.W.K.', '', $sub7Abs);
        $sub7 = Submission::create([
            'journal_id' => $jKesehatan->id,
            'issue_id' => null,
            'author_id' => $author2->id,
            'co_authors' => 'Tim Peneliti Lingkungan BRIDA',
            'title' => $sub7Title,
            'abstract' => $sub7Abs,
            'keywords' => 'Bank Sampah Digital, Ekonomi Sirkular, Sampah Plastik, Lingkungan Kota',
            'section' => 'Original Research',
            'file_path' => $sub7File,
            'status' => 'revision_required',
            'views_count' => 31,
            'downloads_count' => 14,
            'editor_notes' => 'Mohon lengkapi tabel perbandingan tonase sampah per kuartal sesuai catatan Reviewer.',
        ]);

        $sub8Title = 'Rancang Bangun Sistem Pemantauan Kualitas Udara Berbasis IoT LoRaWAN pada Koridor Jalan Protokol Kota Makassar';
        $sub8Abs = 'Peningkatan volume kendaraan bermotor berdampak pada konsentrasi partikulat PM2.5. Penelitian ini merancang jaringan sensor nirkabel jarak jauh berbasis LoRaWAN yang terintegrasi dengan dasbor analitik real-time.';
        $sub8File = $this->createSamplePdf('pemantauan-udara-iot-lorawan.pdf', $jSmartCity->title, $sub8Title, 'Balanza Aryandi Datu Hari Putra', '', $sub8Abs);
        $sub8 = Submission::create([
            'journal_id' => $jSmartCity->id,
            'issue_id' => null,
            'author_id' => $author1->id,
            'co_authors' => 'Baso Rafiansyah, Azwan Alghifari',
            'title' => $sub8Title,
            'abstract' => $sub8Abs,
            'keywords' => 'IoT, LoRaWAN, Smart Environment, Kualitas Udara, PM2.5',
            'section' => 'Original Research',
            'file_path' => $sub8File,
            'status' => 'pending',
            'views_count' => 18,
            'downloads_count' => 6,
        ]);

        // 5. Seed Reviews
        Review::create([
            'submission_id' => $sub1->id,
            'reviewer_id' => $rev1->id,
            'score_originality' => 92,
            'score_methodology' => 90,
            'score_relevance' => 95,
            'status' => 'completed',
            'comments' => 'Arsitektur decoupled yang diusulkan sangat tepat untuk mengatasi masalah injeksi script pada OJS lawas. Pengujian endpoint dan skema database sudah sangat komprehensif. Sangat layak diterbitkan.',
            'decision' => 'accept',
        ]);

        Review::create([
            'submission_id' => $sub5->id,
            'reviewer_id' => $rev1->id,
            'score_originality' => 88,
            'score_methodology' => 86,
            'score_relevance' => 90,
            'status' => 'completed',
            'comments' => 'Topik isolasi penyimpanan AWS S3 sangat aplikatif. Penjelasan alur presigned URL sudah jelas dan terukur.',
            'decision' => 'accept',
        ]);

        Review::create([
            'submission_id' => $sub6->id,
            'reviewer_id' => $rev1->id,
            'score_originality' => null,
            'score_methodology' => null,
            'score_relevance' => null,
            'status' => 'in_progress',
            'comments' => null,
            'decision' => null,
        ]);

        Review::create([
            'submission_id' => $sub7->id,
            'reviewer_id' => $rev3->id,
            'score_originality' => 80,
            'score_methodology' => 74,
            'score_relevance' => 88,
            'status' => 'completed',
            'comments' => 'Topik sangat menarik, namun penulis perlu menambahkan data statistik uji signifikansi pada tabel reduksi sampah di halaman 6 sebelum dapat diterima.',
            'decision' => 'revise',
        ]);
    }
}
