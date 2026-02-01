import { useState, useEffect } from 'react';

/**
 * Hook to create a "Typewriter" effect for placeholders.
 * @param {string} fullText The final text to display.
 * @param {boolean} isPassword If true, masks the typed characters with '*' immediately.
 * @param {number} speed Typing speed in milliseconds per character.
 * @param {number} delay Initial start delay in milliseconds.
 * @returns {string} The current placeholder string.
 */
function useTypewriter(fullText, isPassword = false, speed = 100, delay = 0, totalCycle = 0) {
    const [placeholder, setPlaceholder] = useState('');

    useEffect(() => {
        let currentIndex = 0;
        let timeoutId;

        const typeChar = () => {
            if (currentIndex < fullText.length) {
                const char = fullText.charAt(currentIndex);
                setPlaceholder(prev => prev + (isPassword ? '*' : char));
                currentIndex++;
                timeoutId = setTimeout(typeChar, speed);
            } else {
                // Animation completed.
                // If totalCycle is provided, calculate remaining time to sync.
                // Otherwise default to 2s wait.
                let waitTime = 2000;
                if (totalCycle > 0) {
                    const typingDuration = fullText.length * speed;
                    waitTime = totalCycle - typingDuration;
                    if (waitTime < 0) waitTime = 0; // Should not happen if totalCycle is correctly calc
                }

                timeoutId = setTimeout(() => {
                    setPlaceholder('');
                    currentIndex = 0;
                    typeChar();
                }, waitTime);
            }
        };

        // Start the initial typing after the optional initial delay
        timeoutId = setTimeout(typeChar, delay);

        return () => clearTimeout(timeoutId);
    }, [fullText, isPassword, speed, delay, totalCycle]);

    return placeholder;
}

export default useTypewriter;
