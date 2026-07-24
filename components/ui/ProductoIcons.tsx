/**
 * Set de íconos de línea minimalistas para la página de producto.
 * SVG a mano (sin librería externa), trazo currentColor para heredar color por className.
 */
export type IconProps = {
  className?: string;
  width?: number;
};

export type IconComponent = (props: IconProps) => React.JSX.Element;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconWrist({ className = "", width = 24 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <rect x="5" y="9" width="14" height="7" rx="3.5" />
      <path d="M9 9V6.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6.5V9" />
      <path d="M9 16v2.5A1.5 1.5 0 0 0 10.5 20h3a1.5 1.5 0 0 0 1.5-1.5V16" />
    </svg>
  );
}

export function IconTap({ className = "", width = 24 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <rect x="7" y="2.5" width="10" height="17" rx="2.2" />
      <path d="M11 16.2h2" />
      <path d="M19.2 8.5c.9 1.1 1.4 2.4 1.4 3.5s-.5 2.4-1.4 3.5" />
      <path d="M21.6 6.3c1.4 1.6 2.1 3.6 2.1 5.7s-.7 4.1-2.1 5.7" />
    </svg>
  );
}

export function IconBook({ className = "", width = 24 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <path d="M4 5.2c0-.9.8-1.6 1.8-1.5C7.6 3.9 9.6 4.5 11 5.8v13.4C9.6 18 7.6 17.3 5.8 17.1c-1-.1-1.8-.9-1.8-1.8V5.2Z" />
      <path d="M20 5.2c0-.9-.8-1.6-1.8-1.5-1.8.2-3.8.8-5.2 2.1v13.4c1.4-1.2 3.4-1.9 5.2-2.1 1-.1 1.8-.9 1.8-1.8V5.2Z" />
    </svg>
  );
}

export function IconBattery0({ className = "", width = 24 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <rect x="2.5" y="8" width="16" height="8" rx="2" />
      <path d="M20.5 10.5v3" />
      <path d="M5 12h6" />
    </svg>
  );
}

export function IconGift({ className = "", width = 24 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <rect x="3.5" y="9.5" width="17" height="11" rx="1.5" />
      <path d="M3.5 13.5h17" />
      <path d="M12 9.5v11" />
      <path d="M12 9.5c-1.6 0-4-1.1-4-3.2A2.3 2.3 0 0 1 10.3 4c1.9 0 2.9 2.7 1.7 5.5Z" />
      <path d="M12 9.5c1.6 0 4-1.1 4-3.2A2.3 2.3 0 0 0 13.7 4c-1.9 0-2.9 2.7-1.7 5.5Z" />
    </svg>
  );
}

export function IconLayout({ className = "", width = 24 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="2.2" />
      <path d="M3.5 9.5h17" />
    </svg>
  );
}

export function IconWifi({ className = "", width = 24 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <path d="M4.5 9.8a12 12 0 0 1 15 0" />
      <path d="M7.5 13.2a8 8 0 0 1 9 0" />
      <path d="M10.5 16.6a4 4 0 0 1 3 0" />
      <circle cx="12" cy="19.3" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCheckCircle({ className = "", width = 24 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3l2.3 2.3 4.7-4.9" />
    </svg>
  );
}

export function IconCheck({ className = "", width = 24 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <path d="M4.5 12.3l4.3 4.3L19.5 6" />
    </svg>
  );
}

export function IconStar({ className = "", width = 16 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={width}
      className={className}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M12 2.7l2.7 5.8 6.3.6-4.7 4.3 1.3 6.2-5.6-3.2-5.6 3.2 1.3-6.2-4.7-4.3 6.3-.6L12 2.7Z" />
    </svg>
  );
}

export function IconTruck({ className = "", width = 20 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <rect x="2" y="7" width="11" height="9" rx="1" />
      <path d="M13 10.3h4l3 3.1V16h-7Z" />
      <circle cx="6" cy="17.7" r="1.6" />
      <circle cx="16.5" cy="17.7" r="1.6" />
    </svg>
  );
}

export function IconShield({ className = "", width = 20 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <path d="M12 3l7 2.5v5.3c0 4.4-2.9 7.9-7 9.2-4.1-1.3-7-4.8-7-9.2V5.5L12 3Z" />
      <path d="M9 12l2.1 2.1L15.2 10" />
    </svg>
  );
}

export function IconRotate({ className = "", width = 20 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <path d="M4 12a8 8 0 1 1 2.6 5.9" />
      <path d="M4 17.5V13h4.5" />
    </svg>
  );
}

export function IconMinus({ className = "", width = 14 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconPlus({ className = "", width = 14 }: IconProps) {
  return (
    <svg {...base} width={width} className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
