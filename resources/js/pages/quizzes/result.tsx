import QuizShell from '@/components/quiz-shell';
import { Link } from '@inertiajs/react';

type ReviewItem = {
    id: number;
    question: string;
    options: string[];
    correct_index: number;
    chosen_index: number | null;
    explanation: string | null;
};

type Props = {
    attempt: { id: number; score: number; total: number };
    quiz: { id: number; title: string };
    review: ReviewItem[];
};

const LETTERS = ['A', 'B', 'C', 'D'];

function message(percent: number) {
    if (percent === 100) return 'Perfect score! 🎉';
    if (percent >= 80) return 'Great job!';
    if (percent >= 50) return 'Good effort, review the ones you missed.';
    return 'Keep going, read the explanations and try again.';
}

export default function QuizResult({ attempt, quiz, review }: Props) {
    const percent = attempt.total ? Math.round((attempt.score / attempt.total) * 100) : 0;

    return (
        <QuizShell title={`Results · ${quiz.title}`}>
            <div className="mb-8 rounded-2xl bg-indigo-600 p-8 text-center text-white">
                <p className="text-sm opacity-80">{quiz.title}</p>
                <p className="my-2 text-5xl font-bold">
                    {attempt.score}/{attempt.total}
                </p>
                <p className="text-lg">{message(percent)}</p>
                <div className="mt-6 flex justify-center gap-3">
                    <Link href={`/quizzes/${quiz.id}`} className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                        Try again
                    </Link>
                    <Link href="/quizzes" className="rounded-lg border border-white/40 px-4 py-2 text-sm font-medium hover:bg-white/10">
                        All quizzes
                    </Link>
                </div>
            </div>

            <h2 className="mb-4 text-lg font-semibold">Review</h2>
            <ol className="space-y-4">
                {review.map((item, n) => {
                    const correct = item.chosen_index === item.correct_index;
                    return (
                        <li key={item.id} className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                            <div className="mb-3 flex items-start gap-2">
                                <span className={`mt-0.5 text-sm font-bold ${correct ? 'text-green-600' : 'text-red-600'}`}>{correct ? '✓' : '✗'}</span>
                                <p className="font-medium">
                                    {n + 1}. {item.question}
                                </p>
                            </div>

                            <ul className="mb-3 space-y-1.5 text-sm">
                                {item.options.map((opt, i) => {
                                    const isCorrect = i === item.correct_index;
                                    const isChosen = i === item.chosen_index;
                                    let style = 'text-stone-600 dark:text-stone-400';
                                    if (isCorrect) style = 'bg-green-50 text-green-800 font-medium dark:bg-green-950 dark:text-green-300';
                                    else if (isChosen) style = 'bg-red-50 text-red-800 line-through dark:bg-red-950 dark:text-red-300';
                                    return (
                                        <li key={i} className={`rounded-lg px-3 py-1.5 ${style}`}>
                                            {LETTERS[i]}. {opt}
                                            {isChosen && <span className="ml-2 text-xs no-underline opacity-70">(your answer)</span>}
                                        </li>
                                    );
                                })}
                            </ul>

                            {item.chosen_index === null && <p className="mb-2 text-sm text-amber-600">You skipped this one.</p>}
                            {item.explanation && (
                                <p className="rounded-lg bg-stone-100 p-3 text-sm dark:bg-stone-800">
                                    <span className="font-semibold">Why: </span>
                                    {item.explanation}
                                </p>
                            )}
                        </li>
                    );
                })}
            </ol>
        </QuizShell>
    );
}
