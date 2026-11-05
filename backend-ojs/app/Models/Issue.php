<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Issue extends Model
{
    use HasFactory;

    protected $fillable = [
        'journal_id',
        'volume',
        'number',
        'year',
        'title',
        'is_current',
        'published_at',
    ];

    protected $casts = [
        'is_current' => 'boolean',
    ];

    public function journal()
    {
        return $this->belongsTo(Journal::class);
    }

    public function submissions()
    {
        return $this->hasMany(Submission::class);
    }
}
