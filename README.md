# Privasys Websites

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

This is an [Nx](https://nx.dev/) monorepo containing all public websites developed and maintained by [Privasys](https://privasys.org/).

## Websites

| Site | Path | URL |
|------|------|-----|
| Main website | [`apps/fronts/privasys.org`](apps/fronts/privasys.org) | [privasys.org](https://privasys.org/) |
| Documentation | [`apps/fronts/docs.privasys.org`](apps/fronts/docs.privasys.org) | [docs.privasys.org](https://docs.privasys.org/) |

## Getting Started

Install dependencies:

```bash
yarn install
```

Run any app in development mode:

```bash
yarn nx serve docs.privasys.org
yarn nx serve privasys.org
```

Build an app:

```bash
yarn nx build docs.privasys.org
```

Build a Docker image:

```bash
yarn nx dockerize privasys.org
```

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a pull request.

## Security

To report a security vulnerability, please see our [Security Policy](SECURITY.md).

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
