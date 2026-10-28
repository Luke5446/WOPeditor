# WOPeditor

The Works Order Editor: edits the Production Plan app's style master (works
order data) once per style, so every size updates, and exports a file the
Production Plan app imports with **Special Makes → Import from costing**.

Live: https://luke5446.github.io/WOPeditor/

## Where the saved changes are kept

Since 21 Oct 2026 the saved changes (and the record of what was last sent to
the PM) are kept in `edits.json` in this repo, not only in the browser. The
browser copy (`localStorage`, key `tibard_woe_v1`) is a cache: a cleared
browser or another PC reads the file and carries on.

- **Writing** needs a GitHub token on the PC. In the header click the pill
  that says *Saved in this browser* and paste a fine-grained token made on
  GitHub (**Settings → Developer settings → Personal access tokens →
  Fine-grained tokens**): Repository access *Only select repositories →
  WOPeditor*, Permissions *Contents: Read and write*. The token can change
  this repo's files, so it stays on the one PC that edits. The pill then
  reads *Saved in the repo · time* and every save writes the file a second
  or so after the last change (each write is a commit, so the history holds
  every version).
- **Reading** needs nothing: on open the editor reads `edits.json` (through
  the API with a token, else the GitHub Pages copy) and takes the newer of
  it and the browser copy, by the `savedAt` stamp each save writes. A
  browser copy from before this existed is merged in style by style.
- **Two PCs**: a write first reads the file; if another PC saved it after
  this page was opened, the pill says *Another PC saved later* and nothing is
  written over. Reload the page to take their copy, then save again.
- **Without a token** the editor works as before, in the browser only, and
  the pill says so.
- A write GitHub refuses shows *NOT SAVED to GitHub* with the reason; the
  changes stay in the browser and go with the next save that succeeds.

The file holds `styles`, `charts`, `chartCols` (the editor's changes on top
of what the Production Plan app holds), `history` (the change history, see
below), `exported` (what was last downloaded for the PM) and `savedAt`. A
change the PM has imported and published drops out of it, as it drops out of
the browser copy; its history entries stay.

## Change history (28 Oct 2026)

Every save of a style asks **why it is changing** and refuses to save until a
reason is typed (Save & close, Ctrl+S, Save on the unsaved-changes prompt,
the save before a print, Revert to buffer app copy, and the bulk edit tab,
which takes one reason for the whole batch). The entry records the date and
time, the name or initials typed (remembered on the PC under localStorage
`tibard_woe_by`), which parts changed (details, cutting room, fabrics, trims,
manufacturing, finishing, times, size chart, branding, new style) and the
reason. A save that changes nothing asks nothing.

- Shown at the top of the style as **Change history**, newest first.
- Kept per style in `edits.json` under `history[code]` (oldest first), with
  the browser copy as a cache. An older file or browser copy without the key
  simply starts empty.
- Goes out with the style on **Export for PM** as `history` on each style,
  so the Production Plan app's `styleEdits` and `data.json` carry it; the
  editor reads it back from there and merges it with its own entries, so the
  history survives the change being published and settled.

## Tests

Run against the real `index.html` in Chromium: `npm i playwright` then
`node tests/test-cloud.js`.

| File | Covers |
|---|---|
| `tests/test-history.js` | The change history: a save refused without a reason; the entry (when, who, what, why) recorded with one; kept in the browser copy, the `edits.json` payload and the export; shown on the style; an entry back from data.json merged in; a save that changes nothing asks nothing; the history surviving a reload; a bulk edit needing a reason |
| `tests/test-cloud.js` | The saved changes in `edits.json` against a stand-in GitHub API: browser-only without a token; the browser copy written on the first run with one; a save writing once; a fresh browser reading the file; the newer copy winning either way; a stale sha read again; another PC's later save not written over |
