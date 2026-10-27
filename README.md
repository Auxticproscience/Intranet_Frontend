# Intranet Frontend

Angular frontend for an internal enterprise platform, originally developed for ProScience. It includes authentication, profiles, academy courses and certificates, documents, requirements, reports, user and area administration, fixed assets, and meeting-room reservations. Existing branding and business behavior remain in place during foundation cleanup.

## Requirements

- Node.js: `^20.19.0 || ^22.12.0 || ^24.0.0`.
- npm: version 10 or 11; npm is the only supported package manager.
- Chrome for Karma/Jasmine tests; set `CHROME_BIN` for a nonstandard installation.

See [Angular version compatibility](https://angular.dev/reference/versions). The lockfile retains Angular 20.3.1, CLI/build/SSR 20.3.2, Material/CDK 20.2.4, and TypeScript 5.9.2. Angular CLI is installed locally.

## Installation and development

```sh
git clone https://github.com/LuisVelez1/Intranet_Frontend.git
cd Intranet_Frontend
npm ci
npm start
```

The development server normally listens at http://localhost:4200. Use `npm ci` for clean installations. Use `npm install` only when intentionally changing dependencies and review both package manifests together. Do not use pnpm or dependency-conflict bypass flags.

## Commands

| Command                                               | Purpose                                                |
| ----------------------------------------------------- | ------------------------------------------------------ |
| `npm start`                                           | Start the development server                           |
| `npm run build`                                       | Build the configured production application into dist/ |
| `npm run watch`                                       | Build continuously with development settings           |
| `npm run lint`                                        | Check TypeScript and Angular templates                 |
| `npm run format`                                      | Format files covered by the current formatting policy  |
| `npm run format:check`                                | Check the same formatting scope without writing        |
| `npm test`                                            | Run Karma/Jasmine interactively                        |
| `npm test -- --watch=false --browsers=ChromeHeadless` | Run all tests once with headless Chrome                |
| `npm run ng -- <command>`                             | Run the local Angular CLI                              |

## Repository layout

- `src/app/core/`: services, models, constants, and HTTP interceptors.
- `src/app/guards/`: authenticated and reverse-authentication navigation guards.
- `src/app/layouts/`: authentication and main application layouts.
- `src/app/pages/`: existing application pages and routes.
- `src/app/shared/`: shared components, including the loading indicator.
- `src/environments/environment.production.ts`: existing public frontend API configuration.
- `src/main.server.ts` and `src/server.ts`: retained SSR entry points.

Standalone components and lazy routes organize the application. Authentication, loading, and error interceptors support HTTP requests. Foundation cleanup does not migrate this structure or change authentication.

Internal requirements filenames use corrected spelling. Public URLs such as `/requeriments` and `/requeriments/my-requeriments` retain their existing spelling for compatibility. Backend endpoints, request/response properties, and site/role values are unchanged.

Frontend configuration is public once bundled. Do not store secrets in source files. Local .env files, dependencies, build output, coverage, and caches are ignored. Shared VS Code launch/task/extension settings are retained.

## Formatting and lint policy

Prettier is pinned in development dependencies. Its explicit configuration retains single quotes, a 100-character print width, and the Angular HTML parser, with LF line endings. npm generates its own lockfile. Existing CRLF files are normalized only as they are touched; no repository-wide renormalization is required.

The explicit legacy entries in .prettierignore defer formatting of untouched files. When editing one, remove its entry and format it in that change. New files are checked by default. This temporary list avoids a mass-formatting foundation diff.

ESLint uses the Angular 20 tooling line with recommended TypeScript and Angular template rules. Constructor injection remains allowed to avoid an architectural migration. Unused local variables and imports are errors; unused parameters are allowed to preserve callbacks and unfinished service signatures. Existing explicit-any and platform Object annotations remain visible as warnings only in listed files. A profile token-decoding variable is also deferred because its initializer may throw. No TypeScript checks or tests are disabled.

## Docker and known technical debt

The two-stage Node Alpine Dockerfile retains port 4000 and its SSR startup command. Both installation stages use deterministic npm ci without legacy-peer-deps; the lockfile installs successfully without that flag.

**Existing deployment mismatch:** angular.json configures static output and disables prerendering, while the Docker runtime and serve:ssr script expect dist/intranet-frontend/server/server.mjs. The current production build does not produce that server entry point. The container is therefore not deployment-ready. Resolving the hosting/SSR decision is deferred; SSR source and dependencies remain intact.

Other deferred items:

- Baseline npm audit reported 51 advisories (1 low, 13 moderate, 34 high, 3 critical). Dependency/security remediation needs a separately reviewed phase; no automatic audit fix was applied.
- Angular ESLint 20.7.0 supports ESLint 8/9; ESLint 9 is retained for compatibility despite its npm support warning. Revisit tooling support alongside the future framework/toolchain review.
- The compiler reports existing NG8107 optional-chain typing debt in the area requirements template. Its runtime guard is retained.
- The empty admin report TypeScript file is retained as potentially unfinished business functionality. The empty app stylesheet is still referenced.
- Test coverage is limited to two app-shell tests. The obsolete generated welcome-heading assertion has been replaced with checks of the actual route outlet and loading indicator.
- Business strings, branding, API typing, comments outside this cleanup, and broader formatting debt remain for later phases.

## Author

Luis Eduardo Vélez — [LuisVelez1](https://github.com/LuisVelez1)
