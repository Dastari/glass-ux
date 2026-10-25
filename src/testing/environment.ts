const captures = new WeakMap<Element, Set<number>>();

/**
 * Install missing browser APIs in jsdom, returning a function that restores their descriptors.
 * Existing implementations are preserved. Observers are inert and matchMedia returns false:
 * supply real measurements or your own observer/media mock when testing layout or visibility.
 * Call once before renderWithGlass (for example in the test runner's setup file).
 */
export function installGlassTestEnvironment(): () => void {
  if (typeof window === "undefined")
    throw new Error("installGlassTestEnvironment requires a DOM environment");
  const restore: Array<() => void> = [];
  const missing = (object: object, key: PropertyKey, value: unknown) => {
    if (
      key in object &&
      (object as Record<PropertyKey, unknown>)[key] !== undefined
    )
      return;
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    Object.defineProperty(object, key, {
      configurable: true,
      writable: true,
      value,
    });
    restore.push(() => {
      if (descriptor) Object.defineProperty(object, key, descriptor);
      else Reflect.deleteProperty(object, key);
    });
  };
  const media = (query: string): MediaQueryList => ({
    media: query,
    matches: false,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  });
  missing(window, "matchMedia", media);
  missing(globalThis, "matchMedia", window.matchMedia);
  class ResizeObserverShim {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  class IntersectionObserverShim {
    root = null;
    rootMargin = "0%";
    thresholds = [0];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  for (const target of [window, globalThis]) {
    missing(target, "ResizeObserver", ResizeObserverShim);
    missing(target, "IntersectionObserver", IntersectionObserverShim);
    missing(
      target,
      "PointerEvent",
      class extends MouseEvent {
        pointerId: number;
        pointerType: string;
        isPrimary: boolean;
        constructor(type: string, init: PointerEventInit = {}) {
          super(type, init);
          this.pointerId = init.pointerId ?? 0;
          this.pointerType = init.pointerType ?? "mouse";
          this.isPrimary = init.isPrimary ?? true;
        }
      },
    );
  }
  missing(HTMLElement.prototype, "scrollIntoView", () => {});
  missing(
    HTMLElement.prototype,
    "scrollTo",
    function (
      this: HTMLElement,
      options: ScrollToOptions | number,
      y?: number,
    ) {
      this.scrollTop =
        typeof options === "number"
          ? (y ?? 0)
          : (options.top ?? this.scrollTop);
      this.scrollLeft =
        typeof options === "number"
          ? options
          : (options.left ?? this.scrollLeft);
      this.dispatchEvent(new Event("scroll"));
    },
  );
  missing(
    Element.prototype,
    "setPointerCapture",
    function (this: Element, id: number) {
      const ids = captures.get(this) ?? new Set();
      ids.add(id);
      captures.set(this, ids);
    },
  );
  missing(
    Element.prototype,
    "releasePointerCapture",
    function (this: Element, id: number) {
      captures.get(this)?.delete(id);
    },
  );
  missing(
    Element.prototype,
    "hasPointerCapture",
    function (this: Element, id: number) {
      return captures.get(this)?.has(id) ?? false;
    },
  );
  missing(window, "CSS", {});
  missing(globalThis, "CSS", window.CSS);
  missing(CSS, "supports", () => false);
  missing(CSS, "escape", (value: string) =>
    Array.from(String(value), (char, index) => {
      if (char === "\0") return "\uFFFD";
      const point = char.codePointAt(0)!;
      if (
        (index === 0 && /\d/.test(char)) ||
        (index === 1 && value[0] === "-" && /\d/.test(char)) ||
        point < 32 ||
        point === 127
      )
        return `\\${point.toString(16)} `;
      return /[\w-]/.test(char) || char.codePointAt(0)! >= 128
        ? char
        : `\\${char}`;
    }).join(""),
  );
  missing(window, "requestAnimationFrame", (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  missing(window, "cancelAnimationFrame", (id: number) =>
    window.clearTimeout(id),
  );
  missing(
    globalThis,
    "requestAnimationFrame",
    window.requestAnimationFrame.bind(window),
  );
  missing(
    globalThis,
    "cancelAnimationFrame",
    window.cancelAnimationFrame.bind(window),
  );
  return () => {
    for (const undo of restore.reverse()) undo();
  };
}
