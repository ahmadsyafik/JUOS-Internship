<?php

namespace App\Services\Letter;

use App\Models\Approval;
use App\Models\Letter;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\TemplateProcessor;

class ApproveLetterService
{
    /**
     * Setujui surat, sematkan tanda tangan direktur jika ada, dan simpan riwayat approval
     *
     * @throws \InvalidArgumentException|\Throwable
     */
    public function handle(Letter $letter, User $reviewer, ?string $catatan = null): Letter
    {
        if ($letter->status !== 'pending_approval') {
            throw new \InvalidArgumentException('Surat tidak dalam status menunggu persetujuan.');
        }

        // Sisipkan TTD ke DOCX jika reviewer (direktur) memiliki signature
        if ($reviewer->signature_path && $letter->path_docx) {
            $signaturePath = Storage::disk('public')->path($reviewer->signature_path);
            $docxPath      = Storage::disk('public')->path($letter->path_docx);

            if (file_exists($signaturePath) && file_exists($docxPath)) {
                $processor = new TemplateProcessor($docxPath);
                $processor->setMacroChars('{{', '}}');

                $processor->setImageValue('tanda_tangan', [
                    'path'   => $signaturePath,
                    'width'  => 100,
                    'height' => 50,
                    'ratio'  => true,
                ]);

                $processor->saveAs($docxPath);

                // Hapus cache PDF agar diregenerasi dengan TTD
                if ($letter->path_pdf) {
                    $cachedPdf = Storage::disk('public')->path($letter->path_pdf);
                    if (file_exists($cachedPdf)) {
                        @unlink($cachedPdf);
                    }
                }
            }
        }

        // Simpan record approval
        Approval::create([
            'letter_id'   => $letter->id,
            'reviewed_by' => $reviewer->id,
            'status'      => 'approved',
            'catatan'     => $catatan,
            'reviewed_at' => now(),
        ]);

        // Update status surat + reset path_pdf agar dikonversi ulang
        $letter->update([
            'status'   => 'approved',
            'path_pdf' => null,
        ]);

        return $letter->fresh(['template', 'creator', 'latestApproval.reviewer']);
    }
}
