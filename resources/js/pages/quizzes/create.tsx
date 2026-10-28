import QuizShell, { PrimaryButton } from '@/components/quiz-shell';
import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

export default function QuizCreate() {
    const form = useForm({ notes: '', count: 5 });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/quizzes');
    };

    const chars = form.data.notes.length;

    return (
        <QuizShell title="New quiz">
            <h1 className="mb-2 text-2xl font-bold">Make a quiz from your notes</h1>
            <p className="mb-6 text-stone-600 dark:text-stone-400">
                Paste lecture notes, a textbook section or a summary. The AI will write multiple-choice questions about it.
            </p>

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <textarea
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        rows={14}
                        placeholder="e.g. Photosynthesis happens in the chloroplasts. Light-dependent reactions take place in the thylakoid membranes..."
                        className="w-full rounded-xl border border-stone-300 bg-white p-4 text-sm leading-relaxed outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-stone-700 dark:bg-stone-900"
                        disabled={form.processing}
                    />
                    <div className="mt-1 flex justify-between text-xs">
                        <span className="text-red-600">{form.errors.notes}</span>
                        <span className={chars > 15000 ? 'text-red-600' : 'text-stone-500'}>{chars.toLocaleString()} / 15,000</span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <label className="flex items-center gap-2 text-sm">
                        Number of questions
                        <select
                            value={form.data.count}
                            onChange={(e) => form.setData('count', Number(e.target.value))}
                            className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900"
                            disabled={form.processing}
                        >
                            {[3, 5, 8, 10, 15].map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </label>

                    <PrimaryButton type="submit" disabled={form.processing || chars < 50}>
                        {form.processing ? (
                            <>
                                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                Writing your quiz…
                            </>
                        ) : (
                            'Generate quiz'
                        )}
                    </PrimaryButton>
                </div>

                {form.processing && <p className="text-sm text-stone-500">This usually takes 10–30 seconds.</p>}
                {chars > 0 && chars < 50 && <p className="text-sm text-stone-500">Add a bit more text (at least 50 characters).</p>}
            </form>
        </QuizShell>
    );
}
