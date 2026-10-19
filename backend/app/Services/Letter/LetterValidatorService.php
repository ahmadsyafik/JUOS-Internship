<?php

namespace App\Services\Letter;

use App\Models\Template;

class LetterValidatorService
{
    private const RESERVED_VARS = [
        'tanda_tangan', 'ttd', 'ttd_direktur', 'signature',
        'nomor_surat',
        'tim_nama_json', 'tim_jabatan_json',
        'start_maps_img', 'end_maps_img',
        'no',
    ];

    private const OPTIONAL_VARS = [
        'npwp',
        'lainnya',
    ];

    private const TEAM_KEYS = [
        'nama',
        'jabatan',
        'no',
    ];

    /**
     * Validasi data_surat sudah memenuhi semua variabel yang dibutuhkan template
     *
     * @throws \InvalidArgumentException
     */
    public function validate(Template $template, array $dataSurat): void
    {
        $requiredVariables = $template->variabel ?? []; // sudah di-cast ke array di model
        $missing = [];

        // Cek apakah data tim teknis disediakan (misal untuk SPK / tabel tim)
        $hasTeamData = false;
        if (!empty($dataSurat['tim_nama_json']) && !empty($dataSurat['tim_jabatan_json'])) {
            $namaList = is_string($dataSurat['tim_nama_json'])
                ? json_decode($dataSurat['tim_nama_json'], true)
                : $dataSurat['tim_nama_json'];
            $jabatanList = is_string($dataSurat['tim_jabatan_json'])
                ? json_decode($dataSurat['tim_jabatan_json'], true)
                : $dataSurat['tim_jabatan_json'];

            if (is_array($namaList) && is_array($jabatanList) && count($namaList) > 0) {
                $count = min(count($namaList), count($jabatanList));
                for ($i = 0; $i < $count; $i++) {
                    if (!empty(trim((string)($namaList[$i] ?? ''))) && !empty(trim((string)($jabatanList[$i] ?? '')))) {
                        $hasTeamData = true;
                        break;
                    }
                }
            }
        }

        foreach ($requiredVariables as $variable) {
            $varLower = strtolower($variable);

            // Variabel sistem / reserved tidak divalidasi dari user input
            if (in_array($varLower, self::RESERVED_VARS, true)) {
                continue;
            }

            // Jika data tim teknis sudah diisi dalam tabel tim, skip nama, jabatan, no
            if ($hasTeamData && in_array($varLower, self::TEAM_KEYS, true)) {
                continue;
            }

            // Field opsional diabaikan jika tidak diisi
            if (in_array($varLower, self::OPTIONAL_VARS, true)) {
                continue;
            }

            // Validasi string / array
            $val = $dataSurat[$variable] ?? null;
            if ($val === null || (is_string($val) && trim($val) === '')) {
                $missing[] = $variable;
            }
        }

        if (!empty($missing)) {
            throw new \InvalidArgumentException(
                'Field berikut wajib diisi: ' . implode(', ', $missing)
            );
        }
    }
}