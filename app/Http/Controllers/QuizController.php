<?php

namespace App\Http\Controllers;

use App\Models\Attempt;
use App\Models\Quiz;
use App\Services\QuizGenerator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class QuizController extends Controller
{
    /** List the user's quizzes with their best score. */
    public function index(Request $request): Response
    {
        $quizzes = Quiz::where('user_id', $request->user()->id)
            ->withCount('questions')
            ->withMax('attempts', 'score')
            ->latest()
            ->get()
            ->map(fn (Quiz $quiz) => [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'question_count' => $quiz->questions_count,
                'best_score' => $quiz->attempts_max_score,
                'created_at' => $quiz->created_at->diffForHumans(),
            ]);

        return Inertia::render('quizzes/index', ['quizzes' => $quizzes]);
    }

    /** Form to paste notes. */
    public function create(): Response
    {
        return Inertia::render('quizzes/create');
    }

    /** Send the notes to the AI, save the quiz, then open it. */
    public function store(Request $request, QuizGenerator $generator): RedirectResponse
    {
        $data = $request->validate([
            'notes' => ['required', 'string', 'min:50', 'max:15000'],
            'count' => ['required', 'integer', 'min:3', 'max:15'],
        ]);

        // AI replies can take a while; allow up to 3 minutes for this request
        // (PHP's default limit of 60 seconds is too short).
        set_time_limit(180);

        try {
            $generated = $generator->generate($data['notes'], $data['count']);
        } catch (Throwable $e) {
            Log::error('Quiz generation failed', ['error' => $e->getMessage()]);

            return back()->withErrors([
                'notes' => 'Sorry, the AI could not make a quiz from these notes. Please try again.',
            ]);
        }

        $quiz = DB::transaction(function () use ($request, $data, $generated) {
            $quiz = Quiz::create([
                'user_id' => $request->user()->id,
                'title' => $generated['title'],
                'notes' => $data['notes'],
            ]);

            foreach ($generated['questions'] as $i => $q) {
                $quiz->questions()->create([...$q, 'position' => $i + 1]);
            }

            return $quiz;
        });

        return to_route('quizzes.show', $quiz);
    }

    /** Play the quiz. Correct answers are NOT sent to the browser. */
    public function show(Request $request, Quiz $quiz): Response
    {
        abort_unless($quiz->user_id === $request->user()->id, 403);

        return Inertia::render('quizzes/play', [
            'quiz' => [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'questions' => $quiz->questions->map(fn ($q) => [
                    'id' => $q->id,
                    'question' => $q->question,
                    'options' => $q->options,
                ]),
            ],
        ]);
    }

    /** Grade the answers on the server and save the attempt. */
    public function submit(Request $request, Quiz $quiz): RedirectResponse
    {
        abort_unless($quiz->user_id === $request->user()->id, 403);

        $data = $request->validate([
            'answers' => ['required', 'array'],
            'answers.*' => ['nullable', 'integer', 'min:0', 'max:3'],
        ]);

        $questions = $quiz->questions;
        $answers = [];
        $score = 0;

        foreach ($questions as $q) {
            $chosen = $data['answers'][$q->id] ?? null;
            $answers[$q->id] = $chosen;
            if ($chosen === $q->correct_index) {
                $score++;
            }
        }

        $attempt = $quiz->attempts()->create([
            'user_id' => $request->user()->id,
            'answers' => $answers,
            'score' => $score,
            'total' => $questions->count(),
        ]);

        return to_route('attempts.show', $attempt);
    }

    /** Results page with explanations. */
    public function result(Request $request, Attempt $attempt): Response
    {
        abort_unless($attempt->user_id === $request->user()->id, 403);

        $quiz = $attempt->quiz;

        return Inertia::render('quizzes/result', [
            'attempt' => [
                'id' => $attempt->id,
                'score' => $attempt->score,
                'total' => $attempt->total,
            ],
            'quiz' => ['id' => $quiz->id, 'title' => $quiz->title],
            'review' => $quiz->questions->map(fn ($q) => [
                'id' => $q->id,
                'question' => $q->question,
                'options' => $q->options,
                'correct_index' => $q->correct_index,
                'chosen_index' => $attempt->answers[$q->id] ?? null,
                'explanation' => $q->explanation,
            ]),
        ]);
    }

    public function destroy(Request $request, Quiz $quiz): RedirectResponse
    {
        abort_unless($quiz->user_id === $request->user()->id, 403);

        $quiz->delete();

        return to_route('quizzes.index');
    }
}
