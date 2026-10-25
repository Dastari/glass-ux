import { defineMessages, resolveMessages } from "../../lib/i18n/index.js"
import { getLocale } from "../../lib/locale/locale.js"

import type { LoginFlowLabels, LoginIdentifierKind } from "./types.js"

const IDENTIFIER_NOUN: Record<LoginIdentifierKind, string> = {
  email: "email address",
  username: "username",
  "email-or-username": "email address or username",
}

/** The factual English copy LoginFlow uses where `labels` does not override it. */
const defaults = {
  signInTitle: "Sign in",
  emailLabel: "Email",
  usernameLabel: "Username",
  emailOrUsernameLabel: "Email or username",
  passwordLabel: "Password",
  rememberLabel: "Keep me signed in on this device",
  forgotPasswordLink: "Forgot password?",
  signInAction: "Sign in",
  signInPending: "Signing in…",
  signInSuccess: "Signed in",
  providerSeparator: "or",
  providerAction: (provider) => provider.action ?? `Continue with ${provider.label}`,
  signUpPrompt: "No account?",
  signUpLink: "Create account",
  twoFactorTitle: "Enter verification code",
  twoFactorDescription: "Enter the 6-digit code from your authenticator app.",
  codeLabel: "Verification code",
  verifyAction: "Verify",
  verifyPending: "Verifying…",
  verifySuccess: "Verified",
  resendCode: "Send a new code",
  codeResent: "A new code was sent.",
  resendIn: (seconds) => `Resend in ${seconds} s`,
  resendSent: "Sent",
  backToSignIn: "Back to sign in",
  forgotTitle: "Reset password",
  forgotDescription: (kind) =>
    kind === "email"
      ? "Enter the email address for your account. A reset link will be sent to it."
      : `Enter your ${IDENTIFIER_NOUN[kind]}. A reset link will be sent to the account's email address.`,
  sendResetAction: "Send reset link",
  sendResetPending: "Sending…",
  sendResetSuccess: "Sent",
  resetSentTitle: "Check your email",
  resetSentDescription: (identifier) =>
    identifier
      ? `If an account exists for ${identifier}, a password reset link was sent to its email address.`
      : "If an account exists, a password reset link was sent to its email address.",
  resetCodeDescription: (identifier) =>
    identifier
      ? `If an account exists for ${identifier}, a reset code was sent to its email address. Enter it with a new password.`
      : "If an account exists, a reset code was sent to its email address. Enter it with a new password.",
  resendReset: "Resend email",
  resetResent: "The reset email was sent again.",
  resetCodeLabel: "Reset code",
  newPasswordLabel: "New password",
  confirmPasswordLabel: "Confirm password",
  setPasswordAction: "Set password",
  setPasswordPending: "Saving…",
  setPasswordSuccess: "Password set",
  passwordChanged: "Password changed. Sign in with the new password.",
  signUpTitle: "Create account",
  nameLabel: "Name",
  signUpEmailLabel: "Email",
  signUpUsernameLabel: "Username",
  signUpPasswordLabel: "Password",
  signUpAction: "Create account",
  signUpPending: "Creating account…",
  signUpSuccess: "Account created",
  signInPrompt: "Already have an account?",
  signInLink: "Sign in",
  identifierRequired: (kind) => `Enter your ${IDENTIFIER_NOUN[kind]}`,
  passwordRequired: "Enter your password",
  nameRequired: "Enter your name",
  usernameRequired: "Enter a username",
  passwordMismatch: "The passwords do not match",
  termsRequired: "Accept the terms to continue",
  unexpectedError: "The request could not be completed. Try again.",
} satisfies LoginFlowLabels

/** English defaults for LoginFlow. */
export const loginFlowMessages = defineMessages("loginFlow", {
  ...defaults,
  enterTheCode: (length: number, kind: string) => `Enter the ${length}-${kind} code`,
  providerGoogle: "Google",
  providerGitHub: "GitHub",
  providerMicrosoft: "Microsoft",
  providerApple: "Apple",
  providerSlack: "Slack",
  providerDiscord: "Discord",
  providerFacebook: "Facebook",
  digit: "digit",
  character: "character",
})

declare module "../../lib/i18n/catalog.js" {
  interface MessageCatalog {
    loginFlow: typeof loginFlowMessages.defaults
  }
}

/** Resolve loginFlow wording outside React; pass the component's locale. */
export function getLoginFlowMessages(locale = getLocale()): typeof loginFlowMessages.defaults {
  return resolveMessages(loginFlowMessages.namespace, loginFlowMessages.defaults, locale)
}
