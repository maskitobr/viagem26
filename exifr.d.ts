declare module "exifr/dist/lite.esm.mjs" {
  export function gps(file: Blob): Promise<{ latitude: number; longitude: number } | undefined>;
  export function parse(file: Blob, options?: unknown): Promise<Record<string, any> | undefined>;
}
