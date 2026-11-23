export default function HeroArtwork() {
  return (
    <div className="hero-artwork" aria-hidden="true">
      <div className="hero-artwork__halo" />
      <svg className="hero-artwork__svg" viewBox="0 0 640 520" fill="none">
        <defs>
          <linearGradient id="frameMetal" x1="160" y1="80" x2="480" y2="430" gradientUnits="userSpaceOnUse">
            <stop stopColor="#61747a" /><stop offset=".42" stopColor="#253237" /><stop offset="1" stopColor="#0b1012" />
          </linearGradient>
          <linearGradient id="copperFace" x1="270" y1="178" x2="405" y2="344" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffb17d" /><stop offset=".52" stopColor="#e36414" /><stop offset="1" stopColor="#7f3512" />
          </linearGradient>
          <linearGradient id="tealFace" x1="212" y1="166" x2="365" y2="318" gradientUnits="userSpaceOnUse">
            <stop stopColor="#53a3a4" /><stop offset="1" stopColor="#0f4c5c" />
          </linearGradient>
          <radialGradient id="heroGlow" cx="0" cy="0" r="1" gradientTransform="matrix(0 210 -275 0 326 274)" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f4c5c" stopOpacity=".56" /><stop offset="1" stopColor="#0f4c5c" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="326" cy="282" rx="268" ry="205" fill="url(#heroGlow)" />
        <ellipse cx="320" cy="429" rx="216" ry="41" fill="#06090a" fillOpacity=".55" />
        <path d="M93 394 320 272l231 123-230 123L93 394Z" fill="#171c1f" stroke="#68767a" strokeOpacity=".46" />
        <path d="m125 394 195-103 194 103-194 104-195-104Z" stroke="#0f4c5c" strokeOpacity=".45" />
        <path d="m160 394 160-85 160 85-160 86-160-86Zm-35 0 195 104m-160-104 160 86m-125-86 125 67m-90-67 90 48m-55-48 55 29m35-29-55 29m90-48-90 48m125-67-125 67m160-86-160 86" stroke="#89969a" strokeOpacity=".23" strokeWidth="1" />
        <path d="M174 359V131c0-9 7-16 16-16h261c9 0 16 7 16 16v228" stroke="url(#frameMetal)" strokeWidth="18" strokeLinecap="round" />
        <path d="M187 145h266M187 145v215m266-215v215" stroke="#9eabad" strokeOpacity=".33" strokeWidth="3" />
        <path d="M188 150h262" stroke="#0c1113" strokeWidth="12" />
        <path d="M279 149v44m81-44v44" stroke="#8b9b9f" strokeWidth="7" strokeLinecap="round" />
        <rect x="291" y="172" width="58" height="33" rx="8" fill="#1a2428" stroke="#7d8b8e" strokeWidth="3" />
        <path d="M318 204v37" stroke="#c9d1d0" strokeWidth="5" strokeLinecap="round" />
        <path d="m311 243 14 0-7 18-7-18Z" fill="#e36414" />
        <path d="M210 365h228" stroke="#a8b3b5" strokeOpacity=".55" strokeWidth="5" />
        <path d="M231 347h186l35 19H196l35-19Z" fill="#2b363a" stroke="#889698" strokeOpacity=".6" />
        <path d="M253 362h143" stroke="#e36414" strokeOpacity=".8" strokeWidth="3" />
        <g filter="drop-shadow(0 15px 17px #030607)">
          <path d="m321 246 57 32v69l-57 33-57-33v-69l57-32Z" fill="#0d333b" stroke="#58a2a4" strokeWidth="4" />
          <path d="m321 246 57 32-57 33-57-33 57-32Z" fill="url(#tealFace)" />
          <path d="m321 311 57-33v69l-57 33v-69Z" fill="url(#copperFace)" />
          <path d="m321 311-57-33v69l57 33v-69Z" fill="#17353a" />
          <path d="m321 260 39 22-39 23-39-23 39-22Z" stroke="#f7a06a" strokeWidth="5" />
          <path d="m321 305 32 18-32 19-32-19 32-18Z" stroke="#e36414" strokeWidth="5" />
          <path d="M321 269v28m0 29v18" stroke="#f9c49e" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g transform="translate(452 266)">
          <ellipse cx="0" cy="0" rx="52" ry="17" fill="#0d1416" stroke="#5b9297" strokeWidth="6" />
          <path d="M-52 0v81c0 10 23 18 52 18s52-8 52-18V0" fill="#14282c" stroke="#47777e" strokeWidth="6" />
          <ellipse cx="0" cy="0" rx="31" ry="10" fill="#11191b" stroke="#e36414" strokeWidth="4" />
          <ellipse cx="0" cy="81" rx="52" ry="17" fill="#1b2e32" stroke="#e36414" strokeWidth="5" />
          <path d="M-52 25c0 10 23 18 52 18s52-8 52-18M-52 50c0 10 23 18 52 18s52-8 52-18" stroke="#e36414" strokeOpacity=".68" strokeWidth="3" />
          <ellipse cx="0" cy="0" rx="15" ry="6" fill="#070b0d" />
        </g>
        <circle cx="176" cy="110" r="4" fill="#e36414" /><circle cx="478" cy="184" r="3" fill="#72b6b1" /><circle cx="494" cy="208" r="2" fill="#f2a16d" />
        <path d="M115 271h38m-19-19v38M483 110h28m-14-14v28" stroke="#7e999c" strokeOpacity=".45" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="hero-artwork__label"><span className="live-dot" /><span>الفكرة بتاخد شكلها</span><strong>طبقة ورا طبقة</strong></div>
      <div className="hero-artwork__floating hero-artwork__floating--top"><span className="mini-swatch mini-swatch--teal" />PLA+ <small>جودة عالية</small></div>
      <div className="hero-artwork__floating hero-artwork__floating--bottom"><span className="mini-cube" /><span><b>تصميمك</b><small>يتحول لمجسم</small></span></div>
    </div>
  );
}
