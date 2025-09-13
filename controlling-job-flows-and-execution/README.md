# GitHub Actions - Controlling Job Flows and Job Execution

## Overview

Controlling job flows and execution is essential for building sophisticated CI/CD pipelines. This guide covers job dependencies, conditional execution, matrix strategies, concurrency control, and advanced flow patterns that enable you to orchestrate complex workflows efficiently.

## Job Dependencies

### Basic Job Dependencies

Jobs run in parallel by default. Use `needs` to create dependencies:

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - name: Setup step
        run: echo "Setting up environment"

  build:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - name: Build step
        run: echo "Building application"

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Test step
        run: echo "Running tests"

  deploy:
    needs: [build, test]  # Multiple dependencies
    runs-on: ubuntu-latest
    steps:
      - name: Deploy step
        run: echo "Deploying application"
```

### Complex Dependency Chains

```yaml
jobs:
  # Parallel initial jobs
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Lint code
        run: echo "Linting"

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Unit tests
        run: echo "Unit testing"

  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build
        run: echo "Building"

  # Integration tests need build to complete
  integration-tests:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Integration tests
        run: echo "Integration testing"

  # Security scan can run after build
  security-scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Security scan
        run: echo "Security scanning"

  # Deploy needs everything to pass
  deploy:
    needs: [lint, unit-tests, integration-tests, security-scan]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: echo "Deploying"
```

### Conditional Dependencies

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build
        run: echo "Building"

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: echo "Testing"

  deploy-staging:
    needs: [build, test]
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to staging
        run: echo "Deploying to staging"

  deploy-production:
    needs: [build, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploying to production"
```

## Conditional Execution

### Job-Level Conditions

```yaml
jobs:
  always-run:
    runs-on: ubuntu-latest
    steps:
      - name: Always runs
        run: echo "This always runs"

  main-only:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Main branch only
        run: echo "Only on main branch"

  pr-only:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Pull request only
        run: echo "Only on pull requests"

  manual-only:
    if: github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Manual trigger only
        run: echo "Only when manually triggered"
```

### Step-Level Conditions

```yaml
jobs:
  conditional-steps:
    runs-on: ubuntu-latest
    steps:
      - name: Always runs
        run: echo "This step always runs"

      - name: Main branch step
        if: github.ref == 'refs/heads/main'
        run: echo "This runs only on main"

      - name: File changed step
        if: contains(github.event.head_commit.modified, 'package.json')
        run: echo "package.json was modified"

      - name: Previous step success
        if: success()
        run: echo "All previous steps succeeded"

      - name: Previous step failure
        if: failure()
        run: echo "A previous step failed"

      - name: Always run cleanup
        if: always()
        run: echo "This runs regardless of previous step outcomes"
```

### Advanced Conditional Logic

```yaml
jobs:
  advanced-conditions:
    runs-on: ubuntu-latest
    steps:
      - name: Complex condition
        if: |
          github.event_name == 'push' &&
          startsWith(github.ref, 'refs/heads/release/') &&
          contains(github.event.head_commit.message, '[deploy]')
        run: echo "Complex condition met"

      - name: Multiple OR conditions
        if: |
          github.ref == 'refs/heads/main' ||
          github.ref == 'refs/heads/develop' ||
          startsWith(github.ref, 'refs/heads/hotfix/')
        run: echo "One of multiple conditions met"

      - name: Environment-based condition
        if: vars.ENVIRONMENT == 'production'
        run: echo "Production environment"

      - name: Actor-based condition
        if: github.actor == 'dependabot[bot]'
        run: echo "Triggered by Dependabot"
```

## Matrix Strategies

### Basic Matrix

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - name: Run tests
        run: npm test
```

### Matrix with Include/Exclude

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
        include:
          # Add specific combinations
          - os: ubuntu-latest
            node-version: 21
            experimental: true
          - os: windows-latest
            node-version: 18
            custom-flag: '--windows-specific'
        exclude:
          # Remove specific combinations
          - os: macos-latest
            node-version: 16
          - os: windows-latest
            node-version: 20
    runs-on: ${{ matrix.os }}
    continue-on-error: ${{ matrix.experimental == true }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - name: Run tests
        run: npm test ${{ matrix.custom-flag }}
```

### Dynamic Matrix

```yaml
jobs:
  generate-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.generate.outputs.matrix }}
    steps:
      - uses: actions/checkout@v4
      - name: Generate matrix
        id: generate
        run: |
          # Generate matrix based on changed files
          if git diff --name-only HEAD~1 | grep -q "frontend/"; then
            matrix='{"include":[{"component":"frontend","path":"frontend/"},{"component":"backend","path":"backend/"}]}'
          else
            matrix='{"include":[{"component":"backend","path":"backend/"}]}'
          fi
          echo "matrix=$matrix" >> $GITHUB_OUTPUT

  test:
    needs: generate-matrix
    strategy:
      matrix: ${{ fromJSON(needs.generate-matrix.outputs.matrix) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Test ${{ matrix.component }}
        run: |
          cd ${{ matrix.path }}
          npm test
```

### Matrix Failure Handling

