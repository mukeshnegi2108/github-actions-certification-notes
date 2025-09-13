# Controlling Job Flows and Execution in GitHub Actions

Controlling job flows and execution is fundamental to building robust, efficient, and maintainable CI/CD pipelines with GitHub Actions. Mastering these concepts is essential for certification and for designing workflows that meet real-world requirements.

---

## Key Concepts

### 1. Conditional Execution

GitHub Actions enables you to control when jobs and steps run using the `if` keyword. This allows for dynamic workflows that respond to context, environment variables, or the results of previous jobs.

- **Step-level conditions:**  
  You can use `if` on individual steps to run them only when certain conditions are met.

- **Job-level conditions:**  
  Apply `if` at the job level to control whether an entire job runs.

**Common use cases:**
- Only run deployment on the `main` branch.
- Skip steps if a previous step failed.
- Run steps only on pull requests or specific events.

**Example:**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
        run: npm test

      - name: Upload coverage
        if: success() && github.ref == 'refs/heads/main'
        run: ./upload-coverage.sh
```

**Advanced conditions:**
- Use functions like `success()`, `failure()`, `always()`, and `cancelled()`.
- Reference context objects like `github`, `env`, `job`, `steps`, and `runner`.

**References:**
- [GitHub Actions Expressions](https://docs.github.com/en/actions/learn-github-actions/expressions)

---

### 2. Job Dependencies

By default, jobs run in parallel. To control execution order, use the `needs` keyword to specify dependencies.

- **Serial execution:**  
  Chain jobs so that each waits for the previous to finish.

- **Fan-in/fan-out:**  
  Multiple jobs can depend on a single job (fan-out), or a single job can depend on multiple jobs (fan-in).

**Example:**

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Building..."

  lint:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - run: echo "Linting..."

  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - run: echo "Testing..."

  deploy:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - run: echo "Deploying..."
```

**Best practices:**
- Use `needs` to optimize workflow duration by running independent jobs in parallel.
- Avoid unnecessary dependencies to keep pipelines fast.

---

### 3. Matrix Builds

Matrix builds allow you to run the same job with different parameters (e.g., OS, language version, environment). This is essential for testing compatibility across multiple configurations.

**Example:**

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [14, 16]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm install
      - run: npm test
```

**Advanced matrix features:**
- **Excluding combinations:**  
  Use `exclude` to skip specific matrix combinations.
- **Including extra combinations:**  
  Use `include` to add custom combinations.
- **Fail-fast:**  
  Set `fail-fast: false` to continue running all matrix jobs even if one fails.

**References:**
- [Matrix strategy documentation](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)

---

### 4. Manual Triggers

Manual triggers allow you to run workflows on demand using the `workflow_dispatch` event. This is useful for ad-hoc tasks, manual deployments, or running maintenance scripts.

**Features:**
- Accept input parameters from the UI.
- Combine with conditions for flexible execution.

**Example:**

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to ${{ github.event.inputs.environment }}"
```

**Best practices:**
- Use manual triggers for production deployments or one-off scripts.
- Document input parameters for clarity.

---

## Advanced Techniques

### Dynamic Job Generation

You can use reusable workflows and composite actions to create dynamic job flows, especially for large or complex pipelines.

**Reusable workflow example:**

```yaml
# .github/workflows/deploy.yml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploying to ${{ inputs.environment }}"
```

**Calling workflow:**

```yaml
jobs:
  call-deploy:
    uses: ./.github/workflows/deploy.yml
    with:
      environment: production
```

---

### Error Handling and Job Control

- Use `continue-on-error: true` to allow jobs or steps to fail without failing the workflow.
- Use `timeout-minutes` to limit job execution time.
- Use `outputs` to pass data between jobs.

**Example:**

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      artifact-path: ${{ steps.build.outputs.artifact-path }}
    steps:
      - id: build
        run: echo "::set-output name=artifact-path::dist/app.zip"

  deploy:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - run: echo "Deploying ${{ needs.build.outputs.artifact-path }}"
```

---

## Example Workflow

Here is a comprehensive workflow demonstrating these concepts:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Building..."

  test:
    runs-on: ubuntu-latest
    needs: build
    strategy:
      matrix:
        node: [14, 16]
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm install
      - run: npm test

  lint:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - run: npm run lint

  deploy:
    runs-on: ubuntu-latest
    needs: [test, lint]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - run: echo "Deploying to production..."
```

---

## Conclusion

Controlling job flows and execution in GitHub Actions is a powerful way to build flexible, efficient, and maintainable CI/CD pipelines. For certification, ensure you understand:

- How to use `if`, `needs`, and matrix strategies.
- How to trigger workflows manually and pass inputs.
- How to optimize workflows for speed and reliability.
- How to handle errors and pass data between jobs.

**Further Reading:**