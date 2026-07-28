/**
 * The "Mukti is ready" moment for the local launcher.
 *
 * A geometric wordmark is drawn from a 10px-tall bitmap using half-block glyphs
 * (two pixel rows per terminal row), revealed left-to-right by a warm wavefront —
 * light being let through, which is what मुक्ति means. Colours are the app's own
 * Japandi tokens (terracotta, ochre, sage, sand) so the terminal and the web app
 * read as one product.
 *
 * Degrades on purpose: no TTY, no colour, or a narrow window each fall back to a
 * plain static banner rather than spraying frames into a redirected log.
 */
import pc from 'picocolors';

// ── Ink ────────────────────────────────────────────────────────────────────

interface Ink {
  /** Truecolor value, taken from the web app's japandi.css. */
  readonly rgb: readonly [number, number, number];
  /** Nearest xterm-256 index, for terminals without truecolor. */
  readonly xterm: number;
}

const ink = (hex: string, xterm: number): Ink => ({
  rgb: [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ],
  xterm,
});

/** Resting colour of the wordmark — mid-tone, so it reads on light and dark. */
const TERRACOTTA = ink('#c4785b', 173);
/** The wavefront: sand → gold → clay, brightest at the leading edge. */
const FLARE: readonly Ink[] = [
  ink('#f5f0eb', 255),
  ink('#e8e0d6', 254),
  ink('#c9a040', 178),
  ink('#d4906e', 180),
];
const HAIRLINE = ink('#6b4d3a', 95);
const SAGE = ink('#8b9e82', 108);
const OCHRE = ink('#c9a040', 178);
const SAND = ink('#c4956e', 180);
/** Steps the tagline fades up through. */
const FADE: readonly Ink[] = [ink('#3d3830', 237), HAIRLINE, SAGE];

const COLOR = pc.isColorSupported;
const TRUECOLOR = /truecolor|24bit/i.test(process.env.COLORTERM ?? '');
const RESET = COLOR ? '\u001B[0m' : '';

function fg(paint: Ink): string {
  if (!COLOR) return '';
  const [r, g, b] = paint.rgb;
  return TRUECOLOR ? `\u001B[38;2;${r};${g};${b}m` : `\u001B[38;5;${paint.xterm}m`;
}

function tint(paint: Ink, text: string): string {
  return COLOR ? `${fg(paint)}${text}${RESET}` : text;
}

// ── Letterforms ────────────────────────────────────────────────────────────

/** Each glyph is 10 pixel rows of a geometric sans, 2px stroke. */
const GLYPHS: readonly (readonly string[])[] = [
  [
    '##     ##',
    '###   ###',
    '#### ####',
    '## ### ##',
    '##  #  ##',
    '##     ##',
    '##     ##',
    '##     ##',
    '##     ##',
    '##     ##',
  ],
  [
    '##    ##',
    '##    ##',
    '##    ##',
    '##    ##',
    '##    ##',
    '##    ##',
    '##    ##',
    '##    ##',
    '########',
    '########',
  ],
  [
    '##    ##',
    '##   ## ',
    '##  ##  ',
    '## ##   ',
    '####    ',
    '####    ',
    '## ##   ',
    '##  ##  ',
    '##   ## ',
    '##    ##',
  ],
  [
    '########',
    '########',
    '   ##   ',
    '   ##   ',
    '   ##   ',
    '   ##   ',
    '   ##   ',
    '   ##   ',
    '   ##   ',
    '   ##   ',
  ],
  ['##', '##', '##', '##', '##', '##', '##', '##', '##', '##'],
];

const PIXEL_ROWS = 10;
const LETTER_GAP = 2;
const INDENT = '   ';

/** `grid[pixelRow][column]` — true where the letterform is filled. */
const GRID: boolean[][] = Array.from({ length: PIXEL_ROWS }, (_, row) =>
  GLYPHS.flatMap((glyph, index) => [
    ...(index > 0 ? Array.from({ length: LETTER_GAP }, () => false) : []),
    ...[...(glyph[row] ?? '')].map((cell) => cell === '#'),
  ])
);

const WIDTH = GRID[0]?.length ?? 0;
const TEXT_ROWS = PIXEL_ROWS / 2;

/**
 * Colour for a column `distance` steps behind the wavefront: the leading edge
 * flares, then relaxes into the resting terracotta.
 */
