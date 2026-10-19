<?php

namespace Tests\Unit;

use App\Models\Template;
use App\Services\Letter\LetterValidatorService;
use PHPUnit\Framework\TestCase;

class LetterValidatorServiceTest extends TestCase
{
    private LetterValidatorService $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new LetterValidatorService();
    }

    public function test_passes_when_all_required_variables_are_filled(): void
    {
        $template = new Template();
        $template->variabel = ['tujuan', 'keperluan'];

        $dataSurat = [
            'tujuan' => 'Kantor Pusat',
            'keperluan' => 'Koordinasi',
        ];

        $this->validator->validate($template, $dataSurat);
        $this->assertTrue(true);
    }

    public function test_throws_exception_when_required_variable_is_missing(): void
    {
        $template = new Template();
        $template->variabel = ['tujuan', 'keperluan'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Field berikut wajib diisi: keperluan');

        $this->validator->validate($template, [
            'tujuan' => 'Kantor Pusat',
            'keperluan' => '   ',
        ]);
    }

    public function test_passes_when_team_table_json_is_provided_for_nama_and_jabatan(): void
    {
        $template = new Template();
        $template->variabel = ['nama', 'jabatan', 'no', 'tujuan'];

        $dataSurat = [
            'tujuan' => 'Surabaya',
            'tim_nama_json' => json_encode(['Budi', 'Siti']),
            'tim_jabatan_json' => json_encode(['Leader', 'Staff']),
        ];

        $this->validator->validate($template, $dataSurat);
        $this->assertTrue(true);
    }

    public function test_throws_when_team_table_json_is_empty_or_blank(): void
    {
        $template = new Template();
        $template->variabel = ['nama', 'jabatan', 'tujuan'];

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Field berikut wajib diisi: nama, jabatan');

        $this->validator->validate($template, [
            'tujuan' => 'Surabaya',
            'tim_nama_json' => json_encode(['']),
            'tim_jabatan_json' => json_encode(['']),
        ]);
    }

    public function test_ignores_reserved_and_optional_variables(): void
    {
        $template = new Template();
        $template->variabel = ['tujuan', 'nomor_surat', 'ttd', 'npwp'];

        $dataSurat = [
            'tujuan' => 'Jakarta',
        ];

        $this->validator->validate($template, $dataSurat);
        $this->assertTrue(true);
    }
}
