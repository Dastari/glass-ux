import {
  IconApple,
  IconDiscord,
  IconFacebook,
  IconGithub,
  IconGoogle,
  IconMicrosoft,
  IconSlack,
} from "../../icons/generated/icons.js"
import type { LoginProvider } from "./types.js"

/** Identifiers of the providers with bundled marks. */
export type LoginProviderPreset = "google" | "github" | "microsoft" | "apple" | "slack" | "discord" | "facebook"

/** Name and monochrome mark for each preset. The host still owns the OAuth configuration. */
export const LOGIN_PROVIDERS: Readonly<Record<LoginProviderPreset, LoginProvider>> = {
  google: { id: "google", label: "Google", icon: <IconGoogle /> },
  github: { id: "github", label: "GitHub", icon: <IconGithub /> },
  microsoft: { id: "microsoft", label: "Microsoft", icon: <IconMicrosoft /> },
  apple: { id: "apple", label: "Apple", icon: <IconApple /> },
  slack: { id: "slack", label: "Slack", icon: <IconSlack /> },
  discord: { id: "discord", label: "Discord", icon: <IconDiscord /> },
  facebook: { id: "facebook", label: "Facebook", icon: <IconFacebook /> },
}

/**
 * A preset provider, optionally adjusted:
 *
 *   loginProvider("google")
 *   loginProvider("github", { disabledReason: "GitHub sign-in is unavailable" })
 */
export function loginProvider(preset: LoginProviderPreset, overrides: Partial<LoginProvider> = {}): LoginProvider {
  return { ...LOGIN_PROVIDERS[preset], ...overrides }
}
