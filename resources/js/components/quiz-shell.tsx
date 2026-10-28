import { Head, Link } from '@inertiajs/react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = {
    title: string;
    children: ReactNode;
    action?: ReactNode;
};

/** Simple page frame shared by all Study Buddy pages. */
export default function QuizShell({ title, children, action }: Props) {
    return (
        <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
            <Head title={title} />
            <header className="border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-900/80">
                <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
                    <Link href="/quizzes" className="flex items-center gap-2 font-semibold">
                        <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">SB</span>
                        Study Buddy
                    </Link>
                    {action}
                </div>
            </header>
            <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        </div>
    );
}

export function PrimaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={`inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        />
    );
}
