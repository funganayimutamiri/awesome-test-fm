<?php

use App\Http\Controllers\VideoCommentController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('/api/video-comments', [VideoCommentController::class, 'index'])
    ->name('video-comments.index');
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::post('/api/video-comments', [VideoCommentController::class, 'store'])
        ->name('video-comments.store');

    Route::delete('/api/video-comments/{id}', [VideoCommentController::class, 'destroy'])
        ->name('video-comments.destroy');
});

require __DIR__.'/settings.php';
