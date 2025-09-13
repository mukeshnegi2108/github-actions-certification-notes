# GitHub Actions - Building Blocks and Components

GitHub Actions enables automation of software workflows directly in your GitHub repository. Mastering its core building blocks is essential for designing robust CI/CD pipelines and automation solutions.

---

## 1. Workflows

A **workflow** is the top-level automation configuration. Workflows are defined as YAML files in the `.github/workflows/` directory of your repository. Each workflow can be triggered by one or more events (e.g., `push`, `pull_request`, `schedule`, `workflow_dispatch`).

**Key Points:**
- **Multiple Workflows:** You can have multiple workflow files, each handling different automation tasks.
- **Naming:** Each workflow can be named for clarity using the `name:` field.
- **Triggers:** Workflows are triggered by events, which can be repository events (push, PR), scheduled events (cron), or manual triggers.
- **Example:**
    ```yaml
    name: CI Pipeline
    on: [push, pull_request]
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - name: Run tests
            run: npm test
    ```

---

## 2. Jobs

A **job** is a set of steps that execute on the same runner. Jobs are defined under the `jobs:` key in a workflow file.

**Key Points:**
- **Isolation:** Each job runs in a fresh virtual environment (runner).
- **Parallelism:** By default, jobs run in parallel unless dependencies are specified using `needs:`.
- **Dependencies:** Use `needs:` to define job dependencies and control execution order.
- **Matrix Builds:** Jobs can use a matrix strategy to run the same steps with different parameters (e.g., multiple Node.js versions).
- **Example:**
    ```yaml
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - run: echo "Building..."
      test:
        runs-on: ubuntu-latest
        needs: build
        steps:
          - run: echo "Testing..."
    ```

---

## 3. Steps

**Steps** are individual tasks within a job. Each step can run a shell command or use an action.

**Key Points:**
- **Order:** Steps run sequentially within a job.
- **Types:** Steps can be shell commands (`run:`) or actions (`uses:`).
- **Environment:** All steps in a job share the same environment and filesystem.
- **Example:**
    ```yaml
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
    ```

---

## 4. Actions

An **action** is a reusable component that performs a specific task. Actions can be created by you, your organization, or the community (available on the GitHub Marketplace).

**Key Points:**
- **Types:** JavaScript, Docker, and Composite actions.
- **Usage:** Referenced in workflows using the `uses:` keyword.
- **Inputs/Outputs:** Actions can accept inputs and produce outputs for use in workflows.
- **Example:**
    ```yaml
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
    ```

---

## 5. Runners

A **runner** is a server that executes the jobs in a workflow. GitHub provides hosted runners (Linux, Windows, macOS), or you can use self-hosted runners.

**Key Points:**
- **Hosted Runners:** Managed by GitHub, pre-configured with popular tools.
- **Self-hosted Runners:** Managed by you, useful for custom environments or private infrastructure.
- **Selecting Runners:** Use `runs-on:` to specify the runner type.

---

## 6. Example Workflow Structure

```yaml
name: Example Workflow
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
```

---

## Summary Table

| Component | Description | Key YAML Key |
|-----------|-------------|-------------|
| Workflow  | Top-level automation definition | `.github/workflows/*.yml` |
| Job       | Group of steps, runs on a runner | `jobs:` |
| Step      | Individual task in a job | `steps:` |
| Action    | Reusable automation unit | `uses:` |
| Runner    | Machine executing jobs | `runs-on:` |

---

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)