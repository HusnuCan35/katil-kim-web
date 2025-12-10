import { useCallback } from 'react';

export const useSound = () => {
    const playSound = useCallback((type: 'click' | 'success' | 'error' | 'hover') => {
        // In a real app, we would load actual audio files.
        // For now, we'll use a simple implementation that can be easily expanded.
        // Since we don't have audio files, we will just log to console for debugging
        // or try to use some public URLs if we were sure they exist.
        // Best practice here is to expect files in /public/sounds/

        const sounds = {
            click: '/sounds/click.mp3',
            success: '/sounds/success.mp3',
            error: '/sounds/error.mp3',
            hover: '/sounds/hover.mp3'
        };

        const audio = new Audio(sounds[type]);
        audio.volume = 0.5;

        // Catch errors if files don't exist to prevent console spam
        audio.play().catch(e => {
            // console.log('Audio file missing:', sounds[type]);
        });
    }, []);

    return { playSound };
};
