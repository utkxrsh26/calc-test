import React from 'react';

type Props = {
  name?:
    | 'ai'
    | 'doc'
    | 'chart'
    | 'wrench'
    | 'jira'
    | 'list'
    | 'lock'
    | 'check'
    | 'insights'
    | 'cloud'
    | string;
  size?: number;
  className?: string;
  animated?: boolean;
};

export default function FeatureWireframeIcon({ name = 'ai', size = 32, className = '', animated = false }: Props) {
  const animClass = animated ? ' fw-animated' : '';
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `${className || ''}${animClass}`,
  } as any;

  switch (name) {
    case 'ai':
      return (
        <svg {...common}>
          <circle className="fw-ring" cx="12" cy="12" r="9" />
          <path className="fw-hand" d="M12 8v4l3 2" />
        </svg>
      );

    case 'doc':
      return (
        <svg {...common}>
          {/* Zagged arrow path */}
          <path className="fw-zagged-arrow" d="M5 12h4l2-4 2 8 2-4h4" />
          {/* Arrow head */}
          <path className="fw-arrow-head" d="M18 9l3 3-3 3" />
        </svg>
      );

    case 'chart':
      return (
        <svg {...common}>
          <line className="fw-axis" x1="3" y1="21" x2="21" y2="21" />
          <polyline className="fw-graph" points="6 17 10 11 14 14 18 8" />
        </svg>
      );

    case 'wrench':
      return (
        <svg {...common}>
          {/* Light bulb icon - ideas/smart solutions */}
          {/* Bulb glass */}
          <path className="fw-bulb-glass" 
            d="M 12 4 C 9 4 7 6 7 9 C 7 11 8 12.5 9 14 L 15 14 C 16 12.5 17 11 17 9 C 17 6 15 4 12 4 Z" 
            fill="none" 
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Bulb base */}
          <rect className="fw-bulb-base" x="9" y="14" width="6" height="2" rx="0.5" />
          <rect className="fw-bulb-base" x="9.5" y="16" width="5" height="1.5" rx="0.5" />
          <rect className="fw-bulb-base" x="10" y="17.5" width="4" height="1.5" rx="0.5" />
          
          {/* Filament */}
          <path className="fw-bulb-filament" d="M 10.5 9 L 11.5 11 L 12.5 9 L 13.5 11" 
            fill="none" 
            strokeWidth="1.5" 
            strokeLinecap="round"
          />
        </svg>
      );

    case 'jira':
      return (
        <svg {...common}>
          <path className="fw-chain-left" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path className="fw-chain-right" d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );

    case 'list':
      return (
        <svg {...common}>
          <rect className="fw-rect" x="3" y="4" width="18" height="16" rx="2" />
          <path className="fw-lines" d="M8 8h8M8 12h8M8 16h6" />
        </svg>
      );

    case 'lock':
      return (
        <svg {...common}>
          {/* Lock body */}
          <rect className="fw-lock-body" x="5" y="11" width="14" height="9" rx="2" />
          {/* Shackle */}
          <path className="fw-lock-shackle" d="M8 11V8a4 4 0 0 1 8 0v3" />
          {/* Keyhole */}
          <circle className="fw-lock-keyhole" cx="12" cy="15.5" r="1.5" />
          {/* Scanning lines for security effect */}
          <line className="fw-lock-scan" x1="5" y1="13" x2="19" y2="13" opacity="0.6" />
          <line className="fw-lock-scan" x1="5" y1="16" x2="19" y2="16" opacity="0.4" />
        </svg>
      );

    case 'check':
      return (
        <svg {...common}>
          {/* Left hemisphere */}
          <path className="fw-brain-left-hemisphere" d="M12 4c-2.5 0-4.5 1-5.5 2.5C5.5 8 5 9.5 5 11c0 1 .2 2 .7 2.8.4.7 1 1.3 1.8 1.7.5.3 1.1.5 1.8.5h1.2" />
          <path className="fw-brain-left-fold1" d="M7.5 7c.5-.8 1.2-1.5 2-2" />
          <path className="fw-brain-left-fold2" d="M7 10c.3-.5.7-1 1.2-1.3" />
          <path className="fw-brain-left-fold3" d="M7.5 13c.5-.3 1-.5 1.5-.5" />
          
          {/* Right hemisphere */}
          <path className="fw-brain-right-hemisphere" d="M12 4c2.5 0 4.5 1 5.5 2.5 1 1.5 1.5 3 1.5 4.5 0 1-.2 2-.7 2.8-.4.7-1 1.3-1.8 1.7-.5.3-1.1.5-1.8.5h-1.2" />
          <path className="fw-brain-right-fold1" d="M16.5 7c-.5-.8-1.2-1.5-2-2" />
          <path className="fw-brain-right-fold2" d="M17 10c-.3-.5-.7-1-1.2-1.3" />
          <path className="fw-brain-right-fold3" d="M16.5 13c-.5-.3-1-.5-1.5-.5" />
          
          {/* Center connection */}
          <line className="fw-brain-center" x1="12" y1="4" x2="12" y2="16" />
        </svg>
      );

    case 'insights':
      return (
        <svg {...common}>
          <circle className="fw-ring" cx="12" cy="12" r="9" />
          <path className="fw-check" d="M9 12l2 2 4-4" />
        </svg>
      );

    case 'cloud':
      return (
        <svg {...common}>
          {/* Simple cloud shape - matching reference */}
          <path 
            className="fw-cloud-shape" 
            d="M 6 14 Q 6 12 8 11 Q 8 8 11 8 Q 12 6 15 6 Q 18 6 19 9 Q 21 9 21 11.5 Q 21 14 19 14 Z" 
            fill="none" 
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <rect className="fw-rect" x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      );
  }
}
