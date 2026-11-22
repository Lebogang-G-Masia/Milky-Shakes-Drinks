---
name: penpot-mcp-architect
description: >-
  Automates Penpot canvas creation, design systems, design tokens, Auto Layout boards, reusable components, and multi-screen responsive layouts via the Penpot Plugin MCP server (execute_code / Penpot Plugin API). Use whenever the user asks to design in Penpot, generate Penpot artboards or components via MCP, set up Penpot design tokens, or build UI/UX layouts on a Penpot canvas.
---

# Penpot MCP Architect

Automates deterministic, production-grade UI/UX design systems, design tokens, Auto Layout frames, components, and multi-screen artboards in Penpot using the Penpot Plugin MCP server (`execute_code` and `penpotUtils`).

---

## When to Use

- Designing new web or mobile UI/UX screens directly on a Penpot canvas via MCP.
- Creating or updating Penpot design tokens (colors, typography, spacing, radii) and library typographies.
- Building reusable Penpot components (buttons, cards, inputs, badges, navbars) with Flex/Grid Auto Layout.
- Inspecting, refactoring, or auditing existing Penpot pages, boards, or component libraries.

---

## Execution Workflow

### 1. Inspect Canvas and Existing Assets First
Before creating shapes or pages, query the active Penpot file state via `execute_code` to prevent duplicate pages, overlapping artboards, or conflicting component names:
- Check `penpot.root.children` (existing pages) and `penpot.currentPage.children` (existing top-level boards).
- Check `penpot.library.local.colors`, `penpot.library.local.typographies`, and `penpot.library.local.components`.
- Check `penpot.library.tokens` if the workspace uses W3C Design Tokens.
- Compute non-overlapping `(x, y)` coordinates for new boards using bounding boxes of existing boards (e.g., `maxX + 120` horizontally or `maxY + 160` vertically).

### 2. Establish Design Tokens and Typography Scales
Create semantic tokens and library styles before instantiating screens so shapes bind to variables rather than raw hex values:
- **Library Colors**: Register primary, secondary, surface, ink, border, and semantic status colors in `penpot.library.local.createColor()`.
- **Design Tokens (if supported/active)**: Organize sets under `primitive` (raw palette, spacing scale, radii) and `semantic` (`bg.canvas`, `bg.surface`, `text.primary`, `text.muted`, `border.subtle`, `accent.primary`).
- **Typography Scale**: Register named text styles in `penpot.library.local.createTypography()` covering Display, H1, H2, H3, Body, Label, and Caption with explicit `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, and `letterSpacing`.
- **Font Loading**: Verify font availability via `penpot.fonts` or use reliable Google/system fonts supported in Penpot (*Plus Jakarta Sans*, *Inter*, *Outfit*, *DM Sans*, *Space Grotesk*) before assigning `fontFamily`.

### 3. Build Atomic Components First
Construct base UI primitives inside a dedicated Components page (or organized component strip) before assembling full pages:
- **Buttons & Pills**: Frame with `addFlexLayout()`, horizontal direction (`row`), centered alignment (`alignItems = 'center'`, `justifyContent = 'center'`), `horizontalSizing = 'fit-content'`, `verticalSizing = 'fit-content'`, explicit padding, and pill/rounded `borderRadius`.
- **Cards & Containers**: Flex column frames with explicit padding, `rowGap`, surface fill, 1px subtle stroke (`strokeOpacity: 0.12`), and 20px–24px corner radius.
- **Form Inputs & Badges**: Auto Layout frames with consistent height (44px–48px for inputs, 24px–28px for badges) and semantic text tokens.
- **Component Conversion**: Convert reusable elements into library components via `penpot.library.local.createComponent([frame])` and instantiate copies on target screens using `component.instance()`.

### 4. Construct Responsive Artboards with Auto Layout
Never rely solely on manual absolute `(x, y)` positioning for internal UI elements. Use Penpot Flex Layout (`board.addFlexLayout()`) or Grid Layout (`board.addGridLayout()`) so sections adapt cleanly to content changes:
- **Standard Viewport Widths**:
  - **Desktop**: 1440px wide (height auto-expands via `verticalSizing = 'fit-content'` or fixed minimum 900px).
  - **Mobile**: 390px wide (minimum 844px height).
- **Structural Hierarchy**:
  - `Page` $\rightarrow$ `Artboard (Board)` $\rightarrow$ `Section Container (Flex Column)` $\rightarrow$ `Inner Max-Width Wrapper (e.g., 1200px)` $\rightarrow$ `Row / Grid` $\rightarrow$ `Component Instance / Primitive`.
- **Naming Convention**: Name every board, section, and layer semantically (`Section / Hero`, `Card / Flavour Item`, `CTA / Build Pack`) so the Penpot layers panel remains clean and code-export ready.

### 5. Verify Visual Integrity
After executing creation scripts, verify the output before finishing:
- Inspect bounding boxes and child overflow (`shape.width`, `shape.height`, `shape.x`, `shape.y`) via `execute_code` to ensure zero overlapping text nodes or clipped containers.
- Capture a PNG screenshot or inspect the viewport using the MCP visual inspection tool (`export_shape` / `get_screenshot` if available in the server) to confirm alignment, contrast, and spacing.

---

## Penpot Plugin API Patterns (`execute_code`)

### Creating a Flex Layout Frame
```javascript
const card = penpot.createBoard();
card.name = "Card / Feature";
card.resize(360, 240);
card.borderRadius = 20;
card.fills = [{ fillColor: "#FAF3EB", fillOpacity: 1 }];
card.strokes = [{ strokeColor: "#3D231A", strokeOpacity: 0.12, strokeWidth: 1, strokeAlignment: "inside" }];

