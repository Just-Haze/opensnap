# Vencord OpenSnap-Style Image Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vencord plugin that opens a Discord-native editor to customize a pending image attachment with OpenSnap-style backgrounds, effects, and arrow annotations, replacing the attachment on apply.

**Architecture:** The plugin injects an "Edit Image" button in the composer. Clicking it opens a React modal that renders a canvas preview. The editor builds draw instructions (background, effects, image, arrow), renders a preview, and exports a full-resolution PNG that replaces the pending attachment.

**Tech Stack:** TypeScript, React (Vencord), HTML Canvas 2D, Vitest, @testing-library/react.

---

## File Structure

- Create: `vencord-plugin/opensnap-editor/package.json` (isolated dependencies for tests and typing)
- Create: `vencord-plugin/opensnap-editor/tsconfig.json`
- Create: `vencord-plugin/opensnap-editor/vitest.config.ts`
- Create: `vencord-plugin/opensnap-editor/src/index.tsx` (Vencord entry, UI injection, attachment replacement)
- Create: `vencord-plugin/opensnap-editor/src/editor/state.ts` (types and defaults)
- Create: `vencord-plugin/opensnap-editor/src/editor/reducer.ts` (actions and reducer)
- Create: `vencord-plugin/opensnap-editor/src/editor/utils/math.ts` (clamp/lerp)
- Create: `vencord-plugin/opensnap-editor/src/editor/utils/image.ts` (image loading helpers)
- Create: `vencord-plugin/opensnap-editor/src/editor/render/types.ts` (render instruction types)
- Create: `vencord-plugin/opensnap-editor/src/editor/render/layout.ts` (layout math)
- Create: `vencord-plugin/opensnap-editor/src/editor/render/background.ts` (background instructions)
- Create: `vencord-plugin/opensnap-editor/src/editor/render/effects.ts` (shadow instructions)
- Create: `vencord-plugin/opensnap-editor/src/editor/render/arrow.ts` (arrow instruction)
- Create: `vencord-plugin/opensnap-editor/src/editor/render/compositor.ts` (instruction assembly)
- Create: `vencord-plugin/opensnap-editor/src/editor/render/draw.ts` (canvas draw engine)
- Create: `vencord-plugin/opensnap-editor/src/editor/render/export.ts` (export to PNG blob)
- Create: `vencord-plugin/opensnap-editor/src/editor/canvas/interaction.ts` (arrow drag helpers)
- Create: `vencord-plugin/opensnap-editor/src/editor/components/EditorSidebar.tsx` (controls UI)
- Create: `vencord-plugin/opensnap-editor/src/editor/components/EditorCanvas.tsx` (canvas preview)
- Create: `vencord-plugin/opensnap-editor/src/editor/components/EditorModal.tsx` (modal wrapper)
- Create: `vencord-plugin/opensnap-editor/src/plugin/attachments.ts` (pure attachment helpers)
- Tests: `vencord-plugin/opensnap-editor/src/**/__tests__/*.test.ts(x)`

---

### Task 1: Create plugin workspace and math utilities

**Files:**
- Create: `vencord-plugin/opensnap-editor/package.json`
- Create: `vencord-plugin/opensnap-editor/tsconfig.json`
- Create: `vencord-plugin/opensnap-editor/vitest.config.ts`
- Create: `vencord-plugin/opensnap-editor/src/editor/utils/math.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/math.test.ts`

- [ ] **Step 1: Add workspace config files**

```json
{
  "name": "vencord-opensnap-editor",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "jsdom": "^24.0.0",
    "typescript": "^5.2.2",
    "vitest": "^1.6.0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"]
  }
});
```

- [ ] **Step 2: Install dependencies**

Run (in `vencord-plugin/opensnap-editor`): `npm install`

- [ ] **Step 3: Write failing math tests**

```ts
import { describe, it, expect } from "vitest";
import { clamp, lerp } from "../utils/math";

describe("math", () => {
  it("clamps values", () => {
    expect(clamp(10, 0, 5)).toBe(5);
    expect(clamp(-2, 0, 5)).toBe(0);
  });

  it("lerps values", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
});
```

- [ ] **Step 4: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/math.test.ts`
Expected: FAIL with "Cannot find module '../utils/math'"

- [ ] **Step 5: Implement math utilities**

```ts
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
```

- [ ] **Step 6: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/math.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add vencord-plugin/opensnap-editor/package.json vencord-plugin/opensnap-editor/tsconfig.json vencord-plugin/opensnap-editor/vitest.config.ts vencord-plugin/opensnap-editor/src/editor/utils/math.ts vencord-plugin/opensnap-editor/src/editor/__tests__/math.test.ts
git commit -m "chore: add plugin workspace and math utils"
```

---

### Task 2: Define editor state types and defaults

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/state.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/state.test.ts`

- [ ] **Step 1: Write failing state tests**

```ts
import { describe, it, expect } from "vitest";
import { createDefaultEditorState } from "../state";

