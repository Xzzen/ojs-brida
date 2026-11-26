<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        DB::statement("ALTER TABLE reviews MODIFY COLUMN status ENUM('assigned', 'in_progress', 'completed', 'declined') NOT NULL DEFAULT 'assigned'");
    }

    public function down()
    {
        DB::statement("UPDATE reviews SET status = 'in_progress' WHERE status = 'declined'");
        DB::statement("ALTER TABLE reviews MODIFY COLUMN status ENUM('assigned', 'in_progress', 'completed') NOT NULL DEFAULT 'assigned'");
    }
};
