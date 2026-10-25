import type { ReactNode } from "react";
import {
  AppearanceProvider,
  appearanceBootScript,
  configureAppearance,
} from "glass-ux/appearance";
import { configureLocale, getLocale } from "glass-ux/locale";
import { TooltipProvider } from "glass-ux/tooltip";
import "glass-ux/styles.css";

configureAppearance({ defaults: { palette: "graphite", mode: "light" } });
configureLocale("en-AU");

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootScript() }} />
      </head>
      <body>
        <AppearanceProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
