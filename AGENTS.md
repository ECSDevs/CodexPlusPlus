# Repository Guidelines

## Project Structure & Module Organization

CodexPlusPlus is a Rust workspace with a Tauri/React manager. Backend behavior lives in `crates/codex-plus-core`; persistence and session data are in `crates/codex-plus-data`. The launcher is in `apps/codex-plus-launcher`; the Tauri shell and TypeScript UI are in `apps/codex-plus-manager` (`src-tauri/` and `src/`). Rust integration tests are in crate `tests/` directories; frontend tests are `src/*.test.ts`. Use `assets/` for bundled resources, `docs/` for plans, and `scripts/installer/` for packaging.

## AGENTS.md Maintenance

Treat this file as maintained project documentation. For every future change that affects repository structure, development commands, dependencies, coding conventions, tests, release workflow, or security guidance, review whether `AGENTS.md` needs a corresponding update and include it in the same change when it does.

## Build, Test, and Development Commands

Run frontend commands from `apps/codex-plus-manager`:

```bash
npm install
npm run dev             # Start the Tauri desktop app
npm test                # Run frontend Node tests
npm run check           # TypeScript check without emitting files
npm run vite:build      # Build the web UI
npm run build           # Build the release Tauri application
```

From the repository root, use `cargo build --release` for release binaries, `cargo test --workspace` for all Rust tests, `cargo fmt --all -- --check` to verify formatting, and `cargo clippy --workspace --all-targets --all-features` for linting. Run focused tests with, for example, `cargo test -p codex-plus-core --test model_suffix`.

## Coding Style & Naming Conventions

Use Rust 2024 conventions and `cargo fmt`; document public APIs with `///`. Use `snake_case` Rust names, `PascalCase` React components, and `camelCase` TypeScript variables/functions. Preserve the `@/*` import alias and strict TypeScript settings. Avoid generated `target/`, `dist/`, or `node_modules/` content.

## Testing Guidelines

Add Rust unit/integration coverage for backend behavior and colocated `.test.ts` cases for UI utilities and flows. No coverage threshold is documented; behavior changes should include regression tests. Before a PR, run focused tests plus `cargo test --workspace`, `npm test`, `npm run check`, and applicable build/format checks.

## Commit & Pull Request Guidelines

Use short imperative conventional-style subjects, such as `feat: add session export`, `fix: reject invalid config`, or `test: cover launcher routes`. Keep commits logically scoped. Every completed task must commit its relevant changes before handoff; do not leave task work uncommitted unless the user explicitly asks otherwise. PRs should explain the problem and solution, link related issues when applicable, describe testing performed, and include screenshots or recordings for visible UI changes. Call out platform-specific impact (Windows/macOS) and any configuration or migration considerations.

## Security & Configuration Tips

Do not commit API keys, provider credentials, local Codex configuration, or generated user data. Use example configuration files in `tools/codex-wechat/` as templates and review diffs for secrets before publishing changes.
