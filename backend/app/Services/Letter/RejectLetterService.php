<?php

namespace App\Services\Letter;

use App\Models\Approval;
use App\Models\Letter;
use App\Models\User;

class RejectLetterService
{
    /**
     * Tolak surat dan simpan catatan penolakan serta riwayat approval
     *
     * @throws \InvalidArgumentException
     */
    public function handle(Letter $letter, User $reviewer, string $catatan): Letter
    {
        if ($letter->status !== 'pending_approval') {
            throw new \InvalidArgumentException('Surat tidak dalam status menunggu persetujuan.');
        }

        Approval::create([
            'letter_id'   => $letter->id,
            'reviewed_by' => $reviewer->id,
            'status'      => 'rejected',
            'catatan'     => $catatan,
            'reviewed_at' => now(),
        ]);

        $letter->update([
            'status'         => 'rejected',
            'catatan_reject' => $catatan,
        ]);

        return $letter->fresh(['template', 'creator', 'latestApproval.reviewer']);
    }
}
