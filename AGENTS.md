# Repository Guidelines

## Project Structure & Module Organization

CodexPlusPlus is a Rust workspace with a Tauri/React manager. Backend behavior lives in `crates/codex-plus-core`; persistence and session data are in `crates/codex-plus-data`. The launcher is in `apps/codex-plus-launcher`; the Tauri shell and TypeScript UI are in `apps/codex-plus-manager` (`src-tauri/` and `src/`). The `apps/codex-plus-packager` crate has no runtime code — its build script bundles release binaries into a zip after `cargo build --release`. Rust integration tests are in crate `tests/` directories; frontend tests are `src/*.test.ts`. Use `assets/` for bundled resources, `docs/` for plans, and `scripts/installer/` for packaging.

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

The workspace requires nightly Rust (pinned via `rust-toolchain.toml`) because the release packager uses the unstable `bindeps` cargo feature for artifact dependencies. `cargo build` automatically compiles the Node.js frontend: the `codex-plus-manager` build script runs `npm install` (when `node_modules` is absent) and `npm run vite:build` before Tauri compiles, so no manual frontend step is required. On release builds, the `codex-plus-packager` crate uses artifact dependencies (`bindeps`, enabled in `.cargo/config.toml`) to guarantee the manager and launcher binaries are fully linked before its `build.rs` runs, then bundles them into `dist/<platform>/CodexPlusPlus-<version>-<platform>-<arch>.zip`.

## Coding Style & Naming Conventions

Use Rust 2024 conventions and `cargo fmt`; document public APIs with `///`. Use `snake_case` Rust names, `PascalCase` React components, and `camelCase` TypeScript variables/functions. Preserve the `@/*` import alias and strict TypeScript settings. Avoid generated `target/`, `dist/`, or `node_modules/` content.

## Testing Guidelines

Add Rust unit/integration coverage for backend behavior and colocated `.test.ts` cases for UI utilities and flows. No coverage threshold is documented; behavior changes should include regression tests. Before a PR, run focused tests plus `cargo test --workspace`, `npm test`, `npm run check`, and applicable build/format checks.

## Commit & Pull Request Guidelines

**Task completion requires commit.** Every finished task must end with a commit of its relevant changes before handoff; never leave task work uncommitted unless the user explicitly asks otherwise. This is mandatory and applies to every task regardless of size.

Use short imperative conventional-style subjects, such as `feat: add session export`, `fix: reject invalid config`, or `test: cover launcher routes`. Keep commits logically scoped. PRs should explain the problem and solution, link related issues when applicable, describe testing performed, and include screenshots or recordings for visible UI changes. Call out platform-specific impact (Windows/macOS) and any configuration or migration considerations.

## Security & Configuration Tips

Do not commit API keys, provider credentials, local Codex configuration, or generated user data. Use example configuration files in `tools/codex-wechat/` as templates and review diffs for secrets before publishing changes.
