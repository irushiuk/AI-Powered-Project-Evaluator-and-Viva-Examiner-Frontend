# Next + TypeScript + Tailwind Template

Template scaffolded for Next.js (16.2.4) + TypeScript (6.0.3) + Tailwind CSS (4.2.4) with Husky pre-commit build hook.

Quick start (using Yarn):

```bash
cd C:/projects/Test
yarn
# install husky hooks (runs husky install)
yarn prepare
# start dev server
yarn dev
```

Commit-time build:

- The Husky pre-commit hook runs `yarn build`. If the build fails the commit is aborted so you can catch build-time errors early.

Notes:
- After first `yarn` run, run `yarn prepare` to install the Husky hooks (this creates `.husky/_/husky.sh`).
- You can customize the pre-commit hook in `.husky/pre-commit`.
