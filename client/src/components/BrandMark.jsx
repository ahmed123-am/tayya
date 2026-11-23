export default function BrandMark({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="علامة طية">
      <path d="M24 2 43 13v22L24 46 5 35V13L24 2Z" fill="#0f4c5c" />
      <path d="m24 2 19 11-19 11L5 13 24 2Z" fill="#1f6a73" />
      <path d="m24 24 19-11v22L24 46V24Z" fill="#e36414" />
      <path d="m24 24-19-11v22l19 11V24Z" fill="#123b44" />
      <path d="m24 10 10 6-10 6-10-6 10-6Z" fill="#1e2022" stroke="#f8f9fa" strokeOpacity=".82" strokeWidth="1.5" />
      <path d="m24 22 10-6v12l-10 6V22Z" fill="#f0a26f" />
      <path d="m24 22-10-6v12l10 6V22Z" fill="#0f4c5c" stroke="#d2e1e2" strokeOpacity=".7" strokeWidth="1" />
    </svg>
  );
}
