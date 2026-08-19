<?php

use App\Http\Controllers\TemplateController;
use App\Http\Controllers\PreviewController;
use App\Http\Controllers\LetterController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\SyncController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::get('/templates', [TemplateController::class, 'index']);
Route::get('/templates/{template}', [TemplateController::class, 'show']);
Route::post('/templates', [TemplateController::class, 'store']);
// Bug 4: preview template sebelum disimpan (LibreOffice, tanpa auth)
Route::post('/templates/preview-upload', [TemplateController::class, 'previewUpload']);
Route::delete('/templates/{template}', [TemplateController::class, 'destroy']); 

Route::get('/letters', [LetterController::class, 'index']);
Route::post('/letters/preview', [PreviewController::class, 'generate']);
// Bug 2+5: serve PDF surat untuk iframe di detail page (tanpa auth agar iframe bisa load)
Route::get('/letters/{letter}/pdf-view', [LetterController::class, 'pdfView']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/letters/{letter}', [LetterController::class, 'show']);
    Route::get('/letters/{letter}/export', [LetterController::class, 'export']);
    Route::post('/letters', [LetterController::class, 'store']);
    Route::put('/letters', [LetterController::class, 'update']);
    Route::put('/letters/{letter}', [LetterController::class, 'update']);
    Route::patch('/letters/{letter}/approve', [LetterController::class, 'approve']);
    Route::patch('/letters/{letter}/reject', [LetterController::class, 'reject']);
    Route::patch('/letters/{letter}/revise', [LetterController::class, 'revise']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('sync')->group(function () {
        Route::post('csv', [SyncController::class, 'csv']);
    });
    Route::prefix('user')->group(function () {
        Route::post('signature', [UserController::class, 'uploadSignature']);
        Route::get('signature', [UserController::class, 'getSignature']);
    });
});