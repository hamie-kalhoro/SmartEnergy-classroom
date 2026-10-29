import React, { useRef } from 'react';

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

// Label every tick when there are few, otherwise pick a round interval (≤ 10 labels)
function tickValues(min, max, labelEvery) {
    const span = max - min;
    const every = labelEvery || NICE_STEPS.find(s => span / s <= 10) || span;
    const ticks = [];
    for (let v = min; v <= max; v += every) ticks.push(v);
    const last = ticks[ticks.length - 1];
    if (last !== max) {
        // Keep the end value labelled, dropping a neighbour that would collide with it
        if (max - last < every * 0.6) ticks.pop();
        ticks.push(max);
    }
    return ticks;
}

/**
 * Discrete slider with a numbered scale. Drag the thumb or track, click a number,
 * or use the keyboard (arrows, PageUp/PageDown, Home/End).
 */
function NumberedSlider({
    value, min = 0, max, step = 1, onChange, label, unit = '',
    labelEvery, disabled = false, tone = 'primary', formatValue
}) {
    const trackRef = useRef(null);
    const span = Math.max(max - min, 1);
    const pct = v => ((v - min) / span) * 100;
    const clamp = v => Math.min(max, Math.max(min, v));
    const snap = v => clamp(Math.round((v - min) / step) * step + min);
    const ticks = tickValues(min, max, labelEvery);
    const showDots = span / step <= 16;

    const valueFromPointer = (event) => {
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        return snap(min + ratio * span);
    };

    const commit = (next) => {
        if (!disabled && next !== value) onChange(next);
    };

    const handlePointerDown = (event) => {
        if (disabled) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        commit(valueFromPointer(event));
    };

    const handlePointerMove = (event) => {
        if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        commit(valueFromPointer(event));
    };

    const handleKeyDown = (event) => {
        const big = Math.max(step, Math.round(span / 10 / step) * step);
        const moves = {
            ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step,
            PageUp: big, PageDown: -big
        };
        if (event.key in moves) commit(snap(value + moves[event.key]));
        else if (event.key === 'Home') commit(min);
        else if (event.key === 'End') commit(max);
        else return;
        event.preventDefault();
    };

    const display = formatValue ? formatValue(value) : `${value}${unit}`;

    return (
        <div className={`nslider tone-${tone} ${disabled ? 'disabled' : ''}`} style={{ '--nslider-pct': `${pct(value)}%` }}>
            <div
                className="nslider-track"
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
            >
                <div className="nslider-rail" />
                <div className="nslider-fill" />
                {showDots && Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => min + i * step).map(v => (
                    <span key={v} className={`nslider-dot ${v <= value ? 'on' : ''}`} style={{ left: `${pct(v)}%` }} />
                ))}
                <div
                    className="nslider-thumb"
                    role="slider"
                    tabIndex={disabled ? -1 : 0}
                    aria-label={label}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={value}
                    aria-valuetext={display}
                    aria-disabled={disabled}
                    onKeyDown={handleKeyDown}
                />
            </div>
            <div className="nslider-scale" aria-hidden="true">
                {ticks.map(v => (
                    <button
                        key={v}
                        type="button"
                        tabIndex={-1}
                        className={v === value ? 'current' : ''}
                        style={{ left: `${pct(v)}%` }}
                        onClick={() => commit(v)}
                        disabled={disabled}
                    >
                        {v}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default NumberedSlider;
