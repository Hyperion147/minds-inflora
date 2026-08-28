---
name: Inflora Intelligence
colors:
  surface: '#fcf9f0'
  surface-dim: '#dddad1'
  surface-bright: '#fcf9f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ea'
  surface-container: '#f1eee5'
  surface-container-high: '#ebe8df'
  surface-container-highest: '#e5e2da'
  on-surface: '#1c1c17'
  on-surface-variant: '#474741'
  inverse-surface: '#31312b'
  inverse-on-surface: '#f4f1e8'
  outline: '#787770'
  outline-variant: '#c8c7be'
  surface-tint: '#5f5e5a'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1c19'
  on-primary-container: '#85847f'
  inverse-primary: '#c9c6c1'
  secondary: '#5b6312'
  on-secondary: '#ffffff'
  secondary-container: '#e0ea8a'
  on-secondary-container: '#616918'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#360f00'
  on-tertiary-container: '#bd704e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2dd'
  primary-fixed-dim: '#c9c6c1'
  on-primary-fixed: '#1c1c19'
  on-primary-fixed-variant: '#474743'
  secondary-fixed: '#e0ea8a'
  secondary-fixed-dim: '#c4cd71'
  on-secondary-fixed: '#1a1e00'
  on-secondary-fixed-variant: '#444b00'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#723518'
  background: '#fcf9f0'
  on-background: '#1c1c17'
  surface-variant: '#e5e2da'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 72px
    fontWeight: '800'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  numeral-editorial:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.0'
    letterSpacing: 0.05em
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 48px
  column-gap: 24px
  section-padding: 80px
---

## Brand & Style
The design system embodies the authority of high-end data journalism with the precision of a modern fintech platform. The brand personality is intellectual, objective, and meticulously curated, targeting professionals and informed citizens navigating the Indian economic landscape.

The aesthetic leans heavily into **Modern Editorialism**. It rejects the "bubbly" SaaS trends of the last decade in favor of a structured, grid-heavy layout inspired by physical broadsheets and premium financial terminals. The UI is defined by thin rules, asymmetric content distribution, and high-density information clusters. Key traits include:
- **Restraint:** No unnecessary shadows, glows, or gradients.
- **Precision:** Frequent use of tabular data, micro-labels, and explicit editorial numbering (e.g., 01, 02).
- **Asymmetry:** Intentional use of whitespace and off-center alignments to guide the eye through complex narratives.

## Colors
The palette is rooted in a warm, sophisticated "paper" aesthetic. The primary interaction color is Deep Charcoal, providing maximum contrast against the Warm Off-White background. 

- **Muted Olive & Deep Olive:** Used for positive growth, stability, or primary action highlights.
- **Terracotta & Muted Blue:** Used for comparative data sets and secondary editorial highlights.
- **Stone:** Specifically for dividers, borders, and subtle structural grouping.
- **Soft Yellow:** Reserved for cautionary data or high-priority editorial callouts.

Avoid using these colors in vibrant, saturated bursts; they should appear as if printed on a matte, high-quality stock.

## Typography
The system uses **Hanken Grotesk** as the primary driver for its sharp, contemporary feel. **JetBrains Mono** is introduced for micro-labels and numerical data to evoke the precision of a financial terminal.

- **Editorial Numbering:** Use `numeral-editorial` for section markers (e.g., 01/ ) in a lighter weight or secondary color.
- **Hierarchy:** Dramatic contrast is encouraged. Pair `display-lg` headlines with very small `label-caps` for a professional, news-like layout.
- **Numbers:** All financial figures and inflation rates should use the monospaced font to ensure vertical alignment in tabular views.

## Layout & Spacing
The layout follows a rigorous **12-column grid** on desktop and a **4-column grid** on mobile.

- **Thin Rules:** Use 1px rules (`#D8D1C1`) to separate content sections instead of whitespace alone. Rules should extend to the edge of the container to emphasize the grid.
- **Asymmetric Balance:** Do not center-align content. Use the left-most columns for primary text and the right-most columns for data visualization or editorial sidebars.
- **Density:** Information density should be high. Use the 4px/8px system to tighten related data points while using large `section-padding` to separate major thematic blocks.

## Elevation & Depth
This design system avoids physical depth. There are no shadows or blurs. 

- **Structural Layering:** Depth is achieved through "Tonal Stacking." Higher priority elements or modal-like surfaces use a slightly different background tint (e.g., Stone #D8D1C1) or a crisp 1px Deep Charcoal border.
- **Borders over Shadows:** All containers, cards, and dropdowns use a 1px solid border. 
- **Z-Index:** Interaction layers (menus) simply cut into the layout with sharp edges, behaving more like overlays on a printed page than floating windows.

## Shapes
The shape language is strictly **Sharp**. 

- **Zero Radius:** All buttons, input fields, and containers must have 0px corner radius. This reinforces the architectural and professional nature of the platform.
- **Icons:** Use thin-stroke, geometric icons (1.5px stroke weight). Avoid filled or rounded icon sets.

## Components
- **Buttons:** Rectangular, sharp corners. Primary buttons are solid Deep Charcoal with Off-White text. Secondary buttons use a 1px Stone border and Charcoal text.
- **Editorial Numbering:** Every major section or list item should be prefixed with a two-digit monospaced number (e.g., 01, 02).
- **Data Cards:** No background fill or shadows. Use a top 1px border rule. Headlines are followed by large monospaced figures.
- **Input Fields:** Bottom-border only or a full 1px Stone outline. Labels must be `label-caps`.
- **Chips/Tags:** Compact, rectangular, 1px border. No rounded ends.
- **Dividers:** 1px width using the Stone color. Use vertical dividers between data columns to maintain the "terminal" aesthetic.
- **Progress/Status:** Use the Olive Green for "Below Target" inflation and Terracotta for "Above Target" spikes.