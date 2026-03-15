## Development Guidelines

This structure optimizes for testability and change isolation—small, focused units with clear boundaries.

### Fractal Architecture

**Pattern:** Pages contain Features, Features contain Sub-Features—each following the same structure.

- **Pages:** Top-level routes/screens
- **Features:** Distinct UI sections within a page (what you see on screen)
- **Sub-Features:** Nested functionality within a feature

Every feature is self-contained: its own hooks, utils, and child features live inside its directory.

### Directory Structure

**Naming Rule:** Avoid `index.tsx`. Main file matches directory name (`MyFeature/MyFeature.tsx`).

```
src/
├── config/          # Global constants & env vars
├── theme/           # Design tokens & styling
├── components/      # Shared UI primitives
├── hooks/           # Global hooks
├── utils/           # Global pure functions
└── pages/
    └── PageName/
        ├── PageName.tsx
        └── features/
            └── FeatureName/
                ├── FeatureName.tsx
                ├── hooks/
                ├── utils/
                └── features/
                    └── SubFeature/
                        ├── SubFeature.tsx
                        └── hooks/
```

### Code Standards

**Humble Components**
- TSX files contain markup and binding only
- Extract all logic to custom hooks: `const { data, handlers } = useFeatureLogic()`

**No Magic Numbers or Inline Styles**
- Constants go in `src/config/` or local `constants.ts`
- No hex codes, colors, or pixel values in TSX—reference theme tokens only
- Styling concerns live in the style system, not in markup. THIS IS A CRITICAL REQUIREMENT. We don’t want colors and sizes floating around unless unique and necessary.

**Co-location**
- Feature-specific hooks/utils live inside that feature's directory
- If SubFeature is only used by Parent, it lives in `Parent/features/SubFeature/`

**Quality**
- Lint-clean code
- Unit tests for critical logic (adjacent to source files)
- Visual testing highly preferred where valid and protective
