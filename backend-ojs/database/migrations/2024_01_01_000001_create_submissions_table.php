<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('journals', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('title');
            $table->string('abbreviation');
            $table->string('issn_print')->nullable();
            $table->string('issn_online')->nullable();
            $table->text('description');
            $table->text('focus_scope')->nullable();
            $table->string('publisher')->default('BRIDA Kota Makassar');
            $table->string('chief_editor')->nullable();
            $table->string('frequency')->default('2 Kali Setahun (Juni & Desember)');
            $table->string('accreditation')->default('SINTA 3');
            $table->string('accent_color')->default('red');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_id')->constrained('journals')->onDelete('cascade');
            $table->string('volume');
            $table->string('number');
            $table->integer('year');
            $table->string('title');
            $table->boolean('is_current')->default(true);
            $table->date('published_at')->nullable();
            $table->timestamps();
        });

        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('journal_id')->constrained('journals')->onDelete('cascade');
            $table->foreignId('issue_id')->nullable()->constrained('issues')->onDelete('set null');
            $table->foreignId('author_id')->constrained('users')->onDelete('cascade');
            $table->string('co_authors')->nullable();
            $table->string('title');
            $table->text('abstract');
            $table->string('keywords')->nullable();
            $table->string('section')->default('Original Research');
            $table->string('file_path');
            $table->enum('status', ['pending', 'under_review', 'revision_required', 'accepted', 'published', 'rejected'])->default('pending');
            $table->string('doi')->nullable();
            $table->string('pages')->nullable();
            $table->integer('views_count')->default(0);
            $table->integer('downloads_count')->default(0);
            $table->text('editor_notes')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('submissions');
        Schema::dropIfExists('issues');
        Schema::dropIfExists('journals');
    }
};
