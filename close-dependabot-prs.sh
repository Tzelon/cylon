#!/bin/bash

# Script to comment on and close all outdated dependabot PRs
# These PRs are based on the old webpack setup and conflict with our Vite migration

COMMENT="This PR is being closed because it's based on the webpack setup, which has been replaced with Vite in commit b43ae21.

All of these dependabot PRs would:
- Remove Vite and restore webpack/webpack-dev-server
- Delete vite.config.ts and restore webpack.config.js
- Downgrade @types/node from v20 back to v12
- Undo the entire webpack → Vite migration

The security vulnerabilities will be addressed through \`npm audit fix\` on the current Vite-based codebase instead.

See commit b43ae21 for details on the webpack → Vite migration."

echo "Fetching all open PRs..."

# Get all open PRs and filter for dependabot ones
gh pr list --state open --json number,title,headRefName --limit 100 | \
  jq -r '.[] | select(.headRefName | startswith("dependabot/npm_and_yarn/")) | .number' | \
  while read -r pr_number; do
    echo ""
    echo "Processing PR #$pr_number..."

    # Comment on the PR
    echo "$COMMENT" | gh pr comment "$pr_number" --body-file -

    # Close the PR
    gh pr close "$pr_number"

    echo "✓ Closed PR #$pr_number"
  done

echo ""
echo "All dependabot PRs have been closed!"
