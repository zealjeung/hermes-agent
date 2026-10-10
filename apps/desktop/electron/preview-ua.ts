/**
 * Preview-pane user-agent normalisation.
 *
 * WHY THIS EXISTS — Korean streaming sites (SOOP / play.sooplive.com) sniff
 * `navigator.userAgent` in their player bootstrap. When the UA carries the
 * `Electron/<version>` token their `LivePlayer.js` throws before it mounts a
 * single `<video>`, and the preview pane shows an empty frame. Verified live
 * (2026-10-08) with a headless Electron probe on
 * `https://play.sooplive.com/rlaxordyd/297684815`:
 *   - stock UA  -> title "", videoCount 0
 *   - clean UA  -> title "Bisu김택용 - SOOP", videoCount 2, playing, 1920px
 * YouTube and Twitch do not care about the token, so only these sniffing
 * players break. Stripping the token makes the pane look like ordinary Chrome.
 *
 * This file was previously UNTRACKED, so an `npm run pack` cleaned `dist/` and
 * dropped the whole fix — SOOP live went blank again with no git trace. It is
 * committed now for that reason. Do not delete it.
 *
 * Deriving from the session's own default UA keeps the real Chrome version and
 * OS, so other sites still see a normal Chrome.
 */

/** Remove the `Electron/<version>` token (and collapse the double space it leaves). */
export function stripElectronToken(userAgent: string): string {
  return userAgent
    .replace(/ Electron\/[\d.]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

interface PreviewUaSession {
  getUserAgent(): string
  setUserAgent(userAgent: string): void
}

/**
 * Normalise the UA on the preview pane's partition session so every guest the
 * pane loads inherits a clean UA. Idempotent: stripping an already-clean UA is
 * a no-op, so calling it more than once is safe.
 */
export function installPreviewUserAgent(sess: PreviewUaSession): string {
  const clean = stripElectronToken(sess.getUserAgent())

  sess.setUserAgent(clean)

  return clean
}
