// Type declarations for Replit-specific Vite plugins (only available on Replit platform)
declare module "@replit/vite-plugin-runtime-error-modal" {
  import type { Plugin } from "vite";
  export default function runtimeErrorOverlay(): Plugin;
}

declare module "@replit/vite-plugin-cartographer" {
  import type { Plugin } from "vite";
  export function cartographer(): Plugin;
}

declare module "@replit/vite-plugin-dev-banner" {
  import type { Plugin } from "vite";
  export function devBanner(): Plugin;
}
