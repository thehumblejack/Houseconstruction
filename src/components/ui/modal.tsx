'use client';

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<ModalSize, string> = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-2xl',
};

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    footer?: ReactNode;
    size?: ModalSize;
    children: ReactNode;
    hideClose?: boolean;
    /** Disable closing on overlay click / Esc (e.g. destructive confirmations) */
    persistent?: boolean;
}

/**
 * Shared modal primitive — modern, minimal, mobile-first.
 * - Mobile: bottom sheet (slides up, rounded top, grab handle).
 * - Desktop: centered card.
 * Put the form/content as `children`; put action buttons in `footer`.
 */
export function Modal({
    open,
    onClose,
    title,
    description,
    icon,
    footer,
    size = 'md',
    children,
    hideClose,
    persistent,
}: ModalProps) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !persistent) onClose();
        };
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose, persistent]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center font-jakarta">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={persistent ? undefined : onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                className={`relative flex w-full ${sizes[size]} max-h-[92vh] flex-col rounded-t-3xl border border-slate-200 bg-white shadow-xl animate-in slide-in-from-bottom-4 duration-200 sm:max-h-[88vh] sm:rounded-2xl sm:zoom-in-95`}
            >
                {/* Mobile grab handle */}
                <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-slate-200 sm:hidden" />

                {(title || !hideClose) && (
                    <div className="flex items-start gap-3 px-4 pb-3 pt-3 sm:px-5 sm:pt-5 sm:pb-4 border-b border-slate-100">
                        {icon && <div className="shrink-0">{icon}</div>}
                        <div className="min-w-0 flex-1">
                            {title && (
                                <h2 className="text-base font-semibold leading-tight tracking-tight text-slate-900">
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{description}</p>
                            )}
                        </div>
                        {!hideClose && (
                            <button
                                onClick={onClose}
                                aria-label="Fermer"
                                className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>

                {footer && (
                    <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-4 py-3.5 sm:px-5 sm:py-4">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Modal;
