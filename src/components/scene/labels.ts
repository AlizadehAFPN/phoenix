/**
 * Labels that live in the DOM but are pinned to points on the globe.
 *
 * The scene's frame loop projects each point to the screen and writes the
 * result straight into the label's element: no portal, no second React
 * root, no re-render. `SceneLabels` renders the elements and registers them
 * here; `Route` positions them.
 */

const elements = new Map<string, HTMLElement>();

export function registerLabel(id: string, element: HTMLElement | null): void {
  if (element === null) elements.delete(id);
  else elements.set(id, element);
}

/**
 * Places a label at a screen position, or hides it. The element's own CSS
 * handles its offset from the point and its fade.
 */
export function placeLabel(
  id: string,
  x: number,
  y: number,
  visible: boolean,
): void {
  const element = elements.get(id);
  if (element === undefined) return;
  const shown = visible ? "true" : "false";
  if (element.dataset.visible !== shown) element.dataset.visible = shown;
  if (visible) {
    element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  }
}
