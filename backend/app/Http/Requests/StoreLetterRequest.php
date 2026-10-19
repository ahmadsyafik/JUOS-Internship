<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLetterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'template_id' => ['required', 'integer', 'exists:templates,id'],
            'data_surat'  => ['required', 'array'],
            'data_surat.*'=> ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'template_id.required' => 'Template wajib dipilih.',
            'template_id.exists'   => 'Template tidak ditemukan.',
            'data_surat.required'  => 'Data surat wajib diisi.',
            'data_surat.array'     => 'Format data surat tidak valid.',
        ];
    }
}