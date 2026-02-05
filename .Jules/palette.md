# Palette's Journal

## 2026-02-03 - Password Visibility Toggle Pattern
**Learning:** In `shadcn/ui` forms, input adornments (icons/buttons) are best implemented by wrapping the `Input` in a relative container and absolute positioning the adornment. `variant="ghost"` buttons need `hover:bg-transparent` when used inside inputs on custom backgrounds to avoid boxy artifacts.
**Action:** Use this relative wrapper pattern for all input suffixes (clear buttons, visibility toggles, units).
