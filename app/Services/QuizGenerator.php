<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Turns a block of study notes into multiple-choice questions using an AI model.
 * Set AI_PROVIDER in .env to "gemini" (free tier) or "claude" (paid).
 */
class QuizGenerator
{
    /**
     * @return array{title: string, questions: array<int, array{question: string, options: array<int, string>, correct_index: int, explanation: string}>}
     */
    public function generate(string $notes, int $count = 5): array
    {
        $prompt = <<<PROMPT
You are a helpful study assistant. Create {$count} multiple-choice questions that test real understanding of the notes below (not just word matching).

Rules:
- Each question has exactly 4 options.
- Exactly one option is correct, and the wrong options should be plausible.
- Vary the position of the correct answer.
- correct_index is the position of the correct option: 0, 1, 2 or 3.
- Add a one or two sentence explanation of why the correct answer is right.
- Only use information found in the notes.

Respond with ONLY valid JSON in exactly this shape, with no other text:
{"title": "short quiz title", "questions": [{"question": "...", "options": ["...", "...", "...", "..."], "correct_index": 0, "explanation": "..."}]}

<notes>
{$notes}
</notes>
PROMPT;

        $text = match (config('services.ai.provider', 'gemini')) {
            'claude' => $this->askClaude($prompt),
            default => $this->askGemini($prompt),
        };

        try {
            return $this->validate($this->extractJson($text));
        } catch (RuntimeException $e) {
            // Save what the AI actually said, so problems are easy to debug.
            Log::warning('Unusable AI reply', ['reply' => mb_substr($text, 0, 3000)]);

            throw $e;
        }
    }

    /**
     * Google Gemini (has a free tier, no credit card needed).
     */
    private function askGemini(string $prompt): string
    {
        $model = config('services.gemini.model');

        $generationConfig = [
            'responseMimeType' => 'application/json',
            // Forces Gemini to reply in exactly the shape the app expects.
            'responseSchema' => [
                'type' => 'OBJECT',
                'properties' => [
                    'title' => ['type' => 'STRING'],
                    'questions' => [
                        'type' => 'ARRAY',
                        'items' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'question' => ['type' => 'STRING'],
                                'options' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                                'correct_index' => ['type' => 'INTEGER'],
                                'explanation' => ['type' => 'STRING'],
                            ],
                            'required' => ['question', 'options', 'correct_index', 'explanation'],
                        ],
                    ],
                ],
                'required' => ['title', 'questions'],
            ],
        ];

        // Less "thinking" = faster answers. Set GEMINI_THINKING in .env
        // (minimal, low, medium or high). Leave it empty to use the model's default.
        if ($thinking = config('services.gemini.thinking')) {
            $generationConfig['thinkingConfig'] = ['thinkingLevel' => $thinking];
        }

        $response = Http::withHeaders([
            'x-goog-api-key' => config('services.gemini.key'),
        ])
            ->connectTimeout(15)
            ->timeout(150)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                'contents' => [
                    ['role' => 'user', 'parts' => [['text' => $prompt]]],
                ],
                'generationConfig' => $generationConfig,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Gemini request failed: '.$response->status().' '.$response->body());
        }

        // Join all text parts (skipping any "thought" parts) into one string.
        $text = '';
        foreach ($response->json('candidates.0.content.parts', []) as $part) {
            if (empty($part['thought']) && isset($part['text'])) {
                $text .= $part['text'];
            }
        }

        if ($text === '') {
            $reason = $response->json('candidates.0.finishReason') ?? $response->json('promptFeedback.blockReason') ?? 'unknown';
            throw new RuntimeException("Gemini returned no text (reason: {$reason}).");
        }

        return $text;
    }

    /**
     * Anthropic Claude (paid, pay-as-you-go).
     */
    private function askClaude(string $prompt): string
    {
        $response = Http::withHeaders([
            'x-api-key' => config('services.anthropic.key'),
            'anthropic-version' => '2023-06-01',
        ])
            ->connectTimeout(15)
            ->timeout(150)
            ->post('https://api.anthropic.com/v1/messages', [
                'model' => config('services.anthropic.model'),
                'max_tokens' => 4000,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Claude request failed: '.$response->status().' '.$response->body());
        }

        return (string) $response->json('content.0.text', '');
    }

    /**
     * Turn the AI's reply into an array, coping with code fences, stray text
     * and replies that are just a list of questions.
     */
    private function extractJson(string $text): array
    {
        // Remove ```json ... ``` fences if the model added them.
        $clean = trim(preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($text)));

        // 1. Try the whole reply as JSON.
        $data = json_decode($clean, true);

        // 2. Otherwise, try the part between the first { and the last }.
        if (! is_array($data)) {
            $start = strpos($clean, '{');
            $end = strrpos($clean, '}');
            if ($start !== false && $end !== false && $end > $start) {
                $data = json_decode(substr($clean, $start, $end - $start + 1), true);
            }
        }

        if (! is_array($data)) {
            throw new RuntimeException('AI reply was not valid JSON.');
        }

        // A bare list of questions: wrap it in the expected shape.
        if (array_is_list($data)) {
            $data = ['title' => 'Quiz', 'questions' => $data];
        }

        return $data;
    }

    /**
     * Keep only well-formed questions so a bad AI reply can't break the app.
     */
    private function validate(array $data): array
    {
        $questions = [];

        foreach ($data['questions'] ?? [] as $q) {
            if (! is_array($q)) {
                continue;
            }

            $options = $q['options'] ?? null;
            $correct = $q['correct_index'] ?? null;

            // Accept "2" as well as 2.
            if (is_string($correct) && ctype_digit($correct)) {
                $correct = (int) $correct;
            }

            if (
                ! is_string($q['question'] ?? null)
                || ! is_array($options) || count($options) !== 4
                || ! is_int($correct) || $correct < 0 || $correct > 3
            ) {
                continue;
            }

            $questions[] = [
                'question' => trim($q['question']),
                'options' => array_map(fn ($o) => trim((string) $o), array_values($options)),
                'correct_index' => $correct,
                'explanation' => trim((string) ($q['explanation'] ?? '')),
            ];
        }

        if ($questions === []) {
            throw new RuntimeException('AI reply had no usable questions.');
        }

        return [
            'title' => mb_substr(trim((string) ($data['title'] ?? 'Untitled quiz')), 0, 120) ?: 'Untitled quiz',
            'questions' => $questions,
        ];
    }
}