'use client';

import { ReactNode, useEffect, useRef } from 'react';
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
        <ModalShell
            onClose={onClose}
            persistent={persistent}
            size={size}
            header={(title || !hideClose) ? (
                <div className="flex items-start gap-3 px-4 pb-3 pt-1.5 sm:px-5 sm:pt-5 sm:pb-4 border-b border-slate-100">
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
                            className="-mr-1 -mt-1 shrink-0 rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:bg-slate-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            ) : null}
            footer={footer}
        >
            {children}
        </ModalShell>
    );
}

// Internal shell: bottom sheet on mobile (with swipe-down-to-close), centered
// card on desktop. Footer actions become full-width and thumb-friendly on mobile.
function ModalShell({
    onClose,
    persistent,
    size,
    header,
    footer,
    children,
}: {
    onClose: () => void;
    persistent?: boolean;
    size: ModalSize;
    header: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
}) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const drag = useRef<{ startY: number; delta: number; active: boolean }>({ startY: 0, delta: 0, active: false });

    // Swipe-down on the handle/header zone to dismiss (mobile only).
    const onTouchStart = (e: React.TouchEvent) => {
        if (persistent) return;
        drag.current = { startY: e.touches[0].clientY, delta: 0, active: true };
        if (sheetRef.current) sheetRef.current.style.transition = 'none';
    };
    const onTouchMove = (e: React.TouchEvent) => {
        if (!drag.current.active) return;
        const delta = Math.max(0, e.touches[0].clientY - drag.current.startY);
        drag.current.delta = delta;
        if (sheetRef.current) sheetRef.current.style.transform = `translateY(${delta}px)`;
    };
    const onTouchEnd = () => {
        if (!drag.current.active) return;
        const { delta } = drag.current;
        drag.current.active = false;
        if (!sheetRef.current) return;
        sheetRef.current.style.transition = 'transform 0.2s ease';
        if (delta > 90) {
            sheetRef.current.style.transform = 'translateY(100%)';
            setTimeout(onClose, 160);
        } else {
            sheetRef.current.style.transform = 'translateY(0px)';
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center font-jakarta">
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={persistent ? undefined : onClose}
            />
            <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                className={`relative flex w-full ${sizes[size]} max-h-[92dvh] flex-col rounded-t-3xl border border-slate-200 bg-white shadow-xl animate-in slide-in-from-bottom-4 duration-200 sm:max-h-[88vh] sm:rounded-2xl sm:zoom-in-95`}
            >
                {/* Mobile grab zone — swipe down to close */}
                <div
                    className="shrink-0 pt-2.5 pb-1 sm:hidden touch-none"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300" />
                </div>

                {header}

                <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">{children}</div>

                {footer && (
                    <div className="border-t border-slate-100 px-4 py-3 sm:px-5 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
                        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 [&>button]:flex-1 [&>a]:flex-1 sm:[&>button]:flex-none sm:[&>a]:flex-none [&>button]:min-h-11 sm:[&>button]:min-h-0">
                            {footer}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Modal;
