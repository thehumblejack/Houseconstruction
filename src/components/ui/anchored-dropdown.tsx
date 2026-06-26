'use client';

import { ReactNode, useEffect, useLayoutEffect, useRef, useState, CSSProperties } from 'react';
import { createPortal } from 'react-dom';

interface AnchoredDropdownProps {
    /** The element the dropdown should be positioned under (e.g. the search input). */
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    /** Optional fixed width; defaults to the anchor's width (min 240px). */
    width?: number;
    /** Max height of the scroll area. */
    maxHeight?: number;
}

/**
 * Renders a dropdown in a portal with fixed positioning anchored to `anchorEl`.
 * This lets autocomplete menus escape `overflow:auto` containers (e.g. modal
 * bodies) instead of being clipped. Repositions on scroll/resize, flips up when
 * there isn't room below, and closes on outside click — while still allowing
 * typing in the anchor input and clicking items inside the menu.
 */
export function AnchoredDropdown({ anchorEl, open, onClose, children, width, maxHeight = 260 }: AnchoredDropdownProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [rect, setRect] = useState<DOMRect | null>(null);

    useLayoutEffect(() => {
        if (!open || !anchorEl) return;
        const update = () => setRect(anchorEl.getBoundingClientRect());
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [open, anchorEl]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (menuRef.current?.contains(t)) return;
            if (anchorEl?.contains(t)) return;
            onClose();
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open, anchorEl, onClose]);

    if (!open || !anchorEl || !rect || typeof document === 'undefined') return null;

    const w = Math.max(width ?? rect.width, 240);
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < maxHeight + 24 && rect.top > spaceBelow;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8));

    const style: CSSProperties = {
        position: 'fixed',
        left,
        width: w,
        zIndex: 300,
        maxHeight,
        ...(flipUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    };

    return createPortal(
        <div
            ref={menuRef}
            style={style}
            className="overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl no-scrollbar"
        >
            {children}
        </div>,
        document.body
    );
}

export default AnchoredDropdown;
