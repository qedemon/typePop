//
//  keymap.js
//  typePop (WebGL)
//
//  원본 Glyph.mm 의 loadDefaultGlyphWithEnFace 에 있던 키보드 배열을 그대로 옮겼다.
//  글리프가 튀어나오는 x 좌표(keyPos)는 실제 맥북 키보드에서 그 키가 있는
//  가로 위치를 클립 좌표 -1..1 로 옮긴 값이다.
//

export const KEYBOARD_WIDTH = 282.0;
export const KEY_WIDTH = 15.5;

const gl = (keyLeft) => (keyLeft / KEYBOARD_WIDTH) * 2.0 - 1.0;

// [행 시작 x, 행 끝 x, [문자셋...]]
// lang: 'en' 은 영문 폰트, 'ko' 는 한글 폰트를 쓴다.
export const ROWS = [
  {
    from: gl(6.0), to: gl(233.5),
    sets: [
      { lang: 'en', keys: '`1234567890-=' },
      { lang: 'en', keys: '~!@#$%^&*()_+' },
      { lang: 'en', keys: '`¡™£¢∞§¶•ªº–≠' },
      { lang: 'en', keys: '`⁄€‹›ﬁﬂ‡°·‚—±' },
    ],
  },
  {
    from: gl(34.5), to: gl(261.0),
    sets: [
      { lang: 'en', keys: 'qwertyuiop[]\\' },
      { lang: 'en', keys: 'QWERTYUIOP{}|' },
      { lang: 'en', keys: 'œ∑´®†¥¨ˆøπ“‘«' },
      { lang: 'en', keys: 'Œ„´‰ˇÁ¨ˆØ∏”’»' },
      { lang: 'ko', keys: 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ[]\\' },
      { lang: 'ko', keys: 'ㅃㅉㄸㄲㅆㅛㅕㅑㅒㅖ{}\\' },
    ],
  },
  {
    from: gl(39.0), to: gl(229.5),
    sets: [
      { lang: 'en', keys: "asdfghjkl;'" },
      { lang: 'en', keys: 'ASDFGHJKL:"' },
      { lang: 'en', keys: 'åß∂ƒ©˙∆˚¬…æ' },
      { lang: 'en', keys: 'ÅÍÎÏ˝ÓÔÒÚÆ' },
      { lang: 'ko', keys: "ㅁㄴㅇㄹㅎㅗㅓㅏㅣ;'" },
    ],
  },
  {
    from: gl(49.0), to: gl(219.5),
    sets: [
      { lang: 'en', keys: 'zxcvbnm,./' },
      { lang: 'en', keys: 'ZXCVBNM<>?' },
      { lang: 'en', keys: 'Ω≈ç√∫˜µ≤≥÷' },
      { lang: 'en', keys: '¸˛Ç◊ı˜Â¯˘¿' },
      { lang: 'ko', keys: 'ㅋㅌㅊㅍㅠㅜㅡ,./' },
    ],
  },
  {
    from: gl(129), to: gl(129),
    sets: [{ lang: 'en', keys: ' ' }],
  },
];

/** 이 배열에 들어 있는 모든 문자를 (문자, 언어, keyPos) 로 펼쳐서 돌려준다. */
export function eachKey(fn) {
  for (const row of ROWS) {
    for (const set of row.sets) {
      const chars = [...set.keys];
      for (let i = 0; i < chars.length; i++) {
        const t = chars.length <= 1 ? 0 : i / (chars.length - 1);
        fn(chars[i], set.lang, row.from * (1 - t) + row.to * t);
      }
    }
  }
}

//  브라우저에는 macOS 한글 IME 가 주는 낱자가 그대로 오지 않는다.
//  대신 물리 키(event.code)를 두벌식 자판대로 낱자에 대응시킨다.
const HANGUL_BASE = {
  KeyQ: 'ㅂ', KeyW: 'ㅈ', KeyE: 'ㄷ', KeyR: 'ㄱ', KeyT: 'ㅅ',
  KeyY: 'ㅛ', KeyU: 'ㅕ', KeyI: 'ㅑ', KeyO: 'ㅐ', KeyP: 'ㅔ',
  KeyA: 'ㅁ', KeyS: 'ㄴ', KeyD: 'ㅇ', KeyF: 'ㄹ', KeyG: 'ㅎ',
  KeyH: 'ㅗ', KeyJ: 'ㅓ', KeyK: 'ㅏ', KeyL: 'ㅣ',
  KeyZ: 'ㅋ', KeyX: 'ㅌ', KeyC: 'ㅊ', KeyV: 'ㅍ', KeyB: 'ㅠ',
  KeyN: 'ㅜ', KeyM: 'ㅡ',
};

const HANGUL_SHIFT = {
  KeyQ: 'ㅃ', KeyW: 'ㅉ', KeyE: 'ㄸ', KeyR: 'ㄲ', KeyT: 'ㅆ',
  KeyO: 'ㅒ', KeyP: 'ㅖ',
};

export function hangulFor(code, shift) {
  if (shift && HANGUL_SHIFT[code]) return HANGUL_SHIFT[code];
  return HANGUL_BASE[code] || null;
}
