/**
 * Marks for the platforms PulseTrack installs on.
 *
 * Drawn inline rather than loaded as images: no extra requests, crisp at any
 * size, and they inherit the page's colour handling. Each is rendered in its
 * own brand colour next to the product name — the standard lockup for an
 * integrations strip, and nominative use of the name, not a claim of
 * partnership or endorsement.
 */

type MarkProps = { className?: string };

const S = "h-[22px] w-[22px] shrink-0";

function NextjsMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#000" />
      <path
        d="M8.2 7.1v9.8"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
      <path d="M8.2 7.1 L17.4 19.2" stroke="#fff" strokeWidth="1.5" />
      <path
        d="M15.6 7.1v6.1"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

function ReactMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="-12 -12 24 24" className={className} aria-hidden="true">
      <circle r="2.05" fill="#61DAFB" />
      <g stroke="#61DAFB" strokeWidth="1" fill="none">
        <ellipse rx="11" ry="4.2" />
        <ellipse rx="11" ry="4.2" transform="rotate(60)" />
        <ellipse rx="11" ry="4.2" transform="rotate(120)" />
      </g>
    </svg>
  );
}

function WordPressMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="none" stroke="#21759B" strokeWidth="1.6" />
      <path
        d="M4.6 8.6 L8.7 18.4 L11 11.6 L13.2 18.4 L17.3 8.6"
        fill="none"
        stroke="#21759B"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShopifyMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {/* Bag body */}
      <path
        d="M5.1 6.9 L18.4 5.6 L20.4 20.3 L11.2 22.4 L3 20.1 Z"
        fill="#95BF47"
      />
      <path d="M18.4 5.6 L20.4 20.3 L11.2 22.4 L11.9 5.9 Z" fill="#5E8E3E" />
      {/* Handle */}
      <path
        d="M9.1 7.4 V5.6 a2.6 2.6 0 0 1 5.2 0 V7"
        fill="none"
        stroke="#fff"
        strokeWidth="1.3"
      />
      <path
        d="M14.1 11.2a2.9 2.9 0 0 0-1.9-.7c-1.5 0-2.3.9-2.3 2 0 1.9 2.6 1.7 2.6 2.8 0 .4-.3.7-.9.7a3 3 0 0 1-1.8-.7"
        fill="none"
        stroke="#fff"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WebflowMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#4353FF" />
      <path
        d="M18.8 7.3 16.35 15.1h-2.1l-1.02-3.62h-.05L12.1 15.1h-2.1L7.6 7.3h1.98l1.05 3.9h.04l1.1-3.9h1.86l1.12 3.94h.04l1.06-3.94z"
        fill="#fff"
      />
    </svg>
  );
}

function FramerMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 1.5h14v7.5h-7z" fill="#0055FF" />
      <path d="M5 9h14l-7 7.5H5z" fill="#0055FF" opacity="0.75" />
      <path d="M5 16.5h7v7.5z" fill="#0055FF" opacity="0.5" />
    </svg>
  );
}

function StripeMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#635BFF" />
      <path
        d="M11.72 9.86c0-.55.46-.77 1.19-.77 1.06 0 2.4.32 3.46.9V6.72a9.1 9.1 0 0 0-3.46-.64c-2.83 0-4.71 1.48-4.71 3.95 0 3.86 5.3 3.23 5.3 4.9 0 .65-.57.86-1.35.86-1.15 0-2.63-.48-3.8-1.11v3.31c1.3.56 2.6.79 3.8.79 2.9 0 4.9-1.44 4.9-3.94 0-4.16-5.33-3.42-5.33-4.98z"
        fill="#fff"
      />
    </svg>
  );
}

function VercelMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3 L22.4 21 H1.6 Z" fill="#000" />
    </svg>
  );
}

function GhostMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#15171A" />
      <g fill="#fff">
        <rect x="5.6" y="7.4" width="7" height="2.2" rx="1.1" />
        <rect x="14.1" y="7.4" width="4.3" height="2.2" rx="1.1" />
        <rect x="5.6" y="11.1" width="12.8" height="2.2" rx="1.1" />
        <rect x="5.6" y="14.8" width="8.6" height="2.2" rx="1.1" />
      </g>
    </svg>
  );
}

function AstroMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M9.4 2.6h5.2l3.6 18.8-6.2-3.1-6.2 3.1z"
        fill="#17191E"
      />
      <path
        d="M8 15.4c1 .9 2.4 1.4 4 1.4s3-.5 4-1.4c.3 1-.1 2.3-1.1 3.1-.8.7-1.8 1-2.9 1s-2.1-.3-2.9-1c-1-.8-1.4-2.1-1.1-3.1z"
        fill="#FF5D01"
      />
    </svg>
  );
}

function SquarespaceMark({ className = S }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill="none" stroke="#000" strokeWidth="2.1" strokeLinecap="round">
        <path d="M4.2 13.2 9.9 7.5a3.2 3.2 0 0 1 4.5 0" />
        <path d="M9.6 17.8l5.7-5.7a3.2 3.2 0 0 1 4.5 0" />
        <path d="M7.1 10.3l5.7 5.7" />
      </g>
    </svg>
  );
}

export interface Integration {
  name: string;
  Mark: (p: MarkProps) => React.ReactElement;
}

export const INTEGRATIONS: Integration[] = [
  { name: "Next.js", Mark: NextjsMark },
  { name: "WordPress", Mark: WordPressMark },
  { name: "Shopify", Mark: ShopifyMark },
  { name: "Webflow", Mark: WebflowMark },
  { name: "Framer", Mark: FramerMark },
  { name: "React", Mark: ReactMark },
  { name: "Stripe", Mark: StripeMark },
  { name: "Astro", Mark: AstroMark },
  { name: "Ghost", Mark: GhostMark },
  { name: "Squarespace", Mark: SquarespaceMark },
  { name: "Vercel", Mark: VercelMark },
];
