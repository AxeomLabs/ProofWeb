---
name: Proof Web
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#0051d5'
  on-secondary: '#ffffff'
  secondary-container: '#316bf3'
  on-secondary-container: '#fefcff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b4c5ff'
  on-secondary-fixed: '#00174b'
  on-secondary-fixed-variant: '#003ea8'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  h1:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  status-badge:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-page: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system establishes a premium academic aesthetic, merging the rigor of institutional archives with the fluid dynamics of modern high-performance software. The target audience includes researchers, academics, and security-conscious professionals who value institutional trust and modern efficiency. 

The style is **Corporate / Modern** with a focus on **Minimalism**. It utilizes expansive white space, precise typography, and a "security-first" visual language. The emotional response is one of absolute stability, verified truth, and a sophisticated sense of belonging to a professional community.

## Colors

The color palette is anchored by **Deep Navy (#0F172A)**, providing a foundational sense of authority and permanence. 

- **Primary:** Deep Navy for headers, primary text, and core structural elements.
- **Action Blue:** A vibrant secondary blue (#2563EB) reserved for primary calls-to-action and interactive states.
- **Verification Green:** A high-visibility accent (#10B981) used exclusively for "Verified" statuses and successful authentication indicators.
- **Surface Neutrals:** A range of cool grays (Slate) to define hierarchy without introducing visual noise, maintaining the clean, professional aesthetic.

## Typography

This design system utilizes **Inter** exclusively to ensure maximum readability across technical data and long-form academic content. 

The typographic scale emphasizes a strong vertical rhythm. Headlines use tighter letter spacing and heavier weights to feel "architectural" and impactful. Body text is optimized with generous line height for sustained reading. Label styles utilize uppercase transformations and increased tracking to differentiate metadata from primary content.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model for desktop, centering content within a 1280px container to maintain a focused, editorial feel. 

Spacing is based on a 4px baseline grid. Elements are grouped using a "Stack" methodology, where related components (like a header and its description) use `stack-sm`, while distinct sections use `stack-lg`. This creates a clear visual hierarchy that mirrors the logical structure of academic papers.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** supplemented by **Ambient Shadows**. 

The background surface is slightly off-white, allowing white cards to "pop" with subtle depth. Shadows are highly diffused (15% opacity Deep Navy) with a large blur radius and zero spread, mimicking the soft lift of a physical document on a desk. Interactive elements increase their shadow spread on hover to provide dynamic feedback without breaking the minimalist aesthetic.

## Shapes

The shape language is **Boxy but Modern**. 

A standard radius of 8px is applied to most components (cards, inputs, buttons) to communicate stability and professional heritage. This prevents the interface from feeling overly "bubbly" or consumer-grade, maintaining the academic tone while ensuring the edges feel refined and contemporary rather than dated or aggressive.

## Components

- **Cards:** White backgrounds with a 1px Slate-200 border and the "Ambient" shadow profile. Padding should be generous (24px-32px).
- **Buttons:** 
    - *Primary:* Action Blue background, white text, 8px radius. 
    - *Secondary:* Transparent background with a 1px Deep Navy border.
    - *State:* On hover, buttons should shift -5% in brightness rather than change hue.
- **Verified Badges:** Small pill-shaped containers using a 10% opacity Verification Green background with 100% opacity Green text and a leading checkmark icon.
- **Input Fields:** Flat, Slate-50 background with a subtle bottom-border focus state in Action Blue.
- **Academic Chips:** Used for tagging subjects or citations; rectangular with a 2px radius and light gray fill.
- **Community Avatars:** Square with an 8px radius (to match the card system) rather than circular, reinforcing the stable, boxy aesthetic.