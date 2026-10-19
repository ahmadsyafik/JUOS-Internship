<?php

namespace App\Services\Template;

use ZipArchive;

class DocxTemplateParserService
{
    private const RESERVED_VARS = [
        'tanda_tangan', 'ttd', 'ttd_direktur', 'signature',
        'nomor_surat',
        'tim_nama_json', 'tim_jabatan_json',
        'start_maps_img', 'end_maps_img',
        'no',
    ];

    /**
     * Buka .docx (ZIP), baca word/document.xml,
     * gabung semua <w:t> node, dan ekstrak variabel {{nama_variabel}}.
     *
     * @return array{0: string[], 1: string} [variabel_array, raw_text_string]
     * @throws \RuntimeException
     */
    public function parse(string $absolutePath): array
    {
        $zip = new ZipArchive();

        if ($zip->open($absolutePath) !== true) {
            throw new \RuntimeException('Gagal membuka file DOCX. Pastikan file tidak rusak.');
        }

        $xml = $zip->getFromName('word/document.xml');
        $zip->close();

        if ($xml === false) {
            throw new \RuntimeException('File DOCX tidak valid atau tidak berisi document.xml.');
        }

        // Gabung semua teks di dalam tag <w:t>
        preg_match_all('/<w:t[^>]*>(.*?)<\/w:t>/s', $xml, $matches);
        $rawContent = html_entity_decode(implode('', $matches[1]), ENT_QUOTES | ENT_XML1);

        // Cleanup: hapus Word-specific XML tags yang mungkin tertinggal
        $rawContent = preg_replace('/<w:[^>]*>/i', '', $rawContent);
        $rawContent = preg_replace('/<\/w:[^>]*>/i', '', $rawContent);

        // Bersihkan whitespace berlebih
        $rawContent = preg_replace('/[ \t]+/', ' ', $rawContent);
        $rawContent = preg_replace('/\n\s*\n/', "\n", $rawContent);
        $rawContent = trim($rawContent);

        // Extract {{nama_variabel}} dari raw text
        preg_match_all('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', $rawContent, $varMatches);
        $variabel = $this->filterReservedVars(array_values(array_unique($varMatches[1])));

        return [$variabel, $rawContent];
    }

    /**
     * Saring variabel sistem yang tidak boleh diisi user secara langsung
     */
    public function filterReservedVars(array $variabel): array
    {
        return array_values(array_filter(
            $variabel,
            fn($v) => !in_array(strtolower($v), self::RESERVED_VARS, true)
        ));
    }
}
