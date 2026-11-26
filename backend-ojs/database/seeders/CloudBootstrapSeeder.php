<?php

namespace Database\Seeders;

use App\Models\ForumPost;
use App\Models\Journal;
use Illuminate\Database\Seeder;

class CloudBootstrapSeeder extends Seeder
{
    /**
     * Seeder aman (idempotent) untuk inisialisasi awal di Cloud.
     * Hanya berjalan jika tabel utama masih kosong sehingga data pengguna tidak pernah tertimpa saat redeploy.
     */
    public function run()
    {
        if (Journal::count() === 0) {
            $this->call(DatabaseSeeder::class);
        }

        if (ForumPost::count() === 0) {
            $this->call(ForumSeeder::class);
        }
    }
}
