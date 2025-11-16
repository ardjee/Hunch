import React from 'react';

interface AbstractBlurredIconProps extends React.SVGProps<SVGSVGElement> {
  primaryColor?: string;
  secondaryColor?: string;
}

const AbstractBlurredIcon: React.FC<AbstractBlurredIconProps> = ({
  primaryColor = "hsl(var(--primary))",
  secondaryColor = "hsl(var(--accent))",
  className,
  ...props
}) => {
  const id = React.useId();
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
      aria-hidden="true"
    >
      <defs>
        <filter id={`blur-${id}`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
        </filter>
      </defs>
      <circle cx="30" cy="30" r="25" fill={primaryColor} opacity="0.7" filter={`url(#blur-${id})`} />
      <rect x="50" y="50" width="40" height="40" rx="10" fill={secondaryColor} opacity="0.6" filter={`url(#blur-${id})`} transform="rotate(15 70 70)" />
      <path d="M20 70 Q 50 40 80 70 T 20 70" stroke={primaryColor} strokeWidth="5" fill="none" opacity="0.5" filter={`url(#blur-${id})`} />
    </svg>
  );
};

export default AbstractBlurredIcon;
