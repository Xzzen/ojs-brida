<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Journal extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'title',
        'abbreviation',
        'issn_print',
        'issn_online',
        'description',
        'focus_scope',
        'publisher',
        'chief_editor',
        'frequency',
        'accreditation',
        'accent_color',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function issues()
    {
        return $this->hasMany(Issue::class);
    }

    public function submissions()
    {
        return $this->hasMany(Submission::class);
    }
}
