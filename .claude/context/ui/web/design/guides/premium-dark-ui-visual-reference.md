<!-- Context: ui/premium-dark-ui-visual-reference | Priority: high | Version: 1.0 | Updated: 2026-02-15 -->

# Premium Dark UI - Visual Reference

Quick visual guide for the premium dark aesthetic.

---

## COLOR SWATCHES

```
┌─────────────────────────────────────────────────────────┐
│ BACKGROUNDS                                             │
├─────────────────────────────────────────────────────────┤
│ #0a0f0d  ████████  Deep Dark (Main)                     │
│ #000000  ████████  Pure Black (Alternate)               │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ACCENT                                                  │
├─────────────────────────────────────────────────────────┤
│ #80cca5  ████████  Mint Green (Primary)                 │
│ #6bb890  ████████  Darker Green (Hover)                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ GLASS                                                   │
├─────────────────────────────────────────────────────────┤
│ rgba(255,255,255,0.02)  ░░░░░░░░  Glass Background      │
│ rgba(255,255,255,0.10)  ▒▒▒▒▒▒▒▒  Glass Border         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TEXT                                                    │
├─────────────────────────────────────────────────────────┤
│ #ffffff  ████████  Headings (White)                     │
│ #cbd5e1  ████████  Body (Slate-300)                     │
│ #94a3b8  ████████  Muted (Slate-400)                    │
└─────────────────────────────────────────────────────────┘
```

---

## TYPOGRAPHY HIERARCHY

```
┌─────────────────────────────────────────────────────────┐
│ H1 - Page Title                                         │
│ text-4xl md:text-6xl (36px → 60px)                      │
│ font-bold, text-white, mb-8                             │
├─────────────────────────────────────────────────────────┤
│ H2 - Section Title                                      │
│ text-3xl md:text-5xl (30px → 48px)                      │
│ font-bold, text-white, mb-6                             │
├─────────────────────────────────────────────────────────┤
│ H3 - Subsection                                         │
│ text-2xl md:text-4xl (24px → 36px)                      │
│ font-bold, text-white, mb-4                             │
├─────────────────────────────────────────────────────────┤
│ Body - Large                                            │
│ text-lg (18px)                                          │
│ text-slate-300                                          │
├─────────────────────────────────────────────────────────┤
│ Body - Regular                                          │
│ text-base (16px)                                        │
│ text-slate-300                                          │
├─────────────────────────────────────────────────────────┤
│ Body - Small                                            │
│ text-sm (14px)                                          │
│ text-slate-400                                          │
└─────────────────────────────────────────────────────────┘
```

---

## COMPONENT ANATOMY

### Glass Card

```
┌─────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ░  ┌─────────────────────────────────────────────┐  ░ │
│ ░  │  border-white/10                            │  ░ │
│ ░  │  rounded-2xl                                │  ░ │
│ ░  │                                             │  ░ │
│ ░  │  Content goes here                          │  ░ │
│ ░  │  backdrop-blur-xl                           │  ░ │
│ ░  │                                             │  ░ │
│ ░  └─────────────────────────────────────────────┘  ░ │
│ ░                                                     ░ │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
└─────────────────────────────────────────────────────────┘
   bg-white/[0.02] (very subtle)
```

### Button

```
┌──────────────────────────────────────┐
│  px-8 py-4                           │
│  ┌────────────────────────────────┐  │
│  │  Button Text                   │  │ ← text-white
│  └────────────────────────────────┘  │
│  rounded-full                        │
│  bg-[#80cca5]                        │
└──────────────────────────────────────┘
```

### Radial Glow

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                      ╭───────────╮                      │
│                    ╱               ╲                    │
│                  ╱                   ╲                  │
│                ╱    Radial Glow       ╲                 │
│              ╱      (#80cca5)           ╲               │
│             │       opacity: 0.15         │              │
│              ╲      600px × 600px        ╱              │
│                ╲                       ╱                │
│                  ╲                   ╱                  │
│                    ╲               ╱                    │
│                      ╰───────────╯                      │
│                                                         │
│         ┌─────────────────────────┐                     │
│         │  Content (z-10)         │                     │
│         │  Sits above glow        │                     │
│         └─────────────────────────┘                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## LAYOUT PATTERNS

### Hero Section

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Radial Glow]                        │
│                                                         │
│              ┌─────────────────────┐                    │
│              │   H1 Title          │                    │
│              │   with Accent       │                    │
│              └─────────────────────┘                    │
│                                                         │
│              ┌─────────────────────┐                    │
│              │   Subtitle text     │                    │
│              └─────────────────────┘                    │
│                                                         │
│              ┌─────────────────────┐                    │
│              │   [CTA Button]      │                    │
│              └─────────────────────┘                    │
│                                                         │
│ max-w-4xl mx-auto text-center                          │
└─────────────────────────────────────────────────────────┘
```

### Feature Grid (3 columns)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              ┌─────────────────────┐                    │
│              │   Section Title     │                    │
│              └─────────────────────┘                    │
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐          │
│  │ ░░░░░░░░░ │  │ ░░░░░░░░░ │  │ ░░░░░░░░░ │          │
│  │ ░ Card 1 ░ │  │ ░ Card 2 ░ │  │ ░ Card 3 ░ │          │
│  │ ░░░░░░░░░ │  │ ░░░░░░░░░ │  │ ░░░░░░░░░ │          │
│  └───────────┘  └───────────┘  └───────────┘          │
│                                                         │
│  grid md:grid-cols-3 gap-8                             │
└─────────────────────────────────────────────────────────┘
```

