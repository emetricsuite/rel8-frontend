/**
 * A client pack: everything that makes a standalone client's app its own.
 *
 * Exactly one pack is compiled into a build, chosen by VITE_CLIENT through the `@client`
 * alias in vite.config.ts, so one client's name and images never ship in another's bundle.
 * With VITE_CLIENT unset the build is the shared Rel8 app, unchanged.
 * See the backend CLAUDE.md, "Standalone clients".
 */
export interface ClientPack {
  key: string;
  /** Organization.shortName this build is locked to. Null for the shared app. */
  tenant: string | null;
  standalone: boolean;
  name: string;
  tagline: string | null;
  /** Paths inside the pack's public/ folder. */
  logo: string | null;
  authImage: string | null;
  homeImage: string | null;
  secondary: string | null;
  /** Replaces the Rel8 purple scale at build time. */
  palette: Record<string, string> | null;
  labels: { environment: string; environments: string };
}
