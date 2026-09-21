import { useEffect, useRef, useState } from 'react';

const OTP_LENGTH = 6;

const sanitizeOtp = (value = '', length = OTP_LENGTH) =>
    value.normalize('NFKC').replace(/\D/gu, '').slice(0, length);

/**
 * OTP field backed by one native input.
 *
 * Keeping a single input prevents Vietnamese IMEs from losing or duplicating
 * characters when focus would otherwise jump between six separate inputs.
 * The six boxes below are presentation only; Form still receives one string.
 */
const OtpInput = ({
    value = '',
    onChange,
    onBlur,
    disabled = false,
    autoFocus = false,
    length = OTP_LENGTH,
    id,
    'aria-invalid': ariaInvalid,
}) => {
    const inputRef = useRef(null);
    const isComposingRef = useRef(false);
    const externalValue = sanitizeOtp(value, length);
    const lastEmittedValueRef = useRef(externalValue);
    const [draftValue, setDraftValue] = useState(externalValue);
    const [isFocused, setIsFocused] = useState(false);
    const [selectionIndex, setSelectionIndex] = useState(externalValue.length);
    const digits = sanitizeOtp(draftValue, length);

    useEffect(() => {
        if (!isComposingRef.current) {
            lastEmittedValueRef.current = externalValue;
            setDraftValue(externalValue);
            setSelectionIndex(externalValue.length);
        }
    }, [externalValue]);

    useEffect(() => {
        if (!autoFocus || disabled) return undefined;

        const focusTimer = window.setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(externalValue.length, externalValue.length);
        }, 0);

        return () => window.clearTimeout(focusTimer);
    }, [autoFocus, disabled, externalValue.length]);

    const syncSelection = (input = inputRef.current) => {
        const nextIndex = Math.min(input?.selectionStart ?? digits.length, length);
        setSelectionIndex(nextIndex);
    };

    const commit = (rawValue) => {
        const nextValue = sanitizeOtp(rawValue, length);
        setDraftValue(nextValue);
        setSelectionIndex(nextValue.length);

        if (nextValue !== lastEmittedValueRef.current) {
            lastEmittedValueRef.current = nextValue;
            onChange?.(nextValue);
        }
    };

    const handleChange = (event) => {
        const rawValue = event.currentTarget.value;
        setDraftValue(rawValue);

        if (!event.nativeEvent?.isComposing && !isComposingRef.current) {
            commit(rawValue);
        }
    };

    const handleCompositionStart = () => {
        isComposingRef.current = true;
    };

    const handleCompositionEnd = (event) => {
        isComposingRef.current = false;
        commit(event.currentTarget.value);
    };

    const handlePointerDown = (event) => {
        if (disabled) return;

        const bounds = event.currentTarget.getBoundingClientRect();
        const relativeX = Math.max(0, Math.min(event.clientX - bounds.left, bounds.width));
        const requestedIndex = Math.floor((relativeX / bounds.width) * length);
        const caretIndex = Math.min(requestedIndex, digits.length);

        window.requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(caretIndex, caretIndex);
            setSelectionIndex(caretIndex);
        });
    };

    const activeIndex = Math.min(selectionIndex, length - 1);

    return (
        <div
            className="relative grid w-full grid-cols-6 gap-2"
            role="group"
            aria-label={`Mã OTP gồm ${length} chữ số`}
            onPointerDown={handlePointerDown}
        >
            <input
                ref={inputRef}
                id={id}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={draftValue}
                disabled={disabled}
                autoComplete="one-time-code"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="done"
                aria-label={`Mã OTP gồm ${length} chữ số`}
                aria-invalid={ariaInvalid}
                className="absolute inset-0 z-10 size-full cursor-text opacity-0 disabled:cursor-not-allowed"
                onChange={handleChange}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                onFocus={(event) => {
                    setIsFocused(true);
                    syncSelection(event.currentTarget);
                }}
                onBlur={(event) => {
                    setIsFocused(false);
                    onBlur?.(event);
                }}
                onSelect={(event) => syncSelection(event.currentTarget)}
            />

            {Array.from({ length }, (_, index) => (
                <span
                    key={index}
                    aria-hidden="true"
                    className={`pointer-events-none flex h-12 min-w-0 items-center justify-center rounded-xl border bg-white font-['JetBrains_Mono'] text-[20px] font-bold leading-none text-[#0f1c2e] transition ${
                        isFocused && index === activeIndex
                            ? 'border-[#6daed4] ring-3 ring-[#6daed4]/15'
                            : 'border-[#e5e8f0]'
                    } ${disabled ? 'bg-slate-50 text-slate-400' : ''}`}
                >
                    {digits[index] || ''}
                </span>
            ))}
        </div>
    );
};

export default OtpInput;