### CTA Section

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Radial Glow]                        │
│                                                         │
│              ┌─────────────────────┐                    │
│              │   H2 Title          │                    │
│              └─────────────────────┘                    │
│                                                         │
│         ┌─────────────────────────────┐                 │
│         │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │                 │
│         │ ░                         ░ │                 │
│         │ ░  [Email Input]          ░ │                 │
│         │ ░                         ░ │                 │
│         │ ░  [Submit Button]        ░ │                 │
│         │ ░                         ░ │                 │
│         │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░ │                 │
│         └─────────────────────────────┘                 │
│                Glass Card (p-12)                        │
│                                                         │
│ max-w-3xl mx-auto                                       │
└─────────────────────────────────────────────────────────┘
```

---

## SPACING SCALE

```
┌─────────────────────────────────────────────────────────┐
│ Tailwind  │ Pixels │ Usage                              │
├─────────────────────────────────────────────────────────┤
│ py-4      │ 16px   │ Small spacing                      │
│ py-8      │ 32px   │ Medium spacing                     │
│ py-12     │ 48px   │ Large spacing                      │
│ py-24     │ 96px   │ Section spacing                    │
├─────────────────────────────────────────────────────────┤
│ px-4      │ 16px   │ Mobile padding                     │
│ px-8      │ 32px   │ Card padding                       │
│ px-12     │ 48px   │ Large card padding                 │
├─────────────────────────────────────────────────────────┤
│ gap-4     │ 16px   │ Small gaps                         │
│ gap-8     │ 32px   │ Medium gaps                        │
│ gap-12    │ 48px   │ Large gaps                         │
└─────────────────────────────────────────────────────────┘
```

---

## RESPONSIVE BREAKPOINTS

```
Mobile (< 768px)
┌─────────────────────────┐
│                         │
│   Content               │
│   Stacked               │
│   Full Width            │
│                         │
└─────────────────────────┘

