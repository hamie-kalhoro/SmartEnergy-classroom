import React, { useEffect, useState, useRef } from 'react';
import './CustomCursor.css';

const CustomCursor = () => {
    // We use refs for direct DOM manipulation to ensure high performance (60fps) without React render overhead
    const cursorRef = useRef(null);
    const dotRef = useRef(null);

    useEffect(() => {
        const cursor = cursorRef.current;
        const dot = dotRef.current;

        if (!cursor || !dot) return;

        const onMouseMove = (e) => {
            const { clientX, clientY } = e;
            // Direct style update for performance
            cursor.style.left = `${clientX}px`;
            cursor.style.top = `${clientY}px`;

            // Allow dot to lag slightly or move instantly (here instantly to sync)
            dot.style.left = `${clientX}px`;
            dot.style.top = `${clientY}px`;
        };

        const onMouseEnter = () => {
            cursor.classList.add('hovered');
            dot.classList.add('hovered');
        };

        const onMouseLeave = () => {
            cursor.classList.remove('hovered');
            dot.classList.remove('hovered');
        };

        // Attach global listener
        window.addEventListener('mousemove', onMouseMove);

        // Attach hover listeners to interactive elements
        const attachListeners = () => {
            const interactiveElements = document.querySelectorAll('a, button, .card, input, select, textarea');
            interactiveElements.forEach(el => {
                el.addEventListener('mouseenter', onMouseEnter);
                el.addEventListener('mouseleave', onMouseLeave);
            });
            return interactiveElements; // return to cleanup
        };

        let interactiveEls = attachListeners();

        // Observer for dynamic content
        const observer = new MutationObserver((mutations) => {
            // Re-attach listeners when DOM changes (simplified approach)
            // Clean up old ones first? No, just adding to new ones is safer if we track them.
            // But actually, simpler is to just let them bubble or use event delegation.
            // For now, re-running attachment on mutations is okay for a prototype.
            interactiveEls.forEach(el => {
                el.removeEventListener('mouseenter', onMouseEnter);
                el.removeEventListener('mouseleave', onMouseLeave);
            });
            interactiveEls = attachListeners();
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            observer.disconnect();
            interactiveEls.forEach(el => {
                el.removeEventListener('mouseenter', onMouseEnter);
                el.removeEventListener('mouseleave', onMouseLeave);
            });
        };
    }, []);

    return (
        <>
            <div ref={cursorRef} className="custom-cursor" />
            <div ref={dotRef} className="custom-cursor-dot" />
        </>
    );
};

export default CustomCursor;
