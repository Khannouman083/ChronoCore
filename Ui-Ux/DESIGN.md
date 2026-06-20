---
name: ChronoCore Digital Debug
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181c25'
  surface-container: '#1c2029'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#bdc7dc'
  on-secondary: '#283141'
  secondary-container: '#3e4759'
  on-secondary-container: '#acb5ca'
  tertiary: '#ebecf5'
  on-tertiary: '#2d3037'
  tertiary-container: '#ced0d9'
  on-tertiary-container: '#565960'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#dae2f9'
  secondary-fixed-dim: '#bdc7dc'
  on-secondary-fixed: '#121c2c'
  on-secondary-fixed-variant: '#3e4759'
  tertiary-fixed: '#e1e2eb'
  tertiary-fixed-dim: '#c4c6cf'
  on-tertiary-fixed: '#191c22'
  on-tertiary-fixed-variant: '#44474e'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
  hazard-orange: '#FF6D00'
  success-green: '#00E87A'
  terminal-black: '#000000'
  breakpoint-red: '#FF0000'
  data-glow: rgba(0, 229, 255, 0.2)
  success-glow: rgba(0, 232, 122, 0.2)
typography:
  nav-item:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  code-editor:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  data-hex:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  status-label:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  value-tag:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  panel-gap: 1px
  container-padding: 1rem
  gutter-sm: 0.75rem
  sidebar-width: 240px
  sidebar-collapsed: 64px
  header-height: 56px
  footer-height: 28px
---

## Brand & Style

The design system embodies a **Cyber-Technical** aesthetic, designed specifically for the high-precision world of low-level time-travel debugging. It targets developers and computer architects who require a high information density environment that feels like an advanced terminal interface rather than a consumer web application.

The visual style is **Terminal-Modern**. It leverages a deep, low-light foundation to reduce eye strain during long debugging sessions, accented by high-energy "glowing" colors that signify active data flow and system states. The interface should feel like a living machine—precise, responsive, and technical.

Key stylistic pillars include:
- **Atmospheric Depth:** Using "Deep Space" foundations with layered translucent panels.
- **Data-First Hierarchy:** Prioritizing monospace legibility for addresses, hex values, and assembly code.
- **Active Instrumentation:** Using glow effects and "laser" lines to represent the movement of data across hardware components (bus wires, registers).
- **Industrial Precision:** Hard edges for structural elements, paired with subtle pill-shaped radius for interactive controls to signify modern software refinement.

## Colors

The palette is centered around a "Dark Mode" default, utilizing high-contrast accents to guide the user's attention toward critical state changes in the processor.

- **Primary (Action Cyan):** Used for primary CTAs, active navigation states, and the primary flow of data. It represents "current" or "active."
- **Secondary (Border/Grid Blue):** The structural backbone. Used for grid lines, panel borders, and inactive UI elements.
- **Tertiary (Deep Space Navy):** The primary background color for the editor and main content areas.
- **Neutral:** Used for sidebar backgrounds and secondary surface elevations.
- **Functional Accents:**
    - **Hazard Orange:** Reserved for stalls, hazards, and the ALU during heavy execution.
    - **Success Green:** Used for register updates, successful compilation, and simulation "Running" states.
    - **Terminal Black:** Exclusively for the console/log output area to mimic a true CLI environment.

## Typography

This system employs a dual-font strategy to balance professional navigation with technical data density.

- **Sans-Serif (Hanken Grotesk):** Chosen for its modern, sharp, yet approachable geometry. It handles all structural UI labels, navigation menu items, and top-level headers.
- **Monospace (JetBrains Mono):** The workhorse of the system. It is used for all code input, register values, memory addresses, and terminal logs. The increased x-height and clear distinction between similar characters (0 vs O) are critical for debugging accuracy.

**Usage Rules:**
- Use `data-hex` for all grid-based register and memory values.
- `value-tag` is used for floating annotations on datapath wires, designed to be legible at small sizes.
- `status-label` is always uppercase to maintain a "panel instrument" feel.

## Layout & Spacing

The design system uses a **Fixed Grid** layout optimized for a 16:9 desktop aspect ratio, as it is a professional tool. The layout is divided into four primary zones: Header (Control), Sidebar (Navigation), Main Content (Working Area), and Footer (Status).

- **Grid Alignment:** Use 1px gaps (the color of `secondary-color-hex`) to create a "grid of panels" look. This reinforces the technical, modular nature of the software.
- **The Main Content Area:** Employs resizable vertical or horizontal splits (e.g., 70/30 in the Editor view).
- **Responsive Behavior:** On smaller viewports, the Sidebar transitions to an icon-only state (`sidebar-collapsed`), maximizing the horizontal space for complex SVGs like the Datapath view.
- **Control Uniformity:** All transport icons (Run, Step, Stop) are contained in 32x32px hit areas to ensure consistent visual rhythm in the Header.

## Elevation & Depth

In a Cyber-Technical UI, depth is achieved through **Tonal Layers** and **Luminescent Accents** rather than traditional shadows.

- **Base Layer:** `tertiary-color_hex` (#090C12) serves as the "ground."
- **Panel Elevation:** Navigation and sidebar surfaces use `neutral_color_hex` (#141821) to appear slightly closer to the user.
- **Interactive Depth:** We avoid drop shadows. Instead, we use "inner glows" and "outer glows" using `primary_color_hex` with low opacity to indicate active states or focused elements. 
- **The "Glass" Effect:** For floating value tags in the Datapath view, use a semi-transparent background with a 1px solid border to simulate an overlay HUD.

## Shapes

The shape language is primarily **Soft (Level 1)**. 

While the overall layout is architectural and rigid (0px radius for main panels and grid splits), individual interactive components like **Pills**, **Toggles**, and **Instruction Pills** in the pipeline view utilize a 0.25rem (4px) to 0.75rem (12px) radius. This creates a "sleek hardware" feel—like machined components—rather than a boxy, primitive terminal.

- **Status Indicators:** Use 100% (Circle) roundedness for breakpoints and glowing status LEDs.
- **Instruction Pills:** Use `rounded-xl` (12px) to distinguish flowing data packets from the static UI grid.

## Components

### Buttons & CTAs
- **Primary CTA (Compile & Load):** Solid `primary_color_hex` background with black text for maximum contrast.
- **Transport Controls:** Ghost-style buttons with `secondary_color_hex` icons that glow `primary_color_hex` on hover. Fixed 32px square dimensions.

### Technical Cards (Registers/Memory)
- **Container:** 1px border using `secondary_color_hex`. No background (transparent to the base navy).
- **Header:** A small, uppercase `status-label` in the top-left corner.
- **State Change:** When a value updates, the entire cell should flash with a `success-glow` background that fades over 500ms.

### Selection Pills
- Used in the Header for Processor Selection. Active state: Bright white text and a 2px bottom border in `primary_color_hex`. Inactive: Dimmed text, no border.

### Status Indicators (Glows)
- Small circular LEDs. 
- `Idle`: Dimmed Secondary Blue. 
- `Running`: Pulsing Success Green. 
- `Stalled`: Static Hazard Orange.

### Input Fields & Search
- Minimalist design. 1px bottom border only. Monospace font for all inputs.

### Sidebar Tabs
- Active state: 3px solid Cyan vertical bar on the left edge. Icon and text transition from grey to Cyan.