const flex = card.addFlexLayout();
flex.dir = "column";
flex.alignItems = "start";
flex.justifyContent = "start";
flex.rowGap = 12;
flex.topPadding = 24;
flex.rightPadding = 24;
flex.bottomPadding = 24;
flex.leftPadding = 24;
flex.verticalSizing = "fit-content";
```

### Creating Styled Text Inside Auto Layout
```javascript
const heading = penpot.createText("Thick, creamy, hand-spun.");
heading.name = "Hero / Headline";
heading.fontFamily = "Plus Jakarta Sans";
heading.fontSize = "64";
heading.fontWeight = "800";
heading.lineHeight = "1.05";
heading.letterSpacing = "-0.03";
heading.fills = [{ fillColor: "#3D231A", fillOpacity: 1 }];
card.appendChild(heading);
// Set sizing after appending to a Flex parent:
heading.layoutChild.horizontalSizing = "fill";
```

### Registering Colors and Components
```javascript
const brandPrimary = penpot.library.local.createColor();
brandPrimary.name = "Ink / Espresso";
brandPrimary.color = "#3D231A";

const component = penpot.library.local.createComponent([card]);
const instance = component.instance();
targetSection.appendChild(instance);
```

---

## Gotchas & Best Practices

1. **Appending Order Matters**: Always append a child shape (`parent.appendChild(child)`) before modifying `child.layoutChild` properties (`horizontalSizing`, `verticalSizing`, `alignSelf`). Accessing `layoutChild` before appending throws or has no effect.
2. **String Types in Text API**: In the Penpot Plugin API, `fontSize`, `fontWeight`, `lineHeight`, and `letterSpacing` on Text shapes expect strings (e.g., `"16"`, `"700"`, `"1.4"`), whereas `rowGap`, `columnGap`, and padding properties expect numbers.
3. **Text Auto-Sizing**: Set `text.growType = "auto-height"` when using `layoutChild.horizontalSizing = "fill"` inside vertical Flex containers so multi-line text wraps instead of overflowing horizontally.
4. **Batch Mutations**: Group related shape creations into single `execute_code` scripts per section or component rather than making dozens of tiny round-trip calls, and return a JSON summary of created IDs and bounding boxes at the end of each script.
5. **Avoid Floating Text Without Containers**: Never place raw text directly on a root page without an enclosing artboard (`penpot.createBoard()`), as uncontained shapes do not export properly as screens.
