<p align="center"><img src="docs/readme/hero.png" alt="Motiqo — Small details. Strong impressions. Interactive Elements." width="100%" /></p>

<p align="center">
  <a href="https://motiqo.site/">Explore Motiqo</a> &nbsp;·&nbsp;
  <a href="https://motiqo.site/library">Component library</a> &nbsp;·&nbsp;
  <a href="https://motiqo.site/docs">Documentation</a> &nbsp;·&nbsp;
  <a href="LICENSE">MIT code</a>
</p>

# Motion you can make your own.

A growing collection of <!-- count:start -->59<!-- count:end --> interactive React components: tactile buttons, generative sculptures, animated typography and small interface experiences. Explore a component, tune its controls, then bring the source into your project.

**Early stage · React + TypeScript · Source included · Built by [Robert Betancourt](https://github.com/robertbetancourt)**

## A few things to play with

Animated previews below; open the library to interact with the animations.

<!-- gallery:start -->
<table>
<tr>
<td align="center" width="33%"><a href="https://motiqo.site/library?element=sacred-lotus"><img src="docs/readme/sacred-lotus.gif" width="250" alt="SacredLotus animated preview" /><br /><strong>SacredLotus</strong></a></td>
<td align="center" width="33%"><a href="https://motiqo.site/library?element=inkshift"><img src="docs/readme/inkshift.gif" width="250" alt="Inkshift animated preview" /><br /><strong>Inkshift</strong></a></td>
<td align="center" width="33%"><a href="https://motiqo.site/library?element=iris-turbine"><img src="docs/readme/iris-turbine.gif" width="250" alt="IrisTurbine animated preview" /><br /><strong>IrisTurbine</strong></a></td>
</tr>
<tr>
<td align="center" width="33%"><a href="https://motiqo.site/library?element=thermal-smoke"><img src="docs/readme/thermal-smoke.gif" width="250" alt="ThermalSmoke animated preview" /><br /><strong>ThermalSmoke</strong></a></td>
<td align="center" width="33%"><a href="https://motiqo.site/library?element=orbit-agent"><img src="docs/readme/orbit-agent.gif" width="250" alt="OrbitAgent animated preview" /><br /><strong>OrbitAgent</strong></a></td>
<td align="center" width="33%"><a href="https://motiqo.site/library?element=helix"><img src="docs/readme/helix.gif" width="250" alt="Helix animated preview" /><br /><strong>Helix</strong></a></td>
</tr>
<tr>
<td align="center" width="33%"><a href="https://motiqo.site/library?element=aura"><img src="docs/readme/aura.gif" width="250" alt="Aura animated preview" /><br /><strong>Aura</strong></a></td>
<td align="center" width="33%"><a href="https://motiqo.site/library?element=type-garden"><img src="docs/readme/type-garden.gif" width="250" alt="TypeGarden animated preview" /><br /><strong>TypeGarden</strong></a></td>
<td align="center" width="33%"><a href="https://motiqo.site/library?element=caustic-button"><img src="docs/readme/caustic-button.gif" width="250" alt="CausticButton animated preview" /><br /><strong>CausticButton</strong></a></td>
</tr>
</table>
<!-- gallery:end -->

## From an idea to your interface

- **Tune it live.** Controls and moods help you find the right movement. Share a URL with your settings.
- **Own the integration.** Download a component ZIP with its helpers, local assets and a runnable example, or use the bundled CLI.
- **Keep it portable.** Exports use React and their declared dependencies, without the Motiqo site's styles or Next.js runtime.
- **Make room for stillness.** Components support pause and reduced motion; GPU components include fallbacks. Check the component's keyboard and touch behavior in your own layout.

## Use a component

### Download from the library

1. Open [the library](https://motiqo.site/library) and choose a component.
2. Adjust its settings, then download the ZIP.
3. Follow its README, install the listed dependencies and copy the component and assets into your React project.

The archive includes `Example.tsx`, your settings, `LICENSE` and resource notices. Some components need an explicitly sized container. Canvas and WebGL quality depends on the device and browser.

### Use the CLI

Download [motiqo-cli-0.1.0.tgz](https://motiqo.site/downloads/motiqo-cli-0.1.0.tgz) into your project, then:

```sh
npm install --save-dev ./motiqo-cli-0.1.0.tgz
npx motiqo list
npx motiqo add helix --dry-run
npx motiqo add helix
```

The CLI is bundled for download; it is **not published on npm**. It checks file hashes and asks you to resolve conflicting files before overwriting them. Review the dry run. `--install` optionally installs missing dependencies with lifecycle scripts disabled; otherwise it prints what to install. For AI coding tools, `npx motiqo skill` installs the included integration guide.

## Run Motiqo locally

Use Node.js 24 and npm.

```sh
git clone https://github.com/robertbetancourt/motiqo.git
cd motiqo
npm ci
npm run dev
```

Open [localhost:3014](http://127.0.0.1:3014). The development command prepares the downloadable CLI first.

```sh
npm test                 # behavioral and regression tests
npm run typecheck        # TypeScript
npm run build            # production site + downloadable CLI
npm run verify:exports   # every example in an independent React project
npm run readme:build     # refresh the gallery after changing previews
```

CI runs these checks, dependency auditing and secret scanning. Passing checks do not replace browser, accessibility or real-device performance reviews.

## Building in the open

Motiqo is still evolving. APIs and visuals may change before a stable release. Bug reports, thoughtful ideas and small fixes are welcome. If something moves you, a star helps others find the project.

[Contributing](CONTRIBUTING.md) · [Security policy](SECURITY.md) · [Code and media notices](THIRD_PARTY_NOTICES.md)

## License and resources

Original Motiqo code and documentation are **MIT licensed**, copyright 2026 Robert Betancourt. Keep the license notice when reusing the code.

Images generated with Midjourney, music created with Suno, and brand assets have separate permissions and are **excluded from the code MIT grant**. Dependencies and fonts retain their own licenses. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before redistributing resources.
