<?php

namespace App\Services\Letter;

use App\Models\NomorSuratCounter;
use Illuminate\Support\Facades\DB;
class NomorSuratService
{
    public function generate(string $jenisSurat): string
    {
        return DB::transaction(function () use ($jenisSurat) {
            $tahun = now()->year;
            $bulan = now()->month;

            $counter = NomorSuratCounter::lockForUpdate()->firstOrCreate(
                [
                    'jenis_surat' => strtoupper($jenisSurat),
                    'tahun'       => $tahun,
                    'bulan'       => $bulan,
                ],
                ['counter' => 0]
            );

            $counter->increment('counter');

            $nomorUrut   = str_pad($counter->counter, 3, '0', STR_PAD_LEFT);
            $bulanRomawi = $this->toRomawi($bulan);

            return "{$jenisSurat}/JUOS/{$bulanRomawi}/{$tahun}/{$nomorUrut}";
        });
    }

    private function toRomawi(int $bulan): string
    {
        return [
            1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV',
            5 => 'V', 6 => 'VI', 7 => 'VII', 8 => 'VIII',
            9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
        ][$bulan] ?? (string) $bulan;
    }
}