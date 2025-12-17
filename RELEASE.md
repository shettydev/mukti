# Release Process

This project uses **Nx Release** for automated versioning and changelog generation, driven by **Conventional Commits**.

## 🚀 How it Works

The release process is **semi-automatic**:

1.  **Versioning:** The system _automatically_ calculates the next version based on your commit history.
    - `fix: ...` -> Patch bump (e.g., `1.0.0` -> `1.0.1`)
    - `feat: ...` -> Minor bump (e.g., `1.0.0` -> `1.1.0`)
    - `BREAKING CHANGE: ...` -> Major bump (e.g., `1.0.0` -> `2.0.0`)
2.  **Trigger:** You _manually_ decide when to release by running a GitHub Action.

## 🛠 How to Release

You do not need to run commands locally. Everything is handled via GitHub Actions.

1.  Go to the **[Actions](https://github.com/shettydev/mukti/actions)** tab in your repository.
2.  Select the **Release** workflow from the sidebar.
3.  Click the **Run workflow** button.
4.  Configure the inputs:
    - **Dry Run:** (Default: `false`)
      - ✅ **Check this box** to simulate the release. It will show you the new version numbers and the changelog in the logs, but _will not_ push changes or create tags.
      - ❌ **Uncheck this box** to perform the actual release.

    - **Release Type:** (Default: `stable`)
      - `stable`: Promotes to a standard release (e.g., `1.0.0`). Use this for production-ready code.
      - `beta`: Creates a beta prerelease (e.g., `1.0.0-beta.0`).
      - `alpha`: Creates an alpha prerelease (e.g., `1.0.0-alpha.0`).

## 📦 What Happens During a Release?

When you run the workflow (with `dryRun: false`):

1.  **Version Bump:** Updates `version` in `packages/*/package.json`.
2.  **Changelog:** Updates `CHANGELOG.md` in each project root with the new features/fixes.
3.  **Git:** Creates a release commit (e.g., `chore(release): publish`) and creates a git tag (e.g., `@mukti/api@1.0.0`).
4.  **GitHub Release:** Creates an official entry in the repository's "Releases" section with the changelog.

## 🔍 FAQ

### Why is `dryRun` in the workflow?

The `dryRun` input allows you to "preview" a release before committing to it. It's a safety mechanism to verify that the system is detecting your changes correctly (e.g., ensuring a `feat` commit is indeed triggering a minor version bump).

### Do I have to run this locally?

No. While you _can_ run `bun nx release` locally, it is recommended to use the GitHub Action to ensure consistency and to let the bot handle git authentication.

### How does it know which app to update?

We use **Independent Versioning**. If you only committed changes to `packages/mukti-api`, only the API version will be bumped. The Web app version will remain unchanged.
