#!/bin/bash

# Simple script to comment on specific dependabot PRs by branch name
# Run this if you want to comment without closing

COMMENT="This PR is being closed because it's based on the webpack setup, which has been replaced with Vite in commit b43ae21.

All of these dependabot PRs would:
- Remove Vite and restore webpack/webpack-dev-server
- Delete vite.config.ts and restore webpack.config.js
- Downgrade @types/node from v20 back to v12
- Undo the entire webpack → Vite migration

The security vulnerabilities will be addressed through \`npm audit fix\` on the current Vite-based codebase instead.

See commit b43ae21 for details on the webpack → Vite migration."

# List of all dependabot branches
BRANCHES=(
  "dependabot/npm_and_yarn/acorn-5.7.4"
  "dependabot/npm_and_yarn/ajv-6.12.6"
  "dependabot/npm_and_yarn/browserslist-4.16.6"
  "dependabot/npm_and_yarn/decode-uri-component-0.2.2"
  "dependabot/npm_and_yarn/dns-packet-1.3.4"
  "dependabot/npm_and_yarn/elliptic-6.5.4"
  "dependabot/npm_and_yarn/eventsource-1.1.1"
  "dependabot/npm_and_yarn/express-4.18.2"
  "dependabot/npm_and_yarn/follow-redirects-1.14.8"
  "dependabot/npm_and_yarn/handlebars-4.7.7"
  "dependabot/npm_and_yarn/hosted-git-info-2.8.9"
  "dependabot/npm_and_yarn/http-proxy-1.18.1"
  "dependabot/npm_and_yarn/ini-1.3.7"
  "dependabot/npm_and_yarn/json5-and-json5-and-html-webpack-plugin-2.2.3"
  "dependabot/npm_and_yarn/loader-utils-and-html-webpack-plugin-1.4.2"
  "dependabot/npm_and_yarn/lodash-4.17.21"
  "dependabot/npm_and_yarn/path-parse-1.0.7"
  "dependabot/npm_and_yarn/qs-6.5.3"
  "dependabot/npm_and_yarn/ssri-6.0.2"
  "dependabot/npm_and_yarn/terser-4.8.1"
  "dependabot/npm_and_yarn/tmpl-1.0.5"
  "dependabot/npm_and_yarn/url-parse-1.5.10"
  "dependabot/npm_and_yarn/websocket-extensions-0.1.4"
  "dependabot/npm_and_yarn/y18n-4.0.1"
)

echo "This will comment on and close all 24 dependabot PRs"
echo ""

for branch in "${BRANCHES[@]}"; do
  echo "Processing branch: $branch"

  # Try to find and close the PR by branch name
  gh pr list --head "$branch" --json number --jq '.[0].number' 2>/dev/null | while read -r pr_number; do
    if [ -n "$pr_number" ]; then
      echo "  Found PR #$pr_number"
      echo "$COMMENT" | gh pr comment "$pr_number" --body-file - 2>/dev/null && echo "  ✓ Commented"
      gh pr close "$pr_number" 2>/dev/null && echo "  ✓ Closed"
    fi
  done
done

echo ""
echo "Done!"
