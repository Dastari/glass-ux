import { useRouter } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type {
  ActionContext,
  ActionSurface,
  ResolvedAction,
} from "../../lib/actions/actions.js";
import {
  ConfirmHost,
  confirm as confirmService,
  type ConfirmOptions,
} from "../alert-dialog/index.js";
import { Toaster, toast } from "../toast/index.js";

/** The services actions run with (R12). Supplied once by ActionProvider at the app root. */
export interface ActionServices {
  navigate: ActionContext["navigate"];
  toast: ActionContext["toast"];
  /** Application callback opening a serialisable view in a managed window. */
  openWindow: ActionContext["openWindow"];
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ServicesContext = createContext<ActionServices | null>(null);

/** Until the window manager exists, opening a window is logged so the call is visible. */
const logWindow: ActionContext["openWindow"] = (kind, params) => {
  console.info(`[actions] openWindow(${kind})`, params);
};

const FALLBACK: ActionServices = {
  navigate: (to) =>
    console.info(`[actions] navigate(${to}) without an ActionProvider`),
  toast: (message) => toast(message),
  openWindow: logWindow,
  confirm: confirmService,
};

export interface ActionProviderProps {
  children: ReactNode;
  /** Override navigation with the host router. Defaults to TanStack Router when present, otherwise browser navigation. */
  navigate?: ActionContext["navigate"];
  /** Application callback opening a serialisable view in a managed window. */
  openWindow?: ActionContext["openWindow"];
}

/**
 * Supplies the services every action runs with — navigation, toasts, windows and the
 * confirm dialog — and mounts the toast viewport and confirm host they need. Mount once at
 * the app root; pass a navigation adapter when using a different router.
 *
 * A nested ActionProvider mounts nothing: it inherits the outer services and overrides only
 * what it is given. A layout that owns a window manager wires `openWindow` this way.
 */
export function ActionProvider({
  children,
  navigate,
  openWindow,
}: ActionProviderProps) {
  const parent = useContext(ServicesContext);
  const router = useRouter({ warn: false });
  const services = useMemo<ActionServices>(
    () => ({
      navigate:
        navigate ??
        parent?.navigate ??
        ((to) => {
          if (router) void router.navigate({ to } as never);
          else window.location.assign(to);
        }),
      toast: parent?.toast ?? ((message) => toast(message)),
      openWindow: openWindow ?? parent?.openWindow ?? logWindow,
      confirm: parent?.confirm ?? confirmService,
    }),
    [navigate, openWindow, parent, router],
  );
  if (parent)
    return <ServicesContext value={services}>{children}</ServicesContext>;
  return (
    <ServicesContext value={services}>
      {children}
      <ConfirmHost />
      <Toaster />
    </ServicesContext>
  );
}

/** Returns the nearest `ActionProvider`'s services (navigate, toast, openWindow, confirm). Without a provider, navigation and window opening are only logged to the console. */
export function useActionServices(): ActionServices {
  return useContext(ServicesContext) ?? FALLBACK;
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as PromiseLike<unknown>).then === "function";

const describe = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/**
 * Run resolved actions the same way from every surface: confirm (AlertDialog) → run →
 * report. Menus, the context menu, the palette and bulk runs report with a toast; the
 * header reports in its own button (R12.5), so `start` returns a promise the button can
 * follow — `null` when there is nothing to follow (the action finished synchronously, or
 * it confirms in its own dialog).
 */
export function useActionRunner() {
  const services = useActionServices();

  const start = useCallback(
    <T,>(
      action: ResolvedAction<T>,
      targets: readonly T[],
      surface: ActionSurface,
    ): Promise<void> | null => {
      const definition = action.definition;
      if (action.disabledReason || !definition.run) return null;
      const run = definition.run;
      const context: ActionContext = {
        surface,
        navigate: services.navigate,
        toast: services.toast,
        openWindow: services.openWindow,
      };
      const toastsSuccess = surface !== "header";
      const succeed = () => {
        if (toastsSuccess && definition.successMessage) {
          services.toast({
            tone: "success",
            title: definition.successMessage(targets),
          });
        }
      };
      const fail = (error: unknown) =>
        services.toast({
          tone: "danger",
          title: `${action.label} failed`,
          description: describe(error),
        });

      const spec = definition.confirm?.(targets);
      if (spec) {
        // The confirm button runs the action in place and reports its own failure.
        void services
          .confirm({
            title: spec.title,
            description: spec.body,
            confirmLabel: spec.confirmLabel,
            tone: spec.tone === "danger" ? "danger" : "warning",
            failureTitle: `${action.label} failed`,
            onConfirm: () => run(targets, context),
          })
          .then((confirmed) => {
            if (confirmed) succeed();
          });
        return null;
      }

      let result: unknown;
      try {
        result = run(targets, context);
      } catch (error) {
        fail(error);
        return surface === "header" ? Promise.reject(error) : null;
      }
      if (!isThenable(result)) {
        succeed();
        return null;
      }
      return Promise.resolve(result).then(
        () => succeed(),
        (error: unknown) => {
          fail(error);
          if (surface === "header") throw error;
        },
      );
    },
    [services],
  );

  return { start };
}
