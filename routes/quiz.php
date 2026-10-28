<?php

use App\Http\Controllers\QuizController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('quizzes', [QuizController::class, 'index'])->name('quizzes.index');
    Route::get('quizzes/new', [QuizController::class, 'create'])->name('quizzes.create');

    // Limit AI calls to 10 per minute per user to protect your API bill.
    Route::post('quizzes', [QuizController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('quizzes.store');

    Route::get('quizzes/{quiz}', [QuizController::class, 'show'])->name('quizzes.show');
    Route::post('quizzes/{quiz}/submit', [QuizController::class, 'submit'])->name('quizzes.submit');
    Route::delete('quizzes/{quiz}', [QuizController::class, 'destroy'])->name('quizzes.destroy');

    Route::get('attempts/{attempt}', [QuizController::class, 'result'])->name('attempts.show');
});
