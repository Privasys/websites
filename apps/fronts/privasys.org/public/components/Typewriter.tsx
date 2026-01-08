'use client';
import Typewriter from 'typewriter-effect';

export const TypewriterComponent = () => {
    return (
        <Typewriter
            options={{
                strings: ['Privasys'],
                autoStart: true,
                deleteSpeed: 30000000,
                loop: false
            }}
        />
    );
};