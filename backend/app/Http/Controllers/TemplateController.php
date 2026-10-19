<?php

namespace App\Http\Controllers;

use App\Models\Template;
use App\Services\Template\DocxTemplateParserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;

class TemplateController extends Controller
{
    public function __construct(
        private readonly DocxTemplateParserService $parserService
    ) {}

    /**
     * GET /api/templates
     */
    public function index(): JsonResponse
    {
        $templates = Template::query()->orderBy('created_at', 'desc')->get();

        return Response::json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * GET /api/templates/{id}
     */
    public function show(Template $template): JsonResponse
    {
        return Response::json([
            'success' => true,
            'data' => $template,
        ]);
    }

    /**
     * POST /api/templates
     * - File DOCX wajib
     * - Variabel diekstrak dari isi file, BUKAN dari input frontend
     * - raw_content (plain text) disimpan untuk fallback preview
     */
    public function store(Request $request): JsonResponse
    {
        try {
            if ($request->has('is_active')) {
                $request->merge([
                    'is_active' => filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
                ]);
            }
            $request->validate([
                'nama' => 'required|string|max:100',
                'jenis_surat' => 'required|string|max:50',
                'file_docx' => 'required|file|mimes:docx|max:10240',
                'is_active' => 'nullable|boolean',
                'created_by' => 'nullable|integer',
            ]);

            $pathDocx = $request->file('file_docx')->store('templates', 'public');
            $absolutePath = Storage::disk('public')->path($pathDocx);

            try {
                [$variabel, $rawContent] = $this->parserService->parse($absolutePath);
            } catch (\Throwable $e) {
                // Hapus file yang sudah ter-upload kalau extract gagal
                Storage::disk('public')->delete($pathDocx);

                \Log::error('Gagal extract DOCX', [
                    'message' => $e->getMessage(),
                    'path' => $pathDocx,
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Gagal membaca isi file DOCX. Pastikan file tidak rusak.',
                ], 422);
            }

            $template = Template::create([
                'nama' => $request->input('nama'),
                'jenis_surat' => strtoupper($request->input('jenis_surat')),
                'path_docx' => $pathDocx,
                'variabel' => $variabel,
                'raw_content' => $rawContent,
                'is_active' => $request->boolean('is_active', true),
                'created_by' => $request->input('created_by'),
            ]);

            return response()->json([
                'success' => true,
                'message' => count($variabel) . ' variabel terdeteksi dari file .docx.',
                'data' => $template,
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Throwable $e) {
            \Log::error('Gagal menyimpan template', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menyimpan template. Silakan coba lagi.',
            ], 500);
        }
    }

    /**
     * POST /api/templates/preview-upload
     * Upload DOCX sementara → konversi ke PDF via LibreOffice → return PDF URL + variabel.
     * Dipakai oleh new.tsx untuk preview sebelum template disimpan ke DB.
     */
    public function previewUpload(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file_docx' => 'required|file|mimes:docx|max:10240',
            ]);

            // Simpan ke folder temp
            $pathDocx = $request->file('file_docx')->store('templates/temp', 'public');
            $absolutePath = Storage::disk('public')->path($pathDocx);

            // Extract variabel dari XML di dalam DOCX via DocxTemplateParserService
            try {
                [$variabel] = $this->parserService->parse($absolutePath);
            } catch (\Throwable $e) {
                Storage::disk('public')->delete($pathDocx);

                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage(),
                ], 422);
            }

            // Konversi DOCX → PDF via LibreOffice
            $pdfUrl = null;
            try {
                $pdfConverter = app(\App\Services\Letter\PdfConverterService::class);
                $pdfPath = $pdfConverter->convert($pathDocx);
                $pdfUrl = '/storage/' . $pdfPath;
            } catch (\RuntimeException $e) {
                \Log::warning('Preview upload PDF conversion failed', ['message' => $e->getMessage()]);

                // PDF gagal, tapi variabel tetap dikembalikan
                return response()->json([
                    'success' => true,
                    'message' => 'File berhasil diupload, tetapi konversi PDF gagal.',
                    'data' => [
                        'pdf_url' => null,
                        'variabel' => $variabel,
                    ],
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'pdf_url' => $pdfUrl,
                    'variabel' => $variabel,
                ],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            \Log::error('Preview upload failed', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memproses file. Silakan coba lagi.',
            ], 500);
        }
    }
    /**
     * PUT /api/templates/{id}
     * PUT /api/templates (legacy without route parameter)
     */
    public function update(Request $request, ?Template $template = null): JsonResponse
    {
        try {
            if ($request->has('is_active')) {
                $request->merge([
                    'is_active' => filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE)
                ]);
            }

            $template = $template ?? Template::find($request->input('id'));

            if (!$template) {
                return response()->json([
                    'success' => false,
                    'message' => 'Template tidak ditemukan.',
                ], 404);
            }

            $rules = [
                'nama' => 'sometimes|required|string|max:100',
                'jenis_surat' => 'sometimes|required|string|max:50',
                'is_active' => 'nullable|boolean',
                'created_by' => 'nullable|integer',
            ];

            if ($request->hasFile('file_docx')) {
                $rules['file_docx'] = 'required|file|mimes:docx|max:10240';
            }

            $request->validate($rules);

            $data = [
                'nama' => $request->input('nama', $template->nama),
                'jenis_surat' => strtoupper((string) $request->input('jenis_surat', $template->jenis_surat)),
                'is_active' => $request->boolean('is_active', $template->is_active),
                'created_by' => $request->input('created_by', $template->created_by),
            ];

            if ($request->hasFile('file_docx')) {
                $newPathDocx = $request->file('file_docx')->store('templates', 'public');
                $absolutePath = Storage::disk('public')->path($newPathDocx);

                try {
                    [$variabel, $rawContent] = $this->extractFromDocx($absolutePath);
                } catch (\Throwable $e) {
                    Storage::disk('public')->delete($newPathDocx);

                    \Log::error('Gagal extract DOCX saat update template', [
                        'message' => $e->getMessage(),
                        'path' => $newPathDocx,
                    ]);

                    return response()->json([
                        'success' => false,
                        'message' => 'Gagal membaca isi file DOCX. Pastikan file tidak rusak.',
                    ], 422);
                }

                if ($template->path_docx && Storage::disk('public')->exists($template->path_docx)) {
                    Storage::disk('public')->delete($template->path_docx);
                }

                $data['path_docx'] = $newPathDocx;
                $data['variabel'] = $variabel;
                $data['raw_content'] = $rawContent;
            }

            $template->update($data);

            return response()->json([
                'success' => true,
                'message' => 'Template berhasil diperbarui.',
                'data' => $template->fresh(),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Throwable $e) {
            \Log::error('Gagal memperbarui template', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui template. Silakan coba lagi.',
            ], 500);
        }
    }

    /**
     * DELETE /api/templates/{id}
     */
    public function destroy(Template $template): JsonResponse
    {
        // Hapus file DOCX dari storage
        if ($template->path_docx) {
            Storage::disk('public')->delete($template->path_docx);
        }

        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil dihapus.',
        ]);
    }

}