```yaml
jobs:
  test:
    strategy:
      fail-fast: false  # Don't cancel other jobs if one fails
      max-parallel: 3   # Limit concurrent jobs
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16, 18, 20]
        include:
          - os: ubuntu-latest
            node-version: 21
            experimental: true
    runs-on: ${{ matrix.os }}
    continue-on-error: ${{ matrix.experimental == true }}
    steps:
      - name: Test with Node ${{ matrix.node-version }} on ${{ matrix.os }}
        run: npm test
```

## Concurrency Control

### Basic Concurrency

```yaml
name: Deployment
on:
  push:
    branches: [main]

# Only one deployment can run at a time
concurrency:
  group: deployment
  cancel-in-progress: false  # Don't cancel running deployments

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: echo "Deploying..."
```

### Branch-Specific Concurrency

```yaml
name: Environment Deployment
on:
  push:
    branches: [main, develop]

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true  # Cancel previous deployments for same branch

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to environment
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "Deploying to production"
          else
            echo "Deploying to staging"
          fi
```

### Job-Level Concurrency

```yaml
jobs:
  test:
    concurrency:
      group: test-${{ github.ref }}
      cancel-in-progress: true
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
        run: npm test

  deploy:
    concurrency:
      group: deploy-${{ github.ref }}
      cancel-in-progress: false  # Don't cancel deployments
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: deploy.sh
```

## Advanced Flow Patterns

### 1. Fan-Out/Fan-In Pattern

```yaml
jobs:
  # Fan-out: Distribute work across multiple jobs
  prepare:
    runs-on: ubuntu-latest
    outputs:
      test-files: ${{ steps.find-tests.outputs.files }}
    steps:
      - uses: actions/checkout@v4
      - name: Find test files
        id: find-tests
        run: |
          files=$(find tests/ -name "*.test.js" | jq -R -s -c 'split("\n")[:-1]')
          echo "files=$files" >> $GITHUB_OUTPUT

  test:
    needs: prepare
    strategy:
      matrix:
        test-file: ${{ fromJSON(needs.prepare.outputs.test-files) }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run test file
        run: npm test ${{ matrix.test-file }}

  # Fan-in: Collect results from distributed work
  collect-results:
    needs: test
    if: always()
    runs-on: ubuntu-latest
    steps:
      - name: Collect test results
        run: |
          if [ "${{ needs.test.result }}" = "success" ]; then
            echo "All tests passed"
          else
            echo "Some tests failed"
            exit 1
          fi
```

### 2. Pipeline Stages with Gates

```yaml
jobs:
  # Stage 1: Build and Test
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - name: Build and get version
        id: version
        run: |
          echo "Building..."
          version="1.0.$(date +%s)"
          echo "version=$version" >> $GITHUB_OUTPUT

  unit-test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Unit tests
        run: echo "Running unit tests"

  integration-test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Integration tests
        run: echo "Running integration tests"

  # Gate: All tests must pass
  test-gate:
    needs: [unit-test, integration-test]
    runs-on: ubuntu-latest
    steps:
      - name: Test gate passed
        run: echo "All tests passed, ready for deployment"

  # Stage 2: Deployment
  deploy-staging:
    needs: [test-gate, build]
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        run: echo "Deploying version ${{ needs.build.outputs.version }} to staging"

  # Gate: Manual approval for production
  production-gate:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - name: Production gate
        run: echo "Approved for production deployment"

  deploy-production:
    needs: [production-gate, build]
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploying version ${{ needs.build.outputs.version }} to production"
```

