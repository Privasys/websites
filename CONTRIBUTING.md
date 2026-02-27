# Contributing to Privasys Websites

Thank you for your interest in contributing! This repository contains all public Privasys websites, including [privasys.org](https://privasys.org/) and [docs.privasys.org](https://docs.privasys.org/).

## Getting Started

1. **Fork** the repository and clone your fork.
2. Install dependencies:
   ```bash
   yarn install
   ```
3. Start the app you want to work on in development mode:
   ```bash
   yarn nx serve docs.privasys.org   # documentation site
   yarn nx serve privasys.org        # main website
   ```

## Repository Structure

| Path | Description |
|------|-------------|
| `apps/fronts/privasys.org` | Main website ([privasys.org](https://privasys.org/)) |
| `apps/fronts/docs.privasys.org` | Documentation site ([docs.privasys.org](https://docs.privasys.org/)) |
| `libs/` | Shared libraries used across apps |

## Making Changes

### Documentation

Documentation pages live in `apps/fronts/docs.privasys.org/content/docs/` as MDX files. To add or edit a page:

1. Edit or create an `.mdx` file in the appropriate folder.
2. If adding a new page, register it in the relevant `meta.json`.
3. Preview your changes locally with `yarn nx serve docs.privasys.org`.

### Code

- Follow the existing code style — the project uses ESLint and TypeScript strict mode.
- Keep commits focused: one logical change per commit.
- Write meaningful commit messages (e.g. `docs: add AMD SEV-SNP section to confidential computing page`).

## Submitting a Pull Request

1. Create a feature branch from `main`:
   ```bash
   git checkout -b my-feature
   ```
2. Make your changes and commit.
3. Push to your fork and open a Pull Request against `main`.
4. Describe what you changed and why.

### Build Check

Before submitting, make sure the project builds successfully:

```bash
yarn nx build docs.privasys.org
yarn nx build privasys.org
```

## Reporting Issues

If you find a bug or have a suggestion, please [open an issue](https://github.com/Privasys/websites/issues). Include:

- A clear description of the problem or suggestion.
- Steps to reproduce (for bugs).
- Screenshots if applicable.

## License

By contributing, you agree that your contributions will be licensed under the [GNU Affero General Public License v3.0](LICENSE).
