// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { TooltipProvider } from "../tooltip/index.js"
import { LoginError, LoginFlow, loginProvider, type LoginFlowProps, type LoginView } from "./index.js"

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
})
afterEach(cleanup)
afterAll(() => vi.unstubAllGlobals())

const PASSWORD = "sample-pass"

function renderFlow(props: Partial<LoginFlowProps> = {}) {
  const user = userEvent.setup()
  const utils = render(
    <TooltipProvider>
      <LoginFlow onSignIn={async () => undefined} {...props} />
    </TooltipProvider>
  )
  return { user, ...utils }
}

/** Resolve on demand, to observe the pending state. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => (resolve = done))
  return { promise, resolve }
}

const submit = () => screen.getByRole("button", { name: /^Sign in/ })

async function signIn(user: ReturnType<typeof userEvent.setup>, identifier = "avery@orbit.example") {
  await user.type(screen.getByLabelText("Email"), identifier)
  await user.type(screen.getByLabelText("Password"), PASSWORD)
  await user.click(submit())
}

describe("sign-in", () => {
  it("submits trimmed credentials with Enter", async () => {
    const onSignIn = vi.fn(async () => undefined)
    const { user } = renderFlow({ onSignIn, remember: true })
    await user.type(screen.getByLabelText("Email"), " avery@orbit.example ")
    await user.click(screen.getByRole("checkbox", { name: "Keep me signed in on this device" }))
    await user.type(screen.getByLabelText("Password"), `${PASSWORD}{Enter}`)
    await waitFor(() => expect(onSignIn).toHaveBeenCalledWith({ identifier: "avery@orbit.example", password: PASSWORD, remember: true }))
  })

  it("uses sign-in autocomplete tokens for each identifier kind", () => {
    renderFlow({ identifier: "username" })
    expect(screen.getByLabelText("Username")).toHaveAttribute("autocomplete", "username")
    expect(screen.getByLabelText("Username")).toHaveAttribute("autocapitalize", "none")
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password")
    cleanup()
    renderFlow({ identifier: "email-or-username" })
    expect(screen.getByLabelText("Email or username")).toHaveAttribute("autocomplete", "username")
  })

  it("validates on submit and does not call the host", async () => {
    const onSignIn = vi.fn(async () => undefined)
    const { user } = renderFlow({ onSignIn })
    await user.click(submit())
    expect(await screen.findByText("Enter your email address")).toBeInTheDocument()
    expect(screen.getByText("Enter your password")).toBeInTheDocument()
    expect(onSignIn).not.toHaveBeenCalled()
  })

  it("validates an email-or-username identifier as an email only when it has an @", async () => {
    const onSignIn = vi.fn(async () => undefined)
    const { user } = renderFlow({ onSignIn, identifier: "email-or-username" })
    await user.type(screen.getByLabelText("Email or username"), "avery@")
    await user.type(screen.getByLabelText("Password"), `${PASSWORD}{Enter}`)
    expect(await screen.findByText(/Enter an email such as/)).toBeInTheDocument()
    await user.clear(screen.getByLabelText("Email or username"))
    await user.type(screen.getByLabelText("Email or username"), "avery")
    await user.click(submit())
    await waitFor(() => expect(onSignIn).toHaveBeenCalledWith(expect.objectContaining({ identifier: "avery" })))
  })

  it("shows pending in place and makes providers wait", async () => {
    const pending = deferred<undefined>()
    const { user } = renderFlow({ onSignIn: () => pending.promise, providers: [loginProvider("google")], onProviderSignIn: async () => undefined })
    await signIn(user)
    expect(submit()).toHaveAttribute("data-status", "pending")
    expect(submit()).toHaveAttribute("aria-busy", "true")
    expect(screen.getByRole("button", { name: /^Continue with Google/ })).toBeDisabled()
    await act(async () => pending.resolve(undefined))
    expect(submit()).toHaveAttribute("data-status", "success")
  })

  it("shows a returned refusal in the reserved status line", async () => {
    const { user, container } = renderFlow({ onSignIn: async () => ({ status: "error", message: "Incorrect email or password." }) })
    const status = container.querySelector(".fa-login-status")
    expect(status).toBeInTheDocument()
    expect(status).toBeEmptyDOMElement()
    await signIn(user)
    expect(await within(status as HTMLElement).findByText("Incorrect email or password.")).toBeInTheDocument()
    expect(status).toHaveAttribute("role", "status")
    expect(submit()).toHaveAttribute("data-status", "error")
    // The message clears as soon as the person edits a field; the slot stays.
    await user.type(screen.getByLabelText("Password"), "x")
    expect(status).toBeEmptyDOMElement()
  })

  it("puts a field-level refusal on its field", async () => {
    const { user } = renderFlow({ onSignIn: async () => ({ status: "error", field: "password", message: "This password has expired" }) })
    await signIn(user)
    expect(await screen.findByText("This password has expired")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true")
  })

  it("shows LoginError messages and hides unexpected errors behind the generic message", async () => {
    const onError = vi.fn()
    let failure: Error = new LoginError("This account is locked.")
    const { user } = renderFlow({
      onError,
      onSignIn: async () => {
        throw failure
      },
    })
    await signIn(user)
    expect(await screen.findByText("This account is locked.")).toBeInTheDocument()
    expect(onError).not.toHaveBeenCalled()
    failure = new Error("TypeError: Failed to fetch")
    await user.click(submit())
    expect(await screen.findByText("The request could not be completed. Try again.")).toBeInTheDocument()
    expect(onError).toHaveBeenCalledWith(failure)
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument()
  })

  it("offers providers only when there is no password callback", async () => {
    const onProviderSignIn = vi.fn(async () => ({ status: "error" as const, message: "GitHub is unavailable." }))
    const { user } = renderFlow({
      onSignIn: undefined,
      providers: [loginProvider("github"), loginProvider("apple", { disabledReason: "Apple sign-in is not configured" })],
      onProviderSignIn,
    })
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Continue with Apple/ })).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("button", { name: /^Continue with GitHub/ }))
    expect(onProviderSignIn).toHaveBeenCalledWith(expect.objectContaining({ id: "github" }))
    expect(await screen.findByText("GitHub is unavailable.")).toBeInTheDocument()
  })
})

describe("views", () => {
  it("switches to the reset request, keeps the identifier and confirms what was sent", async () => {
    const onRequestPasswordReset = vi.fn(async () => undefined)
    const onViewChange = vi.fn()
    const { user } = renderFlow({ onRequestPasswordReset, onViewChange })
    await user.type(screen.getByLabelText("Email"), "avery@orbit.example")
    await user.click(screen.getByRole("button", { name: "Forgot password?" }))
    expect(onViewChange).toHaveBeenLastCalledWith("forgot-password")
    expect(screen.getByRole("heading", { name: "Reset password" })).toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveValue("avery@orbit.example")
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveFocus())
    await user.click(screen.getByRole("button", { name: /^Send reset link/ }))
    expect(onRequestPasswordReset).toHaveBeenCalledWith({ identifier: "avery@orbit.example" })
    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeInTheDocument()
    expect(screen.getByText(/If an account exists for avery@orbit.example/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Resend in \d+ s/ })).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("button", { name: "Back to sign in" }))
    expect(screen.getByLabelText("Email")).toHaveValue("avery@orbit.example")
  })

  it("verifies a reset code and returns to sign-in with a confirmation", async () => {
    const onResetPassword = vi.fn(async () => undefined)
    const { user } = renderFlow({
      defaultView: "reset-password",
      defaultIdentifier: "avery@orbit.example",
      onRequestPasswordReset: async () => undefined,
      onResetPassword,
      passwordPolicy: (value) => (value.length < 8 ? "Use 8 characters or more" : undefined),
    })
    const boxes = screen.getAllByRole("textbox").filter((box) => box.getAttribute("autocomplete") === "one-time-code")
    fireEvent.paste(boxes[0]!, { clipboardData: { getData: () => "Your code is 246810" } })
    await user.type(screen.getByLabelText("New password"), "short")
    await user.type(screen.getByLabelText("Confirm password"), "different")
    await user.click(screen.getByRole("button", { name: /^Set password/ }))
    expect(await screen.findByText("Use 8 characters or more")).toBeInTheDocument()
    expect(screen.getByText("The passwords do not match")).toBeInTheDocument()
    await user.clear(screen.getByLabelText("New password"))
    await user.type(screen.getByLabelText("New password"), "long-enough-pass")
    await user.clear(screen.getByLabelText("Confirm password"))
    await user.type(screen.getByLabelText("Confirm password"), "long-enough-pass")
    await user.click(screen.getByRole("button", { name: /^Set password/ }))
    await waitFor(() => expect(onResetPassword).toHaveBeenCalledWith({ identifier: "avery@orbit.example", code: "246810", password: "long-enough-pass" }))
    expect(await screen.findByText("Password changed. Sign in with the new password.")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
  })

  it("follows a controlled view and only reports changes", async () => {
    const onViewChange = vi.fn()
    function Routed() {
      const [view, setView] = useState<LoginView>("sign-in")
      return (
        <>
          <button type="button" onClick={() => setView("sign-up")}>
            Route to sign-up
          </button>
          <LoginFlow
            view={view}
            onViewChange={(next) => {
              onViewChange(next)
              if (next !== "forgot-password") setView(next)
            }}
            onSignIn={async () => undefined}
            onSignUp={async () => undefined}
            onRequestPasswordReset={async () => undefined}
          />
        </>
      )
    }
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <Routed />
      </TooltipProvider>
    )
    await user.click(screen.getByRole("button", { name: "Forgot password?" }))
    expect(onViewChange).toHaveBeenCalledWith("forgot-password")
    // The host refused the change: the view stays.
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Route to sign-up" }))
    expect(screen.getByRole("heading", { name: "Create account" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
  })

  it("renders view links as real links with getViewHref", async () => {
    const onViewChange = vi.fn()
    const { user } = renderFlow({ onSignUp: async () => undefined, onViewChange, getViewHref: (view) => `/${view}` })
    const link = screen.getByRole("link", { name: "Create account" })
    expect(link).toHaveAttribute("href", "/sign-up")
    await user.click(link)
    expect(onViewChange).toHaveBeenCalledWith("sign-up")
  })

  it("falls back to sign-in for a view without its callback", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    renderFlow({ defaultView: "sign-up" })
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument()
    error.mockRestore()
  })
})

describe("two-factor", () => {
  it("asks for a code when sign-in resolves to two-factor and verifies it", async () => {
    const onVerifyTwoFactor = vi.fn(async ({ code }: { code: string }) => (code === "246810" ? undefined : { status: "error" as const, field: "code" as const, message: "That code is incorrect" }))
    const { user } = renderFlow({
      remember: true,
      onSignIn: async () => ({ status: "two-factor", challenge: { id: "challenge-7", description: "Enter the code sent to •••• 0142." } }),
      onVerifyTwoFactor,
    })
    await signIn(user, "mfa@orbit.example")
    expect(await screen.findByRole("heading", { name: "Enter verification code" })).toBeInTheDocument()
    expect(screen.getByText("Enter the code sent to •••• 0142.")).toBeInTheDocument()
    const boxes = screen.getAllByRole("textbox").filter((box) => box.getAttribute("autocomplete") === "one-time-code")
    fireEvent.paste(boxes[0]!, { clipboardData: { getData: () => "111111" } })
    await user.click(screen.getByRole("button", { name: /^Verify/ }))
    expect(await screen.findByText("That code is incorrect")).toBeInTheDocument()
    fireEvent.paste(boxes[0]!, { clipboardData: { getData: () => "246810" } })
    await user.click(screen.getByRole("button", { name: /^Verify/ }))
    await waitFor(() =>
      expect(onVerifyTwoFactor).toHaveBeenLastCalledWith({ code: "246810", identifier: "mfa@orbit.example", remember: false, challenge: { id: "challenge-7", description: "Enter the code sent to •••• 0142." }, provider: undefined })
    )
    await user.click(screen.getByRole("button", { name: "Back to sign in" }))
    expect(screen.getByLabelText("Password")).toHaveValue("")
  })
})

describe("sign-up", () => {
  it("validates the configured fields and submits only those", async () => {
    const onSignUp = vi.fn(async () => ({ status: "success" as const, message: "Account created." }))
    const { user } = renderFlow({
      defaultView: "sign-up",
      onSignUp,
      signUp: { name: false, identifier: "email-and-username", terms: "I accept the terms" },
      passwordPolicy: { minLength: 10, minScore: 0 },
    })
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email")
    expect(screen.getByLabelText("Username")).toHaveAttribute("autocomplete", "username")
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password")
    await user.click(screen.getByRole("button", { name: /^Create account/ }))
    expect(await screen.findByText("Accept the terms to continue")).toBeInTheDocument()
    expect(screen.getByText("Enter a username")).toBeInTheDocument()
    await user.type(screen.getByLabelText("Email"), "rowan@orbit.example")
    await user.type(screen.getByLabelText("Username"), "rowan")
    await user.type(screen.getByLabelText("Password"), "tidal-copper-lantern")
    await user.type(screen.getByLabelText("Confirm password"), "tidal-copper-lantern")
    await user.click(screen.getByRole("checkbox", { name: "I accept the terms" }))
    await user.click(screen.getByRole("button", { name: /^Create account/ }))
    await waitFor(() =>
      expect(onSignUp).toHaveBeenCalledWith({ name: undefined, email: "rowan@orbit.example", username: "rowan", password: "tidal-copper-lantern", termsAccepted: true })
    )
    expect(await screen.findByText("Account created.")).toBeInTheDocument()
  })
})
