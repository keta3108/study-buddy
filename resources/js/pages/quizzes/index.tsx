import QuizShell from '@/components/quiz-shell';
import { Link, router } from '@inertiajs/react';

type QuizRow = {
    id: number;
    title: string;
    question_count: number;
    best_score: number | null;
    created_at: string;
};

export default function QuizIndex({ quizzes }: { quizzes: QuizRow[] }) {
    const remove = (quiz: QuizRow) => {
        if (confirm(`Delete "${quiz.title}"?`)) {
            router.delete(`/quizzes/${quiz.id}`);
        }
    };

    return (
        <QuizShell
            title="My quizzes"
            action={
                <Link href="/quizzes/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
                    + New quiz
                </Link>
            }
        >
            <h1 className="mb-6 text-2xl font-bold">My quizzes</h1>

            {quizzes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
                    <p className="mb-4 text-stone-600 dark:text-stone-400">
                        No quizzes yet. Paste your study notes and the AI will turn them into a quiz.
                    </p>
                    <Link href="/quizzes/new" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                        Create your first quiz →
                    </Link>
                </div>
            ) : (
                <ul className="space-y-3">
                    {quizzes.map((quiz) => (
                        <li
                            key={quiz.id}
                            className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
                        >
                            <div className="min-w-0">
                                <Link href={`/quizzes/${quiz.id}`} className="block truncate font-medium hover:text-indigo-600">
                                    {quiz.title}
                                </Link>
                                <p className="text-sm text-stone-500">
                                    {quiz.question_count} questions · {quiz.created_at}
                                    {quiz.best_score !== null && ` · best ${quiz.best_score}/${quiz.question_count}`}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <Link
                                    href={`/quizzes/${quiz.id}`}
                                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                                >
                                    Play
                                </Link>
                                <button onClick={() => remove(quiz)} className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </QuizShell>
    );
}
