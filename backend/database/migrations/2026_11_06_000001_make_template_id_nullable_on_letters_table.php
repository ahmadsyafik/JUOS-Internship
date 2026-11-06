<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->dropForeign(['template_id']);
            $table->unsignedBigInteger('template_id')->nullable()->change();
            $table->foreign('template_id')
                ->references('id')
                ->on('templates')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('letters', function (Blueprint $table) {
            $table->dropForeign(['template_id']);
            $table->unsignedBigInteger('template_id')->nullable(false)->change();
            $table->foreign('template_id')
                ->references('id')
                ->on('templates')
                ->restrictOnDelete();
        });
    }
};

