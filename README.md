# Introduction
This is an [nx](https://nx.dev/) monorepo where you can find all of the websites developed and maintained by [Privasys](https://privasys.org/).

# Project Layout
The repo is separated into `fronts` (for our websites' UI) and `server` (for some of our backend services).
- [`apps/fronts/privasys.org`](https://github.com/privasys/websites/tree/main/apps/fronts/privasys.org) source code for [privasys.org](https://privasys.org/)

# Usage
To run any app in development mode run:
```
yarn nx serve [app-name]
```
To build a docker image for any app run:
```
yarn nx dockerize [app-name]
```
