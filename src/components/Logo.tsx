export default function Logo({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Book shape */}
      <rect x="4" y="6" width="24" height="20" rx="2" className="fill-primary/10 stroke-primary" strokeWidth="1.5" />
      <line x1="16" y1="6" x2="16" y2="26" className="stroke-primary" strokeWidth="1.5" />
      {/* Clock on book */}
      <circle cx="22" cy="10" r="5" className="fill-background stroke-primary" strokeWidth="1.5" />
      <line x1="22" y1="10" x2="22" y2="7.5" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="22" y1="10" x2="24" y2="10" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" />
      {/* S letter */}
      <path
        d="M9 13.5C9 12.5 9.8 11.5 11 11.5C12.2 11.5 13 12.3 13 13.2C13 14.5 9 14.5 9 16.8C9 17.7 9.8 18.5 11 18.5C12.2 18.5 13 17.5 13 17.5"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}