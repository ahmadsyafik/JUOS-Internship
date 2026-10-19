<?php

namespace App\Http\Controllers;

use App\Models\Template;
use App\Services\Letter\DocxGeneratorService;
use App\Services\Letter\PdfConverterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Generate preview surat sebagai PDF, ditampilkan via <iframe> di frontend.
 * Pendekatan ini menggantikan ONLYOFFICE yang bermasalah dengan Docker private IP.
 * PDF di-render browser secara native → fidelitas 100% (header, footer, dll).
 */
class PreviewController extends Controller
{
    public function __construct(
        private readonly DocxGeneratorService $docxGenerator,
        private readonly PdfConverterService  $pdfConverter,
    ) {}

    /**
     * POST /api/letters/preview
     * Body: { template_id: int, data_surat: object }
     * Response: { pdf_url: "/storage/letters/pdf/xxx.pdf", key: "abc123" }
     */
    public function generate(Request $request): JsonResponse
    {
        $request->validate([
            'template_id'  => 'required|integer|exists:templates,id',
            'data_surat'   => 'required|array',
            'data_surat.*' => 'nullable|string',
        ]);

        $template = Template::findOrFail($request->input('template_id'));

        try {
            // Step 1: Generate DOCX via PhpWord (reuse existing service)
            $docxPath = $this->docxGenerator->generate(
                $template,
                $request->input('data_surat', [])
            );

            // Step 2: Konversi DOCX → PDF via LibreOffice
            $pdfPath = $this->pdfConverter->convert($docxPath);

            // Step 3: Return URL PDF — diakses browser via Vite proxy /storage → backend:8000
            // Tidak ada masalah private IP seperti ONLYOFFICE
            $pdfUrl = '/storage/' . $pdfPath;

            Log::info('Preview PDF generated', [
                'template_id' => $template->id,
                'pdf_url'     => $pdfUrl,
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'pdf_url' => $pdfUrl,
                    'key'     => md5($pdfPath . microtime(true)), // cache-busting
                ],
            ]);

        } catch (\RuntimeException $e) {
            Log::warning('Preview generation failed', [
                'template_id' => $template->id,
                'message'     => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}