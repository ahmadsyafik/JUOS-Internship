<?php

namespace App\Services\Letter;

use App\Models\Template;
use PhpOffice\PhpWord\TemplateProcessor;
use Illuminate\Support\Facades\Storage;

class DocxGeneratorService
{
    /**
     * Generate DOCX dari template dengan data yang diberikan
     * Return path file yang disimpan (relatif dari storage/app/)
     *
     * @throws \RuntimeException
     */
    public function generate(Template $template, array $data): string
    {
        $templatePath = Storage::disk('public')->path($template->path_docx);

        if (!file_exists($templatePath)) {
            throw new \RuntimeException("File template tidak ditemukan: {$template->path_docx}");
        }

        $processor = new TemplateProcessor($templatePath);
        $processor->setMacroChars('{{', '}}'); // ← tambah ini: pakai {{key}} bukan ${key}

// Variabel yang diisi sistem (seperti tanda tangan) dikecualikan dari input user
$reservedKeys = ['tanda_tangan', 'ttd', 'ttd_direktur', 'signature'];

// Handle tim teknis (cloneRow untuk auto-rows tabel SPK)
if (isset($data['tim_nama_json']) && isset($data['tim_jabatan_json'])) {
    $namaList    = is_array($data['tim_nama_json']) ? $data['tim_nama_json'] : (json_decode($data['tim_nama_json'], true) ?? []);
    $jabatanList = is_array($data['tim_jabatan_json']) ? $data['tim_jabatan_json'] : (json_decode($data['tim_jabatan_json'], true) ?? []);
    $count       = min(count($namaList), count($jabatanList));

    if ($count > 0) {
        try {
            $processor->cloneRow('nama', $count);
            for ($i = 1; $i <= $count; $i++) {
                $processor->setValue("no#{$i}",      (string)$i);              
                $processor->setValue("nama#{$i}",    $namaList[$i - 1] ?? '');
                $processor->setValue("jabatan#{$i}", $jabatanList[$i - 1] ?? '');
            }
        } catch (\Exception $e) {
            Log::warning('cloneRow failed, fallback to plain value', ['error' => $e->getMessage()]);
        }
    }
    unset($data['tim_nama_json'], $data['tim_jabatan_json'], $data['nama'], $data['jabatan'], $data['no']);
}

// Handle base64 image fields (_img / _gambar)
// Decode dan simpan ke file temp, lalu setImageValue ke placeholder di template
$imageFieldSuffixes = ['_img', '_gambar'];
foreach ($data as $imgKey => $imgValue) {
    $isImageField = false;
    foreach ($imageFieldSuffixes as $suffix) {
        if (str_ends_with(strtolower($imgKey), $suffix)) {
            $isImageField = true;
            break;
        }
    }
    if (!$isImageField || empty($imgValue)) continue;

    try {
        $tmpPath = sys_get_temp_dir() . '/' . uniqid('img_') . '.png';
        file_put_contents($tmpPath, base64_decode($imgValue));

        $processor->setImageValue($imgKey, [
            'path'   => $tmpPath,
            'width'  => 400,
            'height' => 260,
            'ratio'  => true,
        ]);
    } catch (\Exception $e) {
        Log::warning("Image insert failed for {$imgKey}", ['error' => $e->getMessage()]);
    }

    // Hapus dari data agar tidak diproses setValue (base64 sangat panjang)
    unset($data[$imgKey]);
}

// setValue semua variabel biasa
foreach ($data as $key => $value) {
    if (!in_array(strtolower($key), $reservedKeys)) {
        try {
            $processor->setValue($key, $value ?? '');
        } catch (\Exception $e) {
            // Skip jika placeholder tidak ada di template
        }
    }
}
        // Sisipkan TTD direktur jika sudah upload
        $this->insertSignatureIfExists($processor);

        // Simpan ke storage
        $outputPath = $this->buildOutputPath();
        $this->ensureDirectoryExists(dirname(storage_path('app/' . $outputPath)));
        $processor->saveAs(Storage::disk('public')->path($outputPath));

        return $outputPath;
    }

    /**
     * Sisipkan gambar TTD direktur ke placeholder ${tanda_tangan}
     * Jika belum ada TTD, placeholder dibiarkan kosong
     */
    private function insertSignatureIfExists(TemplateProcessor $processor): void
    {
        $direktur = \App\Models\User::where('role', 'direktur')
            ->whereNotNull('signature_path')
            ->first();

        if (!$direktur)
            return;

        $signaturePath = storage_path('app/' . $direktur->signature_path);

        if (!file_exists($signaturePath))
            return;

        $processor->setImageValue('tanda_tangan', [
            'path' => $signaturePath,
            'width' => 100,
            'height' => 50,
            'ratio' => true,
        ]);
    }

    /**
 * Ekstrak koordinat lat,lng dari URL Google Maps.
 * Mendukung format: /maps/@LAT,LNG,Xz dan ?q=LAT,LNG
 * TIDAK mendukung link pendek goo.gl (butuh HTTP redirect)
 */
private function extractCoordinates(string $url): ?array
{
    // Format: https://www.google.com/maps/@-7.123,112.456,15z
    if (preg_match('/@(-?\d+\.\d+),(-?\d+\.\d+)/', $url, $m)) {
        return ['lat' => $m[1], 'lng' => $m[2]];
    }
    // Format: https://maps.google.com/?q=-7.123,112.456
    if (preg_match('/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/', $url, $m)) {
        return ['lat' => $m[1], 'lng' => $m[2]];
    }
    return null;
}

/**
 * Download gambar peta dari Google Maps Static API.
 * API key gratis: https://console.cloud.google.com → Maps Static API
 * Simpan GOOGLE_MAPS_API_KEY di .env
 */
private function downloadStaticMap(array $coords, string $apiKey): ?string
{
    $lat = $coords['lat'];
    $lng = $coords['lng'];
    $url = "https://maps.googleapis.com/maps/api/staticmap"
         . "?center={$lat},{$lng}&zoom=15&size=400x260"
         . "&markers=color:red|{$lat},{$lng}"
         . "&key={$apiKey}";

    $tmpDir  = storage_path('app/tmp');
    if (!is_dir($tmpDir)) mkdir($tmpDir, 0755, true);
    $tmpPath = $tmpDir . '/map_' . uniqid() . '.png';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
        CURLOPT_SSL_VERIFYPEER => false,
    ]);
    $imgData = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$imgData) return null;
    file_put_contents($tmpPath, $imgData);
    return $tmpPath;
}

    private function buildOutputPath(): string
    {
        return 'letters/draft/letter_' . time() . '_' . uniqid() . '.docx';
    }

    private function ensureDirectoryExists(string $dir): void
    {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}