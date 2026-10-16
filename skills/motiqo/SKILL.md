---
name: motiqo
description: Install and adapt Motiqo interactive React components, configure their moods and props, and verify integration in a user's existing React project. Use when the user asks for a Motiqo component or names Motiqo; unrelated generic UI work does not require this skill.
---

Use Motiqo's bundled installer and versioned component registry as the source of truth. Component files belong to the user's project and remain editable.

1. Inspect the project's React version, source directory, package manager and existing component conventions. Preserve the user's chosen framework and styles. Motiqo components include scoped CSS; do not add Tailwind or a UI framework just to install them.
2. Run `motiqo list --json` to discover component IDs. If this is a Motiqo repository checkout, the equivalent is `node packages/cli/bin/motiqo.mjs list --json` after `npm run distribution:build`. If the command is unavailable, locate the supplied CLI tarball or the Motiqo checkout; do not assume an unpublished npm command is available.
3. Preview changes with `motiqo add <id> --cwd <project> --dir <component-directory> --dry-run --json`. Read the proposed files and dependencies. Shared helpers and public artwork are part of the component, not optional demo files.
4. Install with the same command without `--dry-run`. Different existing files require review; do not use `--overwrite` to resolve an unexplained conflict. The installer copies files without running package scripts. `--install` is an explicit npm-only dependency installation option; otherwise install the reported dependencies with the project's existing package manager. Do not publish packages or deploy sites as part of component integration.
5. Import the entry component from the chosen directory and give its parent a defined height. Keep SVG artwork and public media at the supplied paths, or deliberately update every reference when relocating them. Preserve attribution already present in source.
6. Use the installed component's TypeScript props and registry controls for configuration. Moods are complete supported configurations, not arbitrary props. Respect `paused`, `interactive` and reduced-motion behavior. For charts, provide meaningful data and accessible summaries; decorative animation frames should not generate live announcements.
7. Validate the actual exported files with the project's type checker/build. Exercise the requested interaction, keyboard behavior and narrow viewport in a browser when available. Check cleanup and GPU/console errors for WebGL components. Report what was verified and any integration limitation.

`motiqo skill --cwd <project>` installs this skill at `.agents/skills/motiqo/SKILL.md`. It does not configure an MCP server.
