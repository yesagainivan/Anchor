# Release Guide

Anchor uses **GitHub Actions** to automate the production release process.

## Prerequisites

- You must have `write` access to the repository to push tags.

## How to Release

1.  **Update Version Number**
    - Open `src-tauri/tauri.conf.json`.
    - Update the `version` field (e.g., `"0.1.0"` -> `"0.2.0"`).
    - *(Optional)* Update `package.json` version to match.

2.  **Commit the Bump**
    ```bash
    git add .
    git commit -m "chore: bump version to v0.2.0"
    git push
    ```

3.  **Create & Push Tag**
    The release workflow is triggered by tags starting with `v`.
    ```bash
    git tag v0.2.0
    git push origin v0.2.0
    ```

## What Happens Next?

1.  The `.github/workflows/release.yml` workflow will start.
2.  It will build the application for **macOS** (Silicon & Intel).
3.  Once finished, it will automatically:
    - Create a **Draft Release** on GitHub.
    - Upload the `.dmg` and `.app.tar.gz` assets.
    - Upload the updater JSON information.

## Verifying the Release

- Go to the **Actions** tab on GitHub to watch the build progress.
- Once green, go to the **Releases** page to see the new draft.
- Publish the release to make it available to users!
