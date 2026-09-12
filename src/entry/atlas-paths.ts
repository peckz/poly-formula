/** Bundled 5×5 driver head atlases (generated via `npm run generate:atlases`). */
export function bundledAtlasUrl(driverId: string): string {
  return `/sprites/drivers/${driverId}-atlas.png`
}
