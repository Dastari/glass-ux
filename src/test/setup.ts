import "@testing-library/jest-dom/vitest"
import { configureLocale } from "../lib/locale/locale.js"

// Format expectations are written in Australian English; pin it so they do not depend on
// the environment (node has no <html lang>, jsdom's is empty). Tests of the resolution order
// clear it themselves.
configureLocale("en-AU")
