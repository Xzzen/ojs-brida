<?php

namespace Database\Seeders;

use App\Models\ForumLike;
use App\Models\ForumPost;
use App\Models\Journal;
use App\Models\User;
use Illuminate\Database\Seeder;

class ForumSeeder extends Seeder
{
    public function run()
    {
        if (ForumPost::count() > 0) {
            return;
        }

        $admin = User::whereIn('role', ['admin', 'editor'])->first() ?? User::first();
        $reviewer = User::where('role', 'reviewer')->first() ?? $admin;
        $author = User::where('role', 'author')->first() ?? $admin;

        if (!$admin) {
            return;
        }

        $journals = Journal::all()->keyBy('code');
        $jSintesa = $journals->get('sintesa') ?? Journal::first();
        $jEkoma = $journals->get('jekoma') ?? $jSintesa;
        $jTeknika = $journals->get('jteknika') ?? $jSintesa;
        $jKestas = $journals->get('jkestas') ?? $jSintesa;

        $t1 = ForumPost::create([
            'user_id' => $admin->id,
            'journal_id' => $jSintesa?->id,
            'category' => 'tips_publikasi',
            'topic_tag' => '#KlinikSINTA',
            'is_pinned' => true,
            'likes_count' => 3,
            'content' => "Selamat datang di Ruang Diskusi & Trending Topik Riset BRIDA Makassar! 🎯\n\nSebelum mengunggah naskah ke J-SINTESA, JEKOMA, J-TEKNIKA, atau J-KESTAS, pastikan struktur IMRAD sudah lengkap, abstrak 150-250 kata tanpa sitasi, dan judul 5-20 kata. Ada kendala saat menyiapkan naskah? Yuk diskusikan langsung di utas ini! #KlinikSINTA #PublikasiBRIDA",
            'created_at' => now()->subHours(18),
        ]);

        ForumPost::create([
            'user_id' => $reviewer->id,
            'parent_id' => $t1->id,
            'journal_id' => $jSintesa?->id,
            'category' => 'tips_publikasi',
            'topic_tag' => '#KlinikSINTA',
            'likes_count' => 2,
            'content' => "Tips dari sudut pandang Mitra Bestari: paling sering naskah kena revisi mayor karena bagian Pembahasan hanya mengulang angka tabel tanpa membandingkan dengan temuan riset terdahulu. Fokus perkuat gap penelitian ya! 💡 #KlinikSINTA",
            'created_at' => now()->subHours(14),
        ]);

        $t2 = ForumPost::create([
            'user_id' => $author->id,
            'journal_id' => $jSintesa?->id,
            'category' => 'permasalahan',
            'topic_tag' => '#SmartCityMakassar',
            'likes_count' => 5,
            'content' => "Menurut rekan peneliti di sini, kenapa banyak aplikasi layanan publik daerah di Makassar masih berjalan sendiri-sendiri (silo data)? Apakah kendalanya lebih besar di integrasi API lintas OPD atau di regulasi tata kelola datanya? Cocok banget nih jadi bahan riset kebijakan untuk #SmartCityMakassar #TataKelolaDigital",
            'created_at' => now()->subHours(9),
        ]);

        ForumPost::create([
            'user_id' => $reviewer->id,
            'parent_id' => $t2->id,
            'journal_id' => $jSintesa?->id,
            'category' => 'permasalahan',
            'topic_tag' => '#SmartCityMakassar',
            'likes_count' => 2,
            'content' => "Menarik! Dari beberapa riset evaluasi SPBE yang saya telaah, 60% hambatannya justru di standar interoperabilitas & ketiadaan wali data bersama, bukan sekadar teknis coding. Kalau dibahas dengan studi kasus 3-5 OPD di Makassar bakal sangat kuat!",
            'created_at' => now()->subHours(7),
        ]);

        ForumPost::create([
            'user_id' => $admin->id,
            'parent_id' => $t2->id,
            'journal_id' => $jSintesa?->id,
            'category' => 'permasalahan',
            'topic_tag' => '#SmartCityMakassar',
            'likes_count' => 1,
            'content' => "Topik ini sangat relevan untuk edisi mendatang J-SINTESA. Silakan kirimkan kajian berbasis data lapangan agar bisa langsung menjadi policy brief bagi Pemkot Makassar!",
            'created_at' => now()->subHours(5),
        ]);

        $t3 = ForumPost::create([
            'user_id' => $reviewer->id,
            'journal_id' => $jTeknika?->id,
            'category' => 'permasalahan',
            'topic_tag' => '#BanjirDanDrainase',
            'likes_count' => 4,
            'content' => "Musim hujan mulai intens di kawasan timur Makassar & sekitar Antang. Apakah ada peneliti teknik sipil atau IoT yang sedang menguji sensor pemantau tinggi muka air drainase real-time berbasis LoRaWAN? Mari berbagi metodologi kalibrasi sensornya! #BanjirDanDrainase #SmartCityMakassar",
            'created_at' => now()->subHours(6),
        ]);

        $t4 = ForumPost::create([
            'user_id' => $author->id,
            'journal_id' => $jEkoma?->id,
            'category' => 'trending_jurnal',
            'topic_tag' => '#UMKMDigital',
            'likes_count' => 4,
            'content' => "Tren riset ekonomi lokal 2026: adopsi QRIS dan live-commerce di kalangan pelaku UMKM kuliner pesisir Makassar naik drastis, tapi literasi pencatatan arus kasnya masih tertinggal. Ada yang tertarik kolaborasi riset survei lapangan untuk submit ke JEKOMA? #UMKMDigital #EkonomiKreatif",
            'created_at' => now()->subHours(4),
        ]);

        ForumPost::create([
            'user_id' => $admin->id,
            'parent_id' => $t4->id,
            'journal_id' => $jEkoma?->id,
            'category' => 'trending_jurnal',
            'topic_tag' => '#UMKMDigital',
            'likes_count' => 1,
            'content' => "Riset UMKM digital dengan sampel minimal 100 pelaku usaha biasanya sangat diminati pembaca JEKOMA. Semangat kolaborasinya!",
            'created_at' => now()->subHours(2),
        ]);

        $t5 = ForumPost::create([
            'user_id' => $reviewer->id,
            'journal_id' => $jKestas?->id,
            'category' => 'kolaborasi',
            'topic_tag' => '#KesehatanPesisir',
            'likes_count' => 3,
            'content' => "Membuka diskusi & kolaborasi riset multidisiplin terkait sanitasi air bersih dan pencegahan stunting di wilayah kepulauan Sangkarang Makassar. Bagi rekan akademisi kesehatan masyarakat atau lingkungan yang punya data primer, silakan balas utas ini! #KesehatanPesisir #KolaborasiRiset",
            'created_at' => now()->subHours(2),
        ]);

        // Seed real ForumLike rows so counts match database state
        $seedUsers = User::limit(5)->pluck('id')->all();
        foreach ([$t1, $t2, $t3, $t4, $t5] as $idx => $post) {
            $pick = array_slice($seedUsers, 0, min(count($seedUsers), 1 + ($idx % 3)));
            foreach ($pick as $uid) {
                ForumLike::firstOrCreate(['post_id' => $post->id, 'user_id' => $uid]);
            }
            $post->likes_count = ForumLike::where('post_id', $post->id)->count();
            $post->save();
        }
    }
}
