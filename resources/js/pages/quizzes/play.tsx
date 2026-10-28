import QuizShell, { PrimaryButton } from '@/components/quiz-shell';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

type Question = { id: number; question: string; options: string[] };
type Props = { quiz: { id: number; title: string; questions: Question[] } };

const LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizPlay({ quiz }: Props) {
    const [current, setCurrent] = useState(0);
    const form = useForm<{ answers: Record<number, number> }>({ answers: {} });

    const question = quiz.questions[current];
    const total = quiz.questions.length;
    const answeredCount = Object.keys(form.data.answers).length;
    const chosen = form.data.answers[question.id];
    const isLast = current === total - 1;

    const choose = (index: number) => {
        form.setData('answers', { ...form.data.answers, [question.id]: index });
    };

    const submit = () => {
        if (answeredCount < total && !confirm(`You've answered ${answeredCount} of ${total}. Submit anyway?`)) {
            return;
        }
        form.post(`/quizzes/${quiz.id}/submit`);
    };

    return (
        <QuizShell title={quiz.title}>
            <h1 className="mb-1 text-xl font-bold">{quiz.title}</h1>
            <p className="mb-4 text-sm text-stone-500">
                Question {current + 1} of {total} · {answeredCount} answered
            </p>

            {/* progress bar */}
            <div className="mb-8 h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
                <div className="h-full bg-indigo-600 transition-all" style={{ width: `${((current + 1) / total) * 100}%` }} />
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
                <h2 className="mb-6 text-lg font-medium leading-snug">{question.question}</h2>

                <div className="space-y-3">
                    {question.options.map((option, i) => {
                        const selected = chosen === i;
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => choose(i)}
                                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${
                                    selected
                                        ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/20 dark:bg-indigo-950'
                                        : 'border-stone-200 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-500'
                                }`}
                            >
                                <span
                                    className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                                        selected ? 'bg-indigo-600 text-white' : 'bg-stone-100 dark:bg-stone-800'
                                    }`}
                                >
                                    {LETTERS[i]}
                                </span>
                                <span className="pt-0.5">{option}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setCurrent((c) => c - 1)}
                    disabled={current === 0}
                    className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-200 disabled:invisible dark:hover:bg-stone-800"
                >
                    ← Back
                </button>

                {isLast ? (
                    <PrimaryButton onClick={submit} disabled={form.processing || answeredCount === 0}>
                        {form.processing ? 'Checking…' : 'Submit answers'}
                    </PrimaryButton>
                ) : (
                    <PrimaryButton onClick={() => setCurrent((c) => c + 1)} disabled={chosen === undefined}>
                        Next →
                    </PrimaryButton>
                )}
            </div>
        </QuizShell>
    );
}
