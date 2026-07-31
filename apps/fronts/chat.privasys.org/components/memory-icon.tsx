// The Memory mark: organic lobes on the left, circuit traces and nodes on the
// right — biology meeting silicon, which is what Drive-as-memory actually is.
//
// Drawn in TWO optical cuts rather than one shape scaled up and down. The
// detailed cut carries three traces; below ~20px those close into a smudge, so
// small sizes get a cut with two traces and a heavier stroke. Same idea,
// redrawn for the size.

export function MemoryIcon({ size = 15 }: { size?: number }) {
    const simplified = size < 20;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {simplified ? (
                <g strokeWidth="1.7">
                    <path d="M11.5 5.4a3 3 0 0 0-4.6 1.6" />
                    <path d="M6.9 7a2.9 2.9 0 0 0-1.3 4.6" />
                    <path d="M5.6 11.6a2.9 2.9 0 0 0 1.8 4.6" />
                    <path d="M7.4 16.2a3 3 0 0 0 4.1 1.9" />
                    <path d="M11.5 5.4v12.7" />
                    <path d="M11.5 9.2h3.2l1.6-1.6" />
                    <path d="M11.5 14.4h3.2l1.6 1.6" />
                    <circle cx="17.8" cy="6.6" r="1.4" />
                    <circle cx="17.8" cy="17" r="1.4" />
                </g>
            ) : (
                <g strokeWidth="1.5">
                    <path d="M12 5.1a2.7 2.7 0 0 0-4.4 1.2" />
                    <path d="M7.6 6.3A2.5 2.5 0 0 0 6.1 9.5" />
                    <path d="M6.1 9.5a2.6 2.6 0 0 0-1 4.2" />
                    <path d="M5.1 13.7a2.6 2.6 0 0 0 1.9 3.7" />
                    <path d="M7 17.4a2.7 2.7 0 0 0 5 .6" />
                    <path d="M12 5.1v13" />
                    <path d="M12 8.3h3l1.7-1.7" />
                    <path d="M12 11.9h4.3" />
                    <path d="M12 15.5h3l1.7 1.7" />
                    <circle cx="18.2" cy="5.5" r="1.3" />
                    <circle cx="18.2" cy="11.9" r="1.3" />
                    <circle cx="18.2" cy="18.3" r="1.3" />
                </g>
            )}
        </svg>
    );
}