Desktop (> 1024px)
┌─────────────────────────────────────┐
│                                     │
│   Content                           │
│   3 Columns                         │
│                                     │
└─────────────────────────────────────┘
```

**Breakpoint Classes**:

- `sm:` - 640px (small tablets)
- `md:` - 768px (tablets)
- `lg:` - 1024px (laptops)
- `xl:` - 1280px (desktops)

---

## HOVER STATES

### Button Hover

```
Normal State:
┌────────────────┐
│  bg-[#80cca5]  │
│  shadow-lg     │
└────────────────┘

Hover State:
┌────────────────┐
│  bg-[#6bb890]  │ ← Darker green
│  shadow-xl     │ ← Larger shadow
└────────────────┘
```

### Card Hover

```
Normal State:
┌────────────────┐
│ bg-white/[0.02]│
│ border-white/10│
└────────────────┘

Hover State:
┌────────────────┐
│ bg-white/[0.04]│ ← Slightly brighter
│ border-[#80cca5]/30 │ ← Green tint
│ scale-[1.02]   │ ← Subtle scale
└────────────────┘
```

---

## LAYERING & DEPTH

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1 (Background)                                    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ bg-[#0a0f0d]                                        │ │
│ │                                                     │ │
│ │   Layer 2 (Glass Card)                              │ │
│ │   ┌─────────────────────────────────┐               │ │
│ │   │ bg-white/[0.02]                 │               │ │
│ │   │ backdrop-blur-xl                │               │ │
│ │   │                                 │               │ │
│ │   │   Layer 3 (Nested Glass)        │               │ │
│ │   │   ┌─────────────────────┐       │               │ │
│ │   │   │ bg-white/[0.02]     │       │               │ │
│ │   │   │ border-white/10     │       │               │ │
│ │   │   └─────────────────────┘       │               │ │
│ │   │                                 │               │ │
│ │   └─────────────────────────────────┘               │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## GLOW POSITIONING

```
Centered Glow:
┌─────────────────────────────────────┐
│                                     │
│              ╭───────╮              │
│            ╱           ╲            │
│          ╱               ╲          │
│        ╱        Glow       ╲        │
│       │                     │       │
│        ╲                   ╱        │
│          ╲               ╱          │
│            ╲           ╱            │
│              ╰───────╯              │
│                                     │
└─────────────────────────────────────┘

Corner Glow:
┌─────────────────────────────────────┐
│    ╭───────╮                        │
│  ╱           ╲                      │
│ │    Glow     │                     │
│  ╲           ╱                      │
│    ╰───────╯                        │
│                                     │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

---

## ANIMATION TIMING

```
Fast (200ms)
├─ Button color changes
└─ Link hover

Medium (300ms)
├─ Card hover effects
└─ Form focus states

Slow (700ms)
├─ Image zoom
├─ Scroll reveals
└─ Page transitions
```

**Easing**: Use `ease-in-out` or default `ease` for smooth transitions.

---

## CONTRAST RATIOS

```
┌─────────────────────────────────────────────────────────┐
│ Combination              │ Ratio  │ WCAG Level          │
├─────────────────────────────────────────────────────────┤
│ White on #0a0f0d         │ 21:1   │ AAA ✅              │
│ Slate-300 on #0a0f0d     │ 12.6:1 │ AAA ✅              │
│ #80cca5 on #0a0f0d       │ 7.8:1  │ AAA ✅              │
│ Slate-400 on #0a0f0d     │ 6.2:1  │ AA Large Text ⚠️    │
└─────────────────────────────────────────────────────────┘
```

---

## GLOW SIZES

```
Small (400px):
      ╭─────╮
    ╱         ╲
   │   Glow    │
    ╲         ╱
      ╰─────╯

Medium (600px):
       ╭───────╮
     ╱           ╲
   ╱      Glow     ╲
  │                 │
   ╲               ╱
     ╲           ╱
       ╰───────╯

Large (800px):
        ╭─────────╮
      ╱             ╲
    ╱                 ╲
   │       Glow        │
    ╲                 ╱
      ╲             ╱
        ╰─────────╯
```

**Usage**:

- Small: Subtle accents, corner glows
- Medium: Standard sections
- Large: Hero sections, important CTAs

---

## FORM STATES

### Input States

```
Normal:
┌────────────────────────────────────┐
│ border-[#80cca5]/20                │
│ bg-slate-900/50                    │
└────────────────────────────────────┘

Focus:
┌────────────────────────────────────┐
│ ring-2 ring-[#80cca5]              │ ← Green ring
│ border-transparent                 │
└────────────────────────────────────┘

Error:
┌────────────────────────────────────┐
│ border-red-500                     │
│ ring-2 ring-red-500/50             │
└────────────────────────────────────┘
```

---

## ICON SIZES

```
▪ size-4 (16px)  ▪
▪ size-6 (24px)  ▪
▪ size-8 (32px)  ▪
▪ size-10 (40px) ▪
▪ size-12 (48px) ▪
```

**Usage**:

- `size-4`: Inline icons, badges
- `size-6`: Button icons
- `size-10-12`: Feature icons, decorative

---

## SHADOW SCALE

```
sm:  shadow-sm   ▁
md:  shadow      ▂
lg:  shadow-lg   ▃
xl:  shadow-xl   ▄
2xl: shadow-2xl  ▅
```

**Usage**:

- `shadow-lg`: Default for cards
- `shadow-xl`: Hover state for cards
- `shadow-2xl`: Modals, dropdowns

---

## QUICK REFERENCE CARD

```
┌─────────────────────────────────────────────────────────┐
│ PREMIUM DARK UI - CHEAT SHEET                           │
├─────────────────────────────────────────────────────────┤
│ Background:  #0a0f0d or black                           │
│ Text:        white (headings), slate-300 (body)         │
│ Accent:      #80cca5 (green)                            │
│ Glass:       bg-white/[0.02], backdrop-blur-xl          │
│ Borders:     border-white/10                            │
│ Spacing:     Multiples of 4 (4, 8, 12, 24, 48, 96)      │
│ Rounded:     rounded-2xl (cards), rounded-full (buttons)│
│ Shadows:     shadow-lg (default), shadow-xl (hover)     │
│ Transitions: duration-300 (default)                     │
│ Glow:        600px, opacity 0.15 (default)              │
└─────────────────────────────────────────────────────────┘
```

---

## DONE! 🎨

Use this visual reference alongside the Quick Start Guide for fast implementation.
