declare module "semver" {
  export function valid(version: string): string | null;
  export function gt(a: string, b: string): boolean;
  export function gte(a: string, b: string): boolean;
}
