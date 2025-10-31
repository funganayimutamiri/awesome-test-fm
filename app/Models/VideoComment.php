<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VideoComment extends Model
{
    protected $fillable = [
        'user_id',
        'video_id',
        'comment',
        'timestamp',
    ];

    protected $casts = [
        'timestamp' => 'decimal:2',
    ];

    /**
     * Get the user that owns the comment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
