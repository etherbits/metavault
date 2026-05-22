type MetaIconProps = {
  className?: string;
  title?: string;
};

export function MetaIcon({ className }: MetaIconProps) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Metavault logo"
      className={className}
    >
      <path
        d="M0 6C0 2.68629 2.68629 0 6 0H22C25.3137 0 28 2.68629 28 6V22C28 25.3137 25.3137 28 22 28H6C2.68629 28 0 25.3137 0 22V6Z"
        fill="#27272A"
      />
      <path
        d="M9.73333 7L9.5 12.75L14 19L18.5 12.75L18.2667 7L14 17.0161L9.73333 7Z"
        fill="#EAB308"
      />
      <path
        d="M18.5 21L22 19.5L21.3143 7H18.2667L18.5 12.75V21Z"
        fill="#FACC15"
      />
      <path
        d="M6 19.5L9.25 21L9.5 12.75L9.73333 7H6.68571L6 19.5Z"
        fill="#FACC15"
      />
    </svg>
  );
}
