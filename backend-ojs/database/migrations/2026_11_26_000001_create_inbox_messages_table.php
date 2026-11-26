<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasTable('inbox_messages')) {
            Schema::create('inbox_messages', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sender_id')->nullable()->constrained('users')->onDelete('set null');
                $table->foreignId('recipient_id')->constrained('users')->onDelete('cascade');
                $table->foreignId('submission_id')->nullable()->constrained('submissions')->onDelete('set null');
                $table->string('category', 40)->default('direct'); // invitation, decision, revision, submission, published, decline_notice, direct
                $table->string('subject');
                $table->text('body');
                $table->boolean('is_read')->default(false);
                $table->timestamp('read_at')->nullable();
                $table->timestamps();

                $table->index(['recipient_id', 'is_read']);
                $table->index(['sender_id', 'created_at']);
            });
        }
    }

    public function down()
    {
        Schema::dropIfExists('inbox_messages');
    }
};
