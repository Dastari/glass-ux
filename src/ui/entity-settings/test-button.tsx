import { useState, type ReactNode } from "react"
import { IconActivity } from "../../icons/generated/icons.js"
import { cx } from "../../lib/cx.js"
import { Button, useActionFeedback, type ButtonProps } from "../button/index.js"

export interface TestResult {
  ok: boolean
  /** One line: "Reachable via LMN-4E5E · 38 ms", or what failed and what to do. */
  summary: string
  /** What the test returned, by label: sysName, sysDescr, Uptime; Certificate, Expires. */
  details?: Readonly<Record<string, ReactNode>>
}

class TestFailed extends Error {}

export interface TestButtonProps extends Omit<ButtonProps, "onClick" | "status" | "children"> {
  /** Run the test against the values on screen (saved or not). */
  onTest: () => Promise<TestResult>
  /** The result block's rows, labelled before any test runs so the block never resizes. */
  fields: readonly string[]
  /** Default "Test". */
  children?: ReactNode
  /** Changing it marks the last result as out of date (the values it tested have changed). */
  resetKey?: unknown
  className?: string
}

/**
 * Test a connection without leaving the dialog (§5.1): the button confirms in place
 * (pending, then ✓ or ✕ with a shake) and a reserved line beside it says why. The result
 * block below always holds its rows ("—" until a test runs), so nothing moves when a result
 * arrives (R9.1). A thrown error counts as a failed test with its message.
 */
export function TestButton({ onTest, fields, children = "Test", resetKey, className, icon = <IconActivity />, ...button }: TestButtonProps) {
  const { status, run } = useActionFeedback()
  const [result, setResult] = useState<TestResult | null>(null)
  const [stale, setStale] = useState(false)
  const [lastKey, setLastKey] = useState(resetKey)
  if (resetKey !== lastKey) {
    setLastKey(resetKey)
    if (result) setStale(true)
  }

  const start = () =>
    void run(async () => {
      let next: TestResult
      try {
        next = await onTest()
      } catch (error) {
        next = { ok: false, summary: error instanceof Error ? error.message : "The test did not finish — retry" }
      }
      setResult(next)
      setStale(false)
      if (!next.ok) throw new TestFailed(next.summary)
    })

  const tone = !result || stale ? undefined : result.ok ? "success" : "danger"
  return (
    <div className={cx("fa-test", className)} data-result={result ? (result.ok ? "ok" : "failed") : undefined} data-stale={stale ? "" : undefined}>
      <div className="fa-test-row">
        <Button {...button} type="button" icon={icon} status={status} pendingLabel="Testing…" successLabel={children} errorLabel={children} onClick={start}>
          {children}
        </Button>
        <span className="fa-test-summary" data-tone={tone} aria-live="polite">
          {result ? (stale ? `Last test: ${result.summary} · settings changed since` : result.summary) : "Not tested"}
        </span>
      </div>
      <dl className="glass-inset fa-test-result" aria-label="Test result">
        {fields.map((label) => (
          <div key={label} className="fa-test-fact">
            <dt className="fa-test-label">{label}</dt>
            <dd className="fa-test-value">{result?.details?.[label] ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