function inkAt(distance: number): Ink {
  return FLARE[distance] ?? TERRACOTTA;
}

/** Renders one terminal row, packing two pixel rows into half-block glyphs. */
function paintRow(textRow: number, head: number): string {
  const top = GRID[textRow * 2] ?? [];
  const bottom = GRID[textRow * 2 + 1] ?? [];
  let out = '';
  let current: Ink | undefined;

  for (let col = 0; col < WIDTH; col++) {
    if (col >= head) {
      if (current) {
        out += RESET;
        current = undefined;
      }
      out += ' ';
      continue;
    }
    const cell = top[col] && bottom[col] ? '█' : top[col] ? '▀' : bottom[col] ? '▄' : ' ';
    const next = inkAt(head - 1 - col);
    if (next !== current) {
      out += fg(next);
      current = next;
    }
    out += cell;
  }
  return current ? `${out}${RESET}` : out;
}

function frame(head: number): string[] {
  return Array.from({ length: TEXT_ROWS }, (_, row) => `${INDENT}${paintRow(row, head)}`);
}

// ── Composition ────────────────────────────────────────────────────────────

/**
 * Romanised on purpose. मुक्ति is two grapheme clusters, and the second (क्ति)
 * needs a क्त conjunct ligature plus i-matra reordering — shaping that terminals
 * without a full Indic text engine silently drop, leaving a bare "मु". The
 * transliteration carries the same word everywhere.
 */
const TAGLINE = 'मुukti  ·  more questions than answers';

export interface BannerOptions {
  /** Where the per-service logs were written, relative to the repo root. */
  readonly logHint: string;
  readonly url: string;
}

function detailLines({ logHint, url }: BannerOptions): string[] {
  return [
    `${INDENT}${tint(OCHRE, '▸')}  ${COLOR ? pc.underline(tint(SAND, url)) : url}`,
    '',
    `${INDENT}   ${pc.dim('logs')}  ${tint(HAIRLINE, logHint)}`,
    `${INDENT}   ${pc.dim('stop')}  ${pc.dim('ctrl-c')}`,
  ];
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const HIDE_CURSOR = '\u001B[?25l';
export const SHOW_CURSOR = '\u001B[?25h';

/** Repaints `lines` in place, over the previous frame of the same height. */
function repaint(lines: string[], first: boolean): void {
  const out = process.stdout;
  if (!first) out.write(`\u001B[${lines.length}A`);
  for (const line of lines) out.write(`\r${line}\u001B[K\n`);
}

function staticBanner(options: BannerOptions): string[] {
  return [
    '',
    ...frame(WIDTH),
    '',
    `${INDENT}${tint(HAIRLINE, '─'.repeat(WIDTH))}`,
    `${INDENT}${tint(SAGE, TAGLINE)}`,
    '',
    ...detailLines(options),
    '',
  ];
}

/**
 * Draws the ready banner. Animated on an interactive terminal, printed once
 * anywhere else.
 */
export async function renderReadyBanner(options: BannerOptions): Promise<void> {
  const out = process.stdout;
  const animate = Boolean(out.isTTY) && (out.columns ?? 80) >= WIDTH + INDENT.length;

  if (!animate) {
    out.write(`${staticBanner(options).join('\n')}\n`);
    return;
  }

  out.write(`${HIDE_CURSOR}\n`);

  // The wordmark: a wavefront crossing the letterforms. It runs past the right
  // edge so the flare exits rather than stalling on the last column.
  for (let head = 0; head <= WIDTH + FLARE.length; head++) {
    repaint(frame(head), head === 0);
    await sleep(10);
  }
  await sleep(90);

  // The hairline extends in the same direction the light travelled.
  out.write('\n');
  for (let drawn = 3; drawn <= WIDTH; drawn += 3) {
    repaint([`${INDENT}${tint(HAIRLINE, '─'.repeat(Math.min(drawn, WIDTH)))}`], drawn === 3);
    await sleep(14);
  }

  // Then the tagline surfaces out of the dark.
  for (const [step, shade] of FADE.entries()) {
    repaint([`${INDENT}${tint(shade, TAGLINE)}`], step === 0);
    await sleep(90);
  }

  out.write(`${SHOW_CURSOR}\n${detailLines(options).join('\n')}\n\n`);
}
