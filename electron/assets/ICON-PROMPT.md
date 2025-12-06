# Tandem App Icon Design Prompt

## For AI Image Generation (nano banana pro / DALL-E / Midjourney)

### Primary Prompt

```
Create a modern, minimalist app icon for "Tandem" - a collaboration platform where humans and AI work together.

Design requirements:
- Square format, 1024x1024 pixels
- Clean, professional aesthetic suitable for macOS and Windows
- Flat design or subtle gradient (iOS/macOS style)
- Simple, recognizable symbol that works at small sizes (16px to 512px)

Visual concept:
- Two interconnected elements representing human-AI collaboration
- Option 1: Two overlapping circles or nodes with a connecting line
- Option 2: Stylized "T" made of two parts coming together
- Option 3: Two abstract figures side-by-side in tandem

Color palette:
- Primary: Modern blue (#3B82F6 or similar)
- Accent: Complementary purple or teal
- Background: White or very light gradient
- Avoid: Too many colors, complex gradients

Style references:
- Similar to: Slack, Notion, Linear app icons
- NOT like: Cluttered, 3D, skeuomorphic designs
- Think: Productivity tools, modern SaaS applications

The icon should convey:
- Collaboration and teamwork
- AI + Human partnership
- Simplicity and elegance
- Trust and professionalism
```

---

## Alternative Prompts (Try These Variations)

### Prompt 1: Geometric & Minimal
```
Design a minimalist app icon for "Tandem" collaboration software.
1024x1024px square. Two simple geometric shapes (circles or rounded rectangles)
overlapping or connected, representing human-AI collaboration.
Modern blue gradient (#3B82F6 to #6366F1). White background.
Flat design, crisp edges. Style: Similar to Notion or Linear app icons.
```

### Prompt 2: Abstract Duo
```
Create an abstract app icon showing two entities working in tandem.
1024x1024px. Two flowing curves or paths merging together.
Color: Gradient from blue (#3B82F6) to purple (#8B5CF6).
White or light background. Professional, modern, friendly.
Should work well at 16px and 512px sizes.
```

### Prompt 3: Letter-Based
```
Modern app icon featuring stylized "T" for Tandem.
1024x1024px square. The letter "T" composed of two distinct parts
(one representing human, one AI) fitting together perfectly.
Blue (#3B82F6) on white background. Sans-serif, geometric,
clean. Similar style to: Figma, Miro, or Airtable icons.
```

---

## Technical Specifications

### Size Requirements
- Canvas: 1024x1024 pixels
- Safe area: Keep important elements within 900x900px center
- Corner radius: 0 (square) for source file
- Format: PNG with transparency

### Color Guidelines
- **Primary Blue**: `#3B82F6` (Tailwind blue-500)
- **Secondary Purple**: `#8B5CF6` (Tailwind purple-500)
- **Accent Teal**: `#14B8A6` (Tailwind teal-500)
- **Background**: White `#FFFFFF` or very subtle gradient

### Design Principles
1. **Scalability**: Must be clear at 16x16px
2. **Simplicity**: Max 2-3 colors
3. **Memorability**: Unique but professional
4. **Consistency**: Fits modern app ecosystem

---

## Icon Concepts to Explore

### Concept A: Dual Nodes
- Two circles or dots
- Connected by a line or arc
- One solid, one with AI-style grid pattern
- Represents: Human ↔ AI connection

### Concept B: Tandem Bike
- Highly simplified, abstract bicycle silhouette
- Two seats representing collaboration
- Very minimal, geometric interpretation
- Represents: Working together, moving forward

### Concept C: Sync Symbol
- Two arrows or curves forming a cycle
- Enclosed in a rounded square
- Continuous flow feeling
- Represents: Synchronization, collaboration

### Concept D: Overlapping Squares
- Two rounded squares overlapping
- Intersection highlighted in gradient
- Clean, geometric
- Represents: Shared workspace, overlap of ideas

---

## Post-Generation Steps

Once you have the PNG icon (1024x1024):

1. **macOS (.icns)**:
   ```bash
   # Use online converter or iconutil
   # https://cloudconvert.com/png-to-icns
   ```

2. **Windows (.ico)**:
   ```bash
   # Use ImageMagick or online converter
   convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
   ```

3. **Place files**:
   - `icon.icns` → `electron/assets/icon.icns`
   - `icon.ico` → `electron/assets/icon.ico`

4. **Rebuild**:
   ```bash
   npm run dist:mac  # or dist:win
   ```

---

## Brand Guidelines

**Tandem** is:
- AI-native collaboration platform
- Professional but approachable
- Modern, clean, efficient
- Trustworthy and reliable

**NOT**:
- Playful or childish
- Corporate or stuffy
- Complicated or technical-looking
- Aggressive or harsh

---

## Quick Start Command

**For nano banana pro or similar tools:**

```
Generate a 1024x1024 app icon for "Tandem" collaboration software.
Two simple overlapping circles representing human-AI teamwork.
Modern blue (#3B82F6) gradient. White background. Flat, minimal design.
Professional productivity tool aesthetic.
```
