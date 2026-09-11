/** Cheap synchronous WebGL capability check — used to decide whether to even
 *  attempt mounting the 3D podium, so an old/headless projector box falls
 *  back to the flat 2D winner reveal instead of a blank canvas. */
export function hasWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