### 3. Conditional Pipeline Branches

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      frontend-changed: ${{ steps.changes.outputs.frontend }}
      backend-changed: ${{ steps.changes.outputs.backend }}
      docs-changed: ${{ steps.changes.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      - name: Detect changes
        id: changes
        run: |
          if git diff --name-only HEAD~1 | grep -q "^frontend/"; then
            echo "frontend=true" >> $GITHUB_OUTPUT
          else
            echo "frontend=false" >> $GITHUB_OUTPUT
          fi
          
          if git diff --name-only HEAD~1 | grep -q "^backend/"; then
            echo "backend=true" >> $GITHUB_OUTPUT
          else
            echo "backend=false" >> $GITHUB_OUTPUT
          fi
          
          if git diff --name-only HEAD~1 | grep -q "^docs/"; then
            echo "docs=true" >> $GITHUB_OUTPUT
          else
            echo "docs=false" >> $GITHUB_OUTPUT
          fi

  # Frontend pipeline
  frontend-test:
    needs: detect-changes
    if: needs.detect-changes.outputs.frontend-changed == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Test frontend
        run: echo "Testing frontend changes"

  frontend-build:
    needs: frontend-test
    runs-on: ubuntu-latest
    steps:
      - name: Build frontend
        run: echo "Building frontend"

  # Backend pipeline
  backend-test:
    needs: detect-changes
    if: needs.detect-changes.outputs.backend-changed == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Test backend
        run: echo "Testing backend changes"

  backend-build:
    needs: backend-test
    runs-on: ubuntu-latest
    steps:
      - name: Build backend
        run: echo "Building backend"

  # Documentation pipeline
  docs-build:
    needs: detect-changes
    if: needs.detect-changes.outputs.docs-changed == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Build documentation
        run: echo "Building documentation"

  # Deployment (runs if any component was built)
  deploy:
    needs: [frontend-build, backend-build, docs-build]
    if: always() && (needs.frontend-build.result == 'success' || needs.backend-build.result == 'success' || needs.docs-build.result == 'success')
    runs-on: ubuntu-latest
    steps:
      - name: Deploy changes
        run: echo "Deploying updated components"
```

### 4. Retry and Error Handling

```yaml
jobs:
  flaky-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        attempt: [1, 2, 3]  # Retry up to 3 times
    steps:
      - name: Run flaky test (attempt ${{ matrix.attempt }})
        id: test
        run: |
          # Simulate flaky test
          if [ $(($RANDOM % 3)) -eq 0 ]; then
            echo "Test passed on attempt ${{ matrix.attempt }}"
          else
            echo "Test failed on attempt ${{ matrix.attempt }}"
            exit 1
          fi
        continue-on-error: true

      - name: Report success
        if: steps.test.outcome == 'success'
        run: |
          echo "Test succeeded on attempt ${{ matrix.attempt }}"
          # Cancel other retry attempts
          curl -X POST \
            -H "Authorization: token ${{ secrets.GITHUB_TOKEN }}" \
            -H "Accept: application/vnd.github.v3+json" \
            "https://api.github.com/repos/${{ github.repository }}/actions/runs/${{ github.run_id }}/cancel"

  robust-deployment:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy with retry
        run: |
          for attempt in 1 2 3; do
            echo "Deployment attempt $attempt"
            if deploy.sh; then
              echo "Deployment successful"
              break
            else
              echo "Deployment failed, attempt $attempt"
              if [ $attempt -eq 3 ]; then
                echo "All deployment attempts failed"
                exit 1
              fi
              sleep 30  # Wait before retry
            fi
          done
```

## Performance Optimization

### 1. Parallel Job Optimization

```yaml
jobs:
  # Run independent jobs in parallel
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Lint
        run: echo "Linting..."

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Security scan
        run: echo "Security scanning..."

  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - name: Dependency check
        run: echo "Checking dependencies..."

  # Tests can run after any of the above complete
  test:
    needs: [lint]  # Only need linting to pass
    runs-on: ubuntu-latest
    steps:
      - name: Test
        run: echo "Testing..."

  # Build requires all quality checks
  build:
    needs: [lint, security-scan, dependency-check]
    runs-on: ubuntu-latest
    steps:
      - name: Build
        run: echo "Building..."
```

### 2. Conditional Job Execution

```yaml
jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      code-changed: ${{ steps.filter.outputs.code }}
      docs-changed: ${{ steps.filter.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            code:
              - 'src/**'
              - 'tests/**'
              - 'package.json'
            docs:
              - 'docs/**'
              - '*.md'

  # Only run expensive tests if code changed
  test:
    needs: changes
    if: needs.changes.outputs.code-changed == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
        run: echo "Running expensive tests..."

  # Only rebuild docs if docs changed
  docs:
    needs: changes
    if: needs.changes.outputs.docs-changed == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Build docs
        run: echo "Building documentation..."
```

## Best Practices

### 1. Job Naming and Organization

```yaml
jobs:
  # Use descriptive job names
  code-quality-checks:
    runs-on: ubuntu-latest
    steps:
      - name: Lint code
        run: eslint .
      - name: Check formatting
        run: prettier --check .

  unit-and-integration-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Unit tests
        run: npm run test:unit
      - name: Integration tests
        run: npm run test:integration

  security-vulnerability-scan:
    runs-on: ubuntu-latest
    steps:
      - name: Audit dependencies
        run: npm audit
      - name: CodeQL scan
        uses: github/codeql-action/analyze@v2
```

### 2. Error Handling and Debugging

```yaml
jobs:
  deployment:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy with error handling
        id: deploy
        run: |
          if ! deploy.sh; then
            echo "deployment-failed=true" >> $GITHUB_OUTPUT
            exit 1
          fi
        continue-on-error: true

      - name: Rollback on failure
        if: steps.deploy.outputs.deployment-failed == 'true'
        run: |
          echo "Deployment failed, initiating rollback"
          rollback.sh

      - name: Notify on failure
        if: failure()
        run: |
          curl -X POST "${{ secrets.SLACK_WEBHOOK }}" \
            -d '{"text":"Deployment failed for ${{ github.repository }}"}'
```

### 3. Resource Optimization

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      max-parallel: 2  # Limit resource usage
      matrix:
        test-suite: [unit, integration, e2e]
    steps:
      - name: Run ${{ matrix.test-suite }} tests
        run: npm run test:${{ matrix.test-suite }}
        timeout-minutes: 30  # Prevent hanging jobs
```

Understanding job flow control enables you to create sophisticated, efficient, and maintainable workflows that can handle complex deployment scenarios, optimize resource usage, and provide robust error handling and recovery mechanisms.