import { loginFlowMessages } from "./messages.js"
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
  google: { id: "google", label: loginFlowMessages.defaults.providerGoogle, icon: <IconGoogle /> },
  github: { id: "github", label: loginFlowMessages.defaults.providerGitHub, icon: <IconGithub /> },
  microsoft: { id: "microsoft", label: loginFlowMessages.defaults.providerMicrosoft, icon: <IconMicrosoft /> },
  apple: { id: "apple", label: loginFlowMessages.defaults.providerApple, icon: <IconApple /> },
  slack: { id: "slack", label: loginFlowMessages.defaults.providerSlack, icon: <IconSlack /> },
  discord: { id: "discord", label: loginFlowMessages.defaults.providerDiscord, icon: <IconDiscord /> },
  facebook: { id: "facebook", label: loginFlowMessages.defaults.providerFacebook, icon: <IconFacebook /> },
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