describe("editor state", () => {
  it("creates defaults from image size", () => {
    const state = createDefaultEditorState({ width: 1200, height: 800 });

    expect(state.background.type).toBe("transparent");
    expect(state.background.gradient.stops).toHaveLength(3);
    expect(state.effects.padding).toBe(40);
    expect(state.effects.borderRadius).toBe(16);
    expect(state.arrow.thickness).toBe(6);
    expect(state.arrow.start.x).toBe(240);
    expect(state.arrow.end.y).toBe(640);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/state.test.ts`
Expected: FAIL with "Cannot find module '../state'"

- [ ] **Step 3: Implement editor state types and defaults**

```ts
export type ImageSize = {
  width: number;
  height: number;
};

export type BackgroundType = "transparent" | "solid" | "gradient" | "image";
export type BackgroundImageFit = "cover" | "contain" | "stretch";

export type GradientStop = {
  id: string;
  color: string;
  position: number;
  enabled: boolean;
};

export type BackgroundState = {
  type: BackgroundType;
  solidColor: string;
  gradient: {
    angle: number;
    stops: GradientStop[];
  };
  image: {
    url: string;
    fit: BackgroundImageFit;
  };
};

export type ShadowState = {
  offsetX: number;
  offsetY: number;
  blur: number;
  opacity: number;
};

export type EffectsState = {
  padding: number;
  borderRadius: number;
  shadow: ShadowState;
};

export type Point = {
  x: number;
  y: number;
};

export type ArrowState = {
  start: Point;
  end: Point;
  color: string;
  thickness: number;
};

export type EditorState = {
  background: BackgroundState;
  effects: EffectsState;
  arrow: ArrowState;
};

export function createDefaultEditorState(imageSize: ImageSize): EditorState {
  return {
    background: {
      type: "transparent",
      solidColor: "#0B0D10",
      gradient: {
        angle: 135,
        stops: [
          { id: "start", color: "#0B0D10", position: 0, enabled: true },
          { id: "middle", color: "#1B1F24", position: 0.5, enabled: true },
          { id: "end", color: "#2B2F36", position: 1, enabled: true }
        ]
      },
      image: {
        url: "",
        fit: "cover"
      }
    },
    effects: {
      padding: 40,
      borderRadius: 16,
      shadow: {
        offsetX: 0,
        offsetY: 12,
        blur: 32,
        opacity: 0.35
      }
    },
    arrow: {
      start: { x: Math.round(imageSize.width * 0.2), y: Math.round(imageSize.height * 0.2) },
      end: { x: Math.round(imageSize.width * 0.8), y: Math.round(imageSize.height * 0.8) },
      color: "#FF5F5F",
      thickness: 6
    }
  };
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/state.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/state.ts vencord-plugin/opensnap-editor/src/editor/__tests__/state.test.ts
git commit -m "feat: add editor state defaults"
```

---

### Task 3: Add editor reducer and actions

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/reducer.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/reducer.test.ts`

- [ ] **Step 1: Write failing reducer tests**

```ts
import { describe, it, expect } from "vitest";
import { createDefaultEditorState } from "../state";
import { editorReducer } from "../reducer";

describe("editor reducer", () => {
  it("updates background type", () => {
    const state = createDefaultEditorState({ width: 800, height: 600 });
    const next = editorReducer(state, { type: "setBackgroundType", value: "solid" });

    expect(next.background.type).toBe("solid");
  });

  it("updates a gradient stop", () => {
    const state = createDefaultEditorState({ width: 800, height: 600 });
    const next = editorReducer(state, {
      type: "setGradientStop",
      id: "middle",
      color: "#FFFFFF",
      position: 0.4
    });

    const middle = next.background.gradient.stops.find(stop => stop.id === "middle");
    expect(middle?.color).toBe("#FFFFFF");
    expect(middle?.position).toBe(0.4);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/reducer.test.ts`
Expected: FAIL with "Cannot find module '../reducer'"

- [ ] **Step 3: Implement reducer and action types**

```ts
import type {
  BackgroundImageFit,
  BackgroundType,
  EditorState,
  Point,
  ShadowState
} from "./state";

export type EditorAction =
  | { type: "setBackgroundType"; value: BackgroundType }
  | { type: "setSolidColor"; value: string }
  | { type: "setGradientAngle"; value: number }
  | { type: "setGradientStop"; id: string; color?: string; position?: number; enabled?: boolean }
  | { type: "setBackgroundImageUrl"; value: string }
  | { type: "setBackgroundImageFit"; value: BackgroundImageFit }
  | { type: "setPadding"; value: number }
  | { type: "setBorderRadius"; value: number }
  | { type: "setShadow"; value: Partial<ShadowState> }
  | { type: "setArrowColor"; value: string }
  | { type: "setArrowThickness"; value: number }
  | { type: "setArrowStart"; value: Point }
  | { type: "setArrowEnd"; value: Point };

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "setBackgroundType":
      return { ...state, background: { ...state.background, type: action.value } };
    case "setSolidColor":
      return { ...state, background: { ...state.background, solidColor: action.value } };
    case "setGradientAngle":
      return {
        ...state,
        background: {
          ...state.background,
          gradient: { ...state.background.gradient, angle: action.value }
        }
      };
    case "setGradientStop":
      return {
        ...state,
        background: {
          ...state.background,
          gradient: {
            ...state.background.gradient,
            stops: state.background.gradient.stops.map(stop =>
              stop.id === action.id
                ? {
                    ...stop,
                    color: action.color ?? stop.color,
                    position: action.position ?? stop.position,
                    enabled: action.enabled ?? stop.enabled
                  }
                : stop
            )
          }
        }
      };
    case "setBackgroundImageUrl":
      return { ...state, background: { ...state.background, image: { ...state.background.image, url: action.value } } };
    case "setBackgroundImageFit":
      return { ...state, background: { ...state.background, image: { ...state.background.image, fit: action.value } } };
    case "setPadding":
      return { ...state, effects: { ...state.effects, padding: action.value } };
    case "setBorderRadius":
      return { ...state, effects: { ...state.effects, borderRadius: action.value } };
    case "setShadow":
      return { ...state, effects: { ...state.effects, shadow: { ...state.effects.shadow, ...action.value } } };
    case "setArrowColor":
      return { ...state, arrow: { ...state.arrow, color: action.value } };
    case "setArrowThickness":
      return { ...state, arrow: { ...state.arrow, thickness: action.value } };
    case "setArrowStart":
      return { ...state, arrow: { ...state.arrow, start: action.value } };
    case "setArrowEnd":
      return { ...state, arrow: { ...state.arrow, end: action.value } };
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/reducer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/reducer.ts vencord-plugin/opensnap-editor/src/editor/__tests__/reducer.test.ts
git commit -m "feat: add editor reducer"
```

---

### Task 4: Implement render layout utilities

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/render/types.ts`
- Create: `vencord-plugin/opensnap-editor/src/editor/render/layout.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/layout.test.ts`

- [ ] **Step 1: Write failing layout tests**

```ts
import { describe, it, expect } from "vitest";
import { computeCanvasLayout, computePreviewScale } from "../render/layout";

describe("layout", () => {
  it("computes canvas size from padding", () => {
    const layout = computeCanvasLayout({ width: 1000, height: 500 }, 40);

    expect(layout.canvas.width).toBe(1080);
    expect(layout.canvas.height).toBe(580);
    expect(layout.image.x).toBe(40);
    expect(layout.image.width).toBe(1000);
  });

  it("computes preview scale", () => {
    expect(computePreviewScale({ width: 1000, height: 500 }, 900)).toBe(0.9);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/layout.test.ts`
Expected: FAIL with "Cannot find module '../render/layout'"

- [ ] **Step 3: Implement render types and layout utilities**

```ts
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasLayout = {
  canvas: { width: number; height: number };
  image: Rect;
};
```

```ts
import type { CanvasLayout } from "./types";

export function computeCanvasLayout(imageSize: { width: number; height: number }, padding: number): CanvasLayout {
  return {
    canvas: {
      width: imageSize.width + padding * 2,
      height: imageSize.height + padding * 2
    },
    image: {
      x: padding,
      y: padding,
      width: imageSize.width,
      height: imageSize.height
    }
  };
}

export function computePreviewScale(canvasSize: { width: number; height: number }, maxSize: number): number {
  const scale = Math.min(maxSize / canvasSize.width, maxSize / canvasSize.height, 1);
  return Math.round(scale * 1000) / 1000;
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/render/types.ts vencord-plugin/opensnap-editor/src/editor/render/layout.ts vencord-plugin/opensnap-editor/src/editor/__tests__/layout.test.ts
git commit -m "feat: add layout utilities"
```

---

### Task 5: Build background instructions

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/render/background.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/background.test.ts`

- [ ] **Step 1: Write failing background tests**

```ts
import { describe, it, expect } from "vitest";
import { buildBackgroundInstructions } from "../render/background";
import type { BackgroundState } from "../state";

const layout = {
  canvas: { width: 300, height: 200 },
  image: { x: 20, y: 20, width: 260, height: 160 }
};

describe("background instructions", () => {
  it("builds solid background", () => {
    const background: BackgroundState = {
      type: "solid",
      solidColor: "#111111",
      gradient: { angle: 0, stops: [] },
      image: { url: "", fit: "cover" }
    };

    const instructions = buildBackgroundInstructions(background, layout, null);
    expect(instructions[0].kind).toBe("fillSolid");
  });

  it("builds gradient background", () => {
    const background: BackgroundState = {
      type: "gradient",
      solidColor: "#111111",
      gradient: {
        angle: 45,
        stops: [
          { id: "start", color: "#000000", position: 0, enabled: true },
          { id: "end", color: "#FFFFFF", position: 1, enabled: true }
        ]
      },
      image: { url: "", fit: "cover" }
    };

    const instructions = buildBackgroundInstructions(background, layout, null);
    expect(instructions[0].kind).toBe("fillGradient");
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/background.test.ts`
Expected: FAIL with "Cannot find module '../render/background'"

- [ ] **Step 3: Implement background instruction builder**

```ts
import type { BackgroundState } from "../state";
import type { CanvasLayout, DrawInstruction } from "./types";

export function buildBackgroundInstructions(
  background: BackgroundState,
  layout: CanvasLayout,
  backgroundImage: ImageBitmap | null
): DrawInstruction[] {
  const rect = layout.canvas;

  switch (background.type) {
    case "transparent":
      return [];
    case "solid":
      return [{ kind: "fillSolid", rect: { x: 0, y: 0, width: rect.width, height: rect.height }, color: background.solidColor }];
    case "gradient":
      return [
        {
          kind: "fillGradient",
          rect: { x: 0, y: 0, width: rect.width, height: rect.height },
          angle: background.gradient.angle,
          stops: background.gradient.stops.filter(stop => stop.enabled)
        }
      ];
    case "image":
      if (!backgroundImage) {
        return [{ kind: "fillSolid", rect: { x: 0, y: 0, width: rect.width, height: rect.height }, color: background.solidColor }];
      }

      return [
        {
          kind: "drawBackgroundImage",
          rect: { x: 0, y: 0, width: rect.width, height: rect.height },
          bitmap: backgroundImage,
          fit: background.image.fit
        }
      ];
    default:
      return [];
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/background.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/render/background.ts vencord-plugin/opensnap-editor/src/editor/__tests__/background.test.ts
git commit -m "feat: add background instructions"
```

---

### Task 6: Build effects instructions

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/render/effects.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/effects.test.ts`

- [ ] **Step 1: Write failing effects tests**

```ts
import { describe, it, expect } from "vitest";
import { buildEffectsInstructions } from "../render/effects";
import type { EffectsState } from "../state";

const layout = {
  canvas: { width: 300, height: 200 },
  image: { x: 20, y: 20, width: 260, height: 160 }
};

describe("effects instructions", () => {
  it("returns shadow instruction when opacity > 0", () => {
    const effects: EffectsState = {
      padding: 40,
      borderRadius: 12,
      shadow: { offsetX: 0, offsetY: 10, blur: 24, opacity: 0.5 }
    };

    const instructions = buildEffectsInstructions(effects, layout);
    expect(instructions[0].kind).toBe("drawShadow");
  });

  it("returns no shadow when opacity is 0", () => {
    const effects: EffectsState = {
      padding: 40,
      borderRadius: 12,
      shadow: { offsetX: 0, offsetY: 10, blur: 24, opacity: 0 }
    };

    const instructions = buildEffectsInstructions(effects, layout);
    expect(instructions).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/effects.test.ts`
Expected: FAIL with "Cannot find module '../render/effects'"

- [ ] **Step 3: Implement effects instruction builder**

```ts
import type { EffectsState } from "../state";
import type { CanvasLayout, DrawInstruction } from "./types";

export function buildEffectsInstructions(effects: EffectsState, layout: CanvasLayout): DrawInstruction[] {
  if (effects.shadow.opacity <= 0) {
    return [];
  }

  return [
    {
      kind: "drawShadow",
      rect: layout.image,
      borderRadius: effects.borderRadius,
      shadow: effects.shadow
    }
  ];
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/effects.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/render/effects.ts vencord-plugin/opensnap-editor/src/editor/__tests__/effects.test.ts
git commit -m "feat: add effects instructions"
```

---

### Task 7: Build arrow instructions

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/render/arrow.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/arrow.test.ts`

- [ ] **Step 1: Write failing arrow tests**

```ts
import { describe, it, expect } from "vitest";
import { buildArrowInstruction } from "../render/arrow";

const layout = {
  canvas: { width: 300, height: 200 },
  image: { x: 20, y: 30, width: 260, height: 160 }
};

describe("arrow instructions", () => {
  it("maps arrow points into canvas space", () => {
    const instruction = buildArrowInstruction(
      { start: { x: 10, y: 20 }, end: { x: 30, y: 40 }, color: "#FF0000", thickness: 4 },
      layout
    );

    expect(instruction.start.x).toBe(30);
    expect(instruction.start.y).toBe(50);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/arrow.test.ts`
Expected: FAIL with "Cannot find module '../render/arrow'"

- [ ] **Step 3: Implement arrow instruction builder**

```ts
import type { ArrowState } from "../state";
import type { CanvasLayout, DrawInstruction } from "./types";

export function buildArrowInstruction(arrow: ArrowState, layout: CanvasLayout): DrawInstruction {
  return {
    kind: "drawArrow",
    start: { x: layout.image.x + arrow.start.x, y: layout.image.y + arrow.start.y },
    end: { x: layout.image.x + arrow.end.x, y: layout.image.y + arrow.end.y },
    color: arrow.color,
    thickness: arrow.thickness
  };
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/arrow.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/render/arrow.ts vencord-plugin/opensnap-editor/src/editor/__tests__/arrow.test.ts
git commit -m "feat: add arrow instructions"
```

---

### Task 8: Assemble compositor instructions and draw engine

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/render/compositor.ts`
- Create: `vencord-plugin/opensnap-editor/src/editor/render/draw.ts`
- Create: `vencord-plugin/opensnap-editor/src/editor/render/export.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/compositor.test.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/draw.test.ts`

- [ ] **Step 1: Write failing compositor test**

```ts
import { describe, it, expect } from "vitest";
import { buildCompositorInstructions } from "../render/compositor";
import { createDefaultEditorState } from "../state";

const layout = {
  canvas: { width: 300, height: 200 },
  image: { x: 20, y: 20, width: 260, height: 160 }
};

describe("compositor instructions", () => {
  it("orders background, shadow, image, arrow", () => {
    const state = createDefaultEditorState({ width: 260, height: 160 });
    state.background.type = "solid";
    const instructions = buildCompositorInstructions(state, layout, {
      sourceImage: {} as ImageBitmap,
      backgroundImage: null
    });

    expect(instructions.map(item => item.kind)).toEqual([
      "fillSolid",
      "drawShadow",
      "drawImage",
      "drawArrow"
    ]);
  });
});
```

- [ ] **Step 2: Write failing draw engine test**

```ts
import { describe, it, expect } from "vitest";
import { drawInstructions } from "../render/draw";
import type { DrawInstruction } from "../render/types";

function createMockContext() {
  const calls: string[] = [];
  const ctx = {
    save: () => calls.push("save"),
    restore: () => calls.push("restore"),
    beginPath: () => calls.push("beginPath"),
    closePath: () => calls.push("closePath"),
    moveTo: () => calls.push("moveTo"),
    lineTo: () => calls.push("lineTo"),
    stroke: () => calls.push("stroke"),
    fill: () => calls.push("fill"),
    fillRect: () => calls.push("fillRect"),
    drawImage: () => calls.push("drawImage"),
    setTransform: () => calls.push("setTransform"),
    createLinearGradient: () => ({ addColorStop: () => undefined }),
    set lineWidth(_: number) {},
    set strokeStyle(_: string) {},
    set fillStyle(_: string | CanvasGradient) {},
    set shadowColor(_: string) {},
    set shadowBlur(_: number) {},
    set shadowOffsetX(_: number) {},
    set shadowOffsetY(_: number) {}
  } as unknown as CanvasRenderingContext2D;

  return { ctx, calls };
}

describe("draw engine", () => {
  it("draws fill and arrow", () => {
    const { ctx, calls } = createMockContext();

    const instructions: DrawInstruction[] = [
      { kind: "fillSolid", rect: { x: 0, y: 0, width: 100, height: 100 }, color: "#000000" },
      { kind: "drawArrow", start: { x: 10, y: 10 }, end: { x: 40, y: 40 }, color: "#FF0000", thickness: 4 }
    ];

    drawInstructions(ctx, instructions);
    expect(calls).toContain("fillRect");
    expect(calls).toContain("stroke");
  });
});
```

- [ ] **Step 3: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/compositor.test.ts src/editor/__tests__/draw.test.ts`
Expected: FAIL with "Cannot find module '../render/compositor'" and "../render/draw"

- [ ] **Step 4: Implement compositor and draw engine**

```ts
import type { EditorState } from "../state";
import type { CanvasLayout, DrawInstruction } from "./types";
import { buildBackgroundInstructions } from "./background";
import { buildEffectsInstructions } from "./effects";
import { buildArrowInstruction } from "./arrow";

export type CompositorAssets = {
  sourceImage: ImageBitmap;
  backgroundImage: ImageBitmap | null;
};

export function buildCompositorInstructions(
  state: EditorState,
  layout: CanvasLayout,
  assets: CompositorAssets
): DrawInstruction[] {
  const instructions: DrawInstruction[] = [];

  instructions.push(...buildBackgroundInstructions(state.background, layout, assets.backgroundImage));
  instructions.push(...buildEffectsInstructions(state.effects, layout));
  instructions.push({
    kind: "drawImage",
    rect: layout.image,
    bitmap: assets.sourceImage,
    borderRadius: state.effects.borderRadius
  });
  instructions.push(buildArrowInstruction(state.arrow, layout));

  return instructions;
}
```

```ts
import type { DrawInstruction, Rect } from "./types";

function roundedRectPath(ctx: CanvasRenderingContext2D, rect: Rect, radius: number) {
  const r = Math.max(0, Math.min(radius, Math.min(rect.width, rect.height) / 2));
  ctx.beginPath();
  ctx.moveTo(rect.x + r, rect.y);
  ctx.lineTo(rect.x + rect.width - r, rect.y);
  ctx.lineTo(rect.x + rect.width, rect.y + r);
  ctx.lineTo(rect.x + rect.width, rect.y + rect.height - r);
  ctx.lineTo(rect.x + rect.width - r, rect.y + rect.height);
  ctx.lineTo(rect.x + r, rect.y + rect.height);
  ctx.lineTo(rect.x, rect.y + rect.height - r);
  ctx.lineTo(rect.x, rect.y + r);
  ctx.closePath();
}

function computeGradientPoints(rect: Rect, angle: number) {
  const radians = (angle * Math.PI) / 180;
  const x = Math.cos(radians);
  const y = Math.sin(radians);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const length = Math.abs(rect.width / 2 * x) + Math.abs(rect.height / 2 * y);

  return {
    x0: cx - x * length,
    y0: cy - y * length,
    x1: cx + x * length,
    y1: cy + y * length
  };
}

function computeImageFit(rect: Rect, bitmap: ImageBitmap, fit: "cover" | "contain" | "stretch") {
  if (fit === "stretch") {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  const imageRatio = bitmap.width / bitmap.height;
  const rectRatio = rect.width / rect.height;
  const shouldCover = fit === "cover";
  const scale = shouldCover
    ? imageRatio > rectRatio
      ? rect.height / bitmap.height
      : rect.width / bitmap.width
    : imageRatio > rectRatio
      ? rect.width / bitmap.width
      : rect.height / bitmap.height;

  const width = bitmap.width * scale;
  const height = bitmap.height * scale;
  const x = rect.x + (rect.width - width) / 2;
  const y = rect.y + (rect.height - height) / 2;

  return { x, y, width, height };
}

export function drawInstructions(ctx: CanvasRenderingContext2D, instructions: DrawInstruction[]) {
  for (const instruction of instructions) {
    switch (instruction.kind) {
      case "fillSolid":
        ctx.fillStyle = instruction.color;
        ctx.fillRect(instruction.rect.x, instruction.rect.y, instruction.rect.width, instruction.rect.height);
        break;
      case "fillGradient": {
        const { x0, y0, x1, y1 } = computeGradientPoints(instruction.rect, instruction.angle);
        const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
        for (const stop of instruction.stops) {
          gradient.addColorStop(stop.position, stop.color);
        }
        ctx.fillStyle = gradient;
        ctx.fillRect(instruction.rect.x, instruction.rect.y, instruction.rect.width, instruction.rect.height);
        break;
      }
      case "drawBackgroundImage": {
        const fitted = computeImageFit(instruction.rect, instruction.bitmap, instruction.fit);
        ctx.drawImage(instruction.bitmap, fitted.x, fitted.y, fitted.width, fitted.height);
        break;
      }
      case "drawShadow": {
        ctx.save();
        ctx.shadowColor = `rgba(0, 0, 0, ${instruction.shadow.opacity})`;
        ctx.shadowBlur = instruction.shadow.blur;
        ctx.shadowOffsetX = instruction.shadow.offsetX;
        ctx.shadowOffsetY = instruction.shadow.offsetY;
        roundedRectPath(ctx, instruction.rect, instruction.borderRadius);
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fill();
        ctx.restore();
        break;
      }
      case "drawImage": {
        if (instruction.borderRadius > 0) {
          ctx.save();
          roundedRectPath(ctx, instruction.rect, instruction.borderRadius);
          ctx.clip();
          ctx.drawImage(instruction.bitmap, instruction.rect.x, instruction.rect.y, instruction.rect.width, instruction.rect.height);
          ctx.restore();
        } else {
          ctx.drawImage(instruction.bitmap, instruction.rect.x, instruction.rect.y, instruction.rect.width, instruction.rect.height);
        }
        break;
      }
      case "drawArrow":
        ctx.beginPath();
        ctx.moveTo(instruction.start.x, instruction.start.y);
        ctx.lineTo(instruction.end.x, instruction.end.y);
        ctx.lineWidth = instruction.thickness;
        ctx.strokeStyle = instruction.color;
        ctx.stroke();
        break;
    }
  }
}
```

```ts
import { drawInstructions } from "./draw";
import type { DrawInstruction } from "./types";

export async function renderToBlob(
  canvasSize: { width: number; height: number },
  instructions: DrawInstruction[]
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  drawInstructions(ctx, instructions);

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) {
    throw new Error("Failed to export image");
  }

  return blob;
}
```

- [ ] **Step 5: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/compositor.test.ts src/editor/__tests__/draw.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/render/compositor.ts vencord-plugin/opensnap-editor/src/editor/render/draw.ts vencord-plugin/opensnap-editor/src/editor/render/export.ts vencord-plugin/opensnap-editor/src/editor/__tests__/compositor.test.ts vencord-plugin/opensnap-editor/src/editor/__tests__/draw.test.ts
git commit -m "feat: add compositor and draw engine"
```

---

### Task 9: Add canvas interaction helpers

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/canvas/interaction.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/interaction.test.ts`

- [ ] **Step 1: Write failing interaction tests**

```ts
import { describe, it, expect } from "vitest";
import { applyArrowDrag, hitTestArrowHandle } from "../canvas/interaction";

describe("canvas interaction", () => {
  it("detects arrow handle", () => {
    const handle = hitTestArrowHandle(
      { x: 10, y: 10 },
      { start: { x: 10, y: 10 }, end: { x: 50, y: 50 }, color: "#fff", thickness: 4 },
      6
    );
    expect(handle).toBe("start");
  });

  it("updates arrow start", () => {
    const updated = applyArrowDrag(
      { start: { x: 10, y: 10 }, end: { x: 50, y: 50 }, color: "#fff", thickness: 4 },
      "start",
      { x: 20, y: 30 }
    );
    expect(updated.start.x).toBe(20);
    expect(updated.start.y).toBe(30);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/interaction.test.ts`
Expected: FAIL with "Cannot find module '../canvas/interaction'"

- [ ] **Step 3: Implement interaction helpers**

```ts
import type { ArrowState, Point } from "../state";

export type ArrowHandle = "start" | "end" | "none";

export function hitTestArrowHandle(point: Point, arrow: ArrowState, radius: number): ArrowHandle {
  const distStart = Math.hypot(point.x - arrow.start.x, point.y - arrow.start.y);
  if (distStart <= radius) {
    return "start";
  }

  const distEnd = Math.hypot(point.x - arrow.end.x, point.y - arrow.end.y);
  if (distEnd <= radius) {
    return "end";
  }

  return "none";
}

export function applyArrowDrag(arrow: ArrowState, handle: ArrowHandle, point: Point): ArrowState {
  if (handle === "start") {
    return { ...arrow, start: point };
  }

  if (handle === "end") {
    return { ...arrow, end: point };
  }

  return arrow;
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/interaction.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/canvas/interaction.ts vencord-plugin/opensnap-editor/src/editor/__tests__/interaction.test.ts
git commit -m "feat: add canvas interaction helpers"
```

---

### Task 10: Build sidebar controls UI

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/components/EditorSidebar.tsx`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/EditorSidebar.test.tsx`

- [ ] **Step 1: Write failing sidebar tests**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorSidebar } from "../components/EditorSidebar";
import { createDefaultEditorState } from "../state";

describe("EditorSidebar", () => {
  it("dispatches background type change", async () => {
    const dispatch = vi.fn();
    const state = createDefaultEditorState({ width: 800, height: 600 });

    render(<EditorSidebar state={state} dispatch={dispatch} />);
    await userEvent.click(screen.getByTestId("bg-transparent"));

    expect(dispatch).toHaveBeenCalledWith({ type: "setBackgroundType", value: "transparent" });
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/EditorSidebar.test.tsx`
Expected: FAIL with "Cannot find module '../components/EditorSidebar'"

- [ ] **Step 3: Implement sidebar component**

```tsx
import type { EditorAction } from "../reducer";
import type { EditorState } from "../state";

type Props = {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
};

export function EditorSidebar({ state, dispatch }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 280 }}>
      <section>
        <h3 style={{ marginBottom: 8 }}>Background</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button data-testid="bg-transparent" onClick={() => dispatch({ type: "setBackgroundType", value: "transparent" })}>
            Transparent
          </button>
          <button onClick={() => dispatch({ type: "setBackgroundType", value: "solid" })}>Solid</button>
          <button onClick={() => dispatch({ type: "setBackgroundType", value: "gradient" })}>Gradient</button>
          <button onClick={() => dispatch({ type: "setBackgroundType", value: "image" })}>Image</button>
        </div>

        <label style={{ display: "block", marginBottom: 6 }}>
          Solid Color
          <input
            type="color"
            value={state.background.solidColor}
            onChange={event => dispatch({ type: "setSolidColor", value: event.target.value })}
          />
        </label>

        <label style={{ display: "block", marginBottom: 6 }}>
          Gradient Angle
          <input
            type="range"
            min={0}
            max={360}
            value={state.background.gradient.angle}
            onChange={event => dispatch({ type: "setGradientAngle", value: Number(event.target.value) })}
          />
        </label>

        {state.background.gradient.stops.map(stop => (
          <label key={stop.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={stop.enabled}
              onChange={event => dispatch({ type: "setGradientStop", id: stop.id, enabled: event.target.checked })}
            />
            <input
              type="color"
              value={stop.color}
              onChange={event => dispatch({ type: "setGradientStop", id: stop.id, color: event.target.value })}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={stop.position}
              onChange={event => dispatch({ type: "setGradientStop", id: stop.id, position: Number(event.target.value) })}
            />
          </label>
        ))}

        <label style={{ display: "block", marginBottom: 6 }}>
          Background Image URL
          <input
            type="text"
            value={state.background.image.url}
            onChange={event => dispatch({ type: "setBackgroundImageUrl", value: event.target.value })}
          />
        </label>

        <label style={{ display: "block" }}>
          Image Fit
          <select
            value={state.background.image.fit}
            onChange={event => dispatch({ type: "setBackgroundImageFit", value: event.target.value as "cover" | "contain" | "stretch" })}
          >
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="stretch">Stretch</option>
          </select>
        </label>
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>Effects</h3>
        <label style={{ display: "block", marginBottom: 6 }}>
          Padding
          <input
            type="range"
            min={0}
            max={200}
            value={state.effects.padding}
            onChange={event => dispatch({ type: "setPadding", value: Number(event.target.value) })}
          />
        </label>
        <label style={{ display: "block", marginBottom: 6 }}>
          Border Radius
          <input
            type="range"
            min={0}
            max={120}
            value={state.effects.borderRadius}
            onChange={event => dispatch({ type: "setBorderRadius", value: Number(event.target.value) })}
          />
        </label>
        <label style={{ display: "block", marginBottom: 6 }}>
          Shadow Blur
          <input
            type="range"
            min={0}
            max={120}
            value={state.effects.shadow.blur}
            onChange={event => dispatch({ type: "setShadow", value: { blur: Number(event.target.value) } })}
          />
        </label>
      </section>

      <section>
        <h3 style={{ marginBottom: 8 }}>Annotation</h3>
        <label style={{ display: "block", marginBottom: 6 }}>
          Arrow Color
          <input
            type="color"
            value={state.arrow.color}
            onChange={event => dispatch({ type: "setArrowColor", value: event.target.value })}
          />
        </label>
        <label style={{ display: "block" }}>
          Arrow Thickness
          <input
            type="range"
            min={1}
            max={20}
            value={state.arrow.thickness}
            onChange={event => dispatch({ type: "setArrowThickness", value: Number(event.target.value) })}
          />
        </label>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/EditorSidebar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/components/EditorSidebar.tsx vencord-plugin/opensnap-editor/src/editor/__tests__/EditorSidebar.test.tsx
git commit -m "feat: add editor sidebar UI"
```

---

### Task 11: Implement editor canvas and modal wiring

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/editor/components/EditorCanvas.tsx`
- Create: `vencord-plugin/opensnap-editor/src/editor/components/EditorModal.tsx`
- Create: `vencord-plugin/opensnap-editor/src/editor/utils/image.ts`
- Test: `vencord-plugin/opensnap-editor/src/editor/__tests__/canvas.test.ts`

- [ ] **Step 1: Write failing canvas tests**

```ts
import { describe, it, expect } from "vitest";
import { clampPointToImage } from "../components/EditorCanvas";

describe("canvas helpers", () => {
  it("clamps points inside image bounds", () => {
    const point = clampPointToImage({ x: -10, y: 400 }, { width: 200, height: 300 });
    expect(point.x).toBe(0);
    expect(point.y).toBe(300);
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/canvas.test.ts`
Expected: FAIL with "Cannot find module '../components/EditorCanvas'"

- [ ] **Step 3: Implement image utilities**

```ts
export async function loadImageBitmapFromUrl(url: string): Promise<ImageBitmap> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to load image");
  }
  const blob = await response.blob();
  return createImageBitmap(blob);
}

export async function loadImageBitmapFromFile(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}
```

- [ ] **Step 4: Implement editor canvas**

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { EditorAction } from "../reducer";
import type { EditorState, Point } from "../state";
import { buildCompositorInstructions } from "../render/compositor";
import { computeCanvasLayout, computePreviewScale } from "../render/layout";
import { drawInstructions } from "../render/draw";
import { applyArrowDrag, hitTestArrowHandle } from "../canvas/interaction";
import { clamp } from "../utils/math";

type Props = {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  sourceImage: ImageBitmap;
  backgroundImage: ImageBitmap | null;
};

export function clampPointToImage(point: Point, imageSize: { width: number; height: number }): Point {
  return {
    x: clamp(point.x, 0, imageSize.width),
    y: clamp(point.y, 0, imageSize.height)
  };
}

export function EditorCanvas({ state, dispatch, sourceImage, backgroundImage }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragHandle, setDragHandle] = useState<"start" | "end" | "none">("none");

  const layout = useMemo(() => computeCanvasLayout({ width: sourceImage.width, height: sourceImage.height }, state.effects.padding), [sourceImage, state.effects.padding]);
  const previewScale = useMemo(() => computePreviewScale(layout.canvas, 900), [layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    canvas.width = Math.round(layout.canvas.width * previewScale);
    canvas.height = Math.round(layout.canvas.height * previewScale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.setTransform(previewScale, 0, 0, previewScale, 0, 0);

    const instructions = buildCompositorInstructions(state, layout, {
      sourceImage,
      backgroundImage
    });
    drawInstructions(ctx, instructions);
  }, [state, sourceImage, backgroundImage, layout, previewScale]);

  function getImagePoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasPoint = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };

    const imagePoint = {
      x: canvasPoint.x / previewScale - layout.image.x,
      y: canvasPoint.y / previewScale - layout.image.y
    };

    return clampPointToImage(imagePoint, { width: layout.image.width, height: layout.image.height });
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={event => {
        const point = getImagePoint(event);
        if (!point) return;
        const handle = hitTestArrowHandle(point, state.arrow, 10);
        setDragHandle(handle);
      }}
      onPointerMove={event => {
        if (dragHandle === "none") return;
        const point = getImagePoint(event);
        if (!point) return;
        const updated = applyArrowDrag(state.arrow, dragHandle, point);
        if (dragHandle === "start") {
          dispatch({ type: "setArrowStart", value: updated.start });
        }
        if (dragHandle === "end") {
          dispatch({ type: "setArrowEnd", value: updated.end });
        }
      }}
      onPointerUp={() => setDragHandle("none")}
      onPointerLeave={() => setDragHandle("none")}
      style={{ width: "100%", height: "100%", borderRadius: 8, background: "var(--background-secondary)" }}
    />
  );
}
```

- [ ] **Step 5: Implement modal wrapper**

```tsx
import { useEffect, useReducer, useState } from "react";
import { createDefaultEditorState } from "../state";
import { editorReducer } from "../reducer";
import { EditorSidebar } from "./EditorSidebar";
import { EditorCanvas } from "./EditorCanvas";
import { buildCompositorInstructions } from "../render/compositor";
import { computeCanvasLayout } from "../render/layout";
import { renderToBlob } from "../render/export";
import { loadImageBitmapFromUrl } from "../utils/image";

type Props = {
  sourceImage: ImageBitmap;
  onApply: (blob: Blob) => void;
  onClose: () => void;
};

export function EditorModal({ sourceImage, onApply, onClose }: Props) {
  const [state, dispatch] = useReducer(
    editorReducer,
    createDefaultEditorState({ width: sourceImage.width, height: sourceImage.height })
  );
  const [backgroundImage, setBackgroundImage] = useState<ImageBitmap | null>(null);

  useEffect(() => {
    if (state.background.type !== "image" || !state.background.image.url) {
      setBackgroundImage(null);
      return;
    }

    loadImageBitmapFromUrl(state.background.image.url)
      .then(setBackgroundImage)
      .catch(() => setBackgroundImage(null));
  }, [state.background.type, state.background.image.url]);

  async function handleApply() {
    const layout = computeCanvasLayout({ width: sourceImage.width, height: sourceImage.height }, state.effects.padding);
    const instructions = buildCompositorInstructions(state, layout, { sourceImage, backgroundImage });
    const blob = await renderToBlob(layout.canvas, instructions);
    onApply(blob);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "90vw", height: "80vh" }}>
      <div style={{ display: "flex", gap: 16, flex: 1 }}>
        <div style={{ flex: 1, borderRadius: 12, background: "var(--background-secondary)", padding: 12 }}>
          <EditorCanvas state={state} dispatch={dispatch} sourceImage={sourceImage} backgroundImage={backgroundImage} />
        </div>
        <EditorSidebar state={state} dispatch={dispatch} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose}>Cancel</button>
        <button onClick={handleApply}>Apply</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/editor/__tests__/canvas.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/editor/components/EditorCanvas.tsx vencord-plugin/opensnap-editor/src/editor/components/EditorModal.tsx vencord-plugin/opensnap-editor/src/editor/utils/image.ts vencord-plugin/opensnap-editor/src/editor/__tests__/canvas.test.ts
git commit -m "feat: add editor canvas and modal"
```

---

### Task 12: Integrate Vencord plugin and attachment replacement

**Files:**
- Create: `vencord-plugin/opensnap-editor/src/plugin/attachments.ts`
- Create: `vencord-plugin/opensnap-editor/src/index.tsx`
- Test: `vencord-plugin/opensnap-editor/src/plugin/__tests__/attachments.test.ts`

- [ ] **Step 1: Write failing attachment tests**

```ts
import { describe, it, expect } from "vitest";
import { selectPendingImageUpload, makeEditedFileName } from "../attachments";

describe("attachment helpers", () => {
  it("selects first image upload", () => {
    const upload = selectPendingImageUpload([
      { id: "1", filename: "doc.pdf", mimeType: "application/pdf" },
      { id: "2", filename: "photo.png", mimeType: "image/png" }
    ]);

    expect(upload?.id).toBe("2");
  });

  it("adds edited suffix", () => {
    expect(makeEditedFileName("photo.png")).toBe("photo-edited.png");
  });
});
```

- [ ] **Step 2: Run tests to confirm failure**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/plugin/__tests__/attachments.test.ts`
Expected: FAIL with "Cannot find module '../attachments'"

- [ ] **Step 3: Implement attachment helpers**

```ts
export type PendingUpload = {
  id: string;
  filename: string;
  mimeType: string;
};

export function selectPendingImageUpload(uploads: PendingUpload[]): PendingUpload | null {
  return uploads.find(upload => upload.mimeType.startsWith("image/")) ?? null;
}

export function makeEditedFileName(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    return `${filename}-edited.png`;
  }

  const base = filename.slice(0, lastDot);
  const ext = filename.slice(lastDot);
  return `${base}-edited${ext}`;
}
```

- [ ] **Step 4: Implement Vencord plugin entry**

```tsx
import { definePlugin } from "@utils/types";
import { findByDisplayName, findByProps } from "@webpack";
import { React, useStateFromStores } from "@webpack/common";
import { openModal } from "@utils/modal";
import { EditorModal } from "./editor/components/EditorModal";
import { loadImageBitmapFromFile } from "./editor/utils/image";
import { makeEditedFileName, selectPendingImageUpload } from "./plugin/attachments";

const ChannelTextAreaContainer = findByDisplayName("ChannelTextAreaContainer", false);
const UploadStore = findByProps("getUploads", "getUpload");
const UploadManager = findByProps("addFile", "removeFile");
const SelectedChannelStore = findByProps("getChannelId");

function usePendingImageUpload() {
  return useStateFromStores([UploadStore, SelectedChannelStore], () => {
    const channelId = SelectedChannelStore.getChannelId();
    const uploads = UploadStore.getUploads(channelId) ?? [];
    return selectPendingImageUpload(uploads);
  });
}

function openEditor(pendingUpload: any) {
  openModal(modalProps => {
    const file = pendingUpload.file;

    return (
      <EditorModal
        sourceImage={modalProps.resolvePromise(loadImageBitmapFromFile(file))}
        onApply={async blob => {
          const channelId = SelectedChannelStore.getChannelId();
          UploadManager.removeFile(pendingUpload.id, channelId);
          const editedFile = new File([blob], makeEditedFileName(file.name), { type: "image/png" });
          UploadManager.addFile(editedFile, channelId);
          modalProps.onClose();
        }}
        onClose={modalProps.onClose}
      />
    );
  });
}

function EditImageButton() {
  const pendingUpload = usePendingImageUpload();

  return (
    <button
      disabled={!pendingUpload}
      onClick={() => pendingUpload && openEditor(pendingUpload)}
      style={{ marginRight: 8 }}
    >
      Edit Image
    </button>
  );
}

export default definePlugin({
  name: "OpenSnapEditor",
  description: "Edit pending image uploads with OpenSnap-style backgrounds and arrows",
  start() {
    this.patcher.after(ChannelTextAreaContainer, "type", (_, __, res) => {
      const children = res.props.children;
      if (Array.isArray(children)) {
        children.unshift(<EditImageButton key="opensnap-edit" />);
      }
    });
  },
  stop() {
    this.patcher.unpatchAll();
  }
});
```

- [ ] **Step 5: Run tests to confirm pass**

Run (in `vencord-plugin/opensnap-editor`): `npm test -- src/plugin/__tests__/attachments.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add vencord-plugin/opensnap-editor/src/plugin/attachments.ts vencord-plugin/opensnap-editor/src/plugin/__tests__/attachments.test.ts vencord-plugin/opensnap-editor/src/index.tsx
git commit -m "feat: add Vencord integration"
```

---

## Plan Self-Review

- Spec coverage: All requested features are covered: transparent/solid/gradient/image backgrounds, effects (padding/border radius/shadow), arrow tool, replace pending attachment, Discord-native UI via modal and composer button.
- Placeholder scan: No TBD/TODO language present.
- Type consistency: Editor state types are used consistently across reducer, render, and UI.

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-04-03-vencord-opensnap-editor.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
