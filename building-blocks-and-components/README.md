# GitHub Actions - Building Blocks and Components

## Overview

GitHub Actions is a CI/CD platform that allows you to automate your software development workflows directly in your GitHub repository. Understanding the core building blocks and components is essential for creating effective automation workflows.

## Core Components

### 1. Workflows

A **workflow** is an automated process that runs one or more jobs. Workflows are defined in YAML files stored in the `.github/workflows` directory of your repository.

**Key characteristics:**
- Triggered by events (push, pull request, schedule, etc.)
- Can run on different operating systems (Ubuntu, Windows, macOS)
- Can run jobs in parallel or sequentially
- Defined using YAML syntax

**Basic workflow structure:**
```yaml
name: CI Workflow
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test
```

### 2. Events

**Events** are specific activities that trigger a workflow run. They define when your workflow should execute.

**Common event types:**
- `push` - Triggered when commits are pushed to the repository
- `pull_request` - Triggered when a pull request is opened, updated, or closed
- `schedule` - Triggered on a cron schedule
- `workflow_dispatch` - Manually triggered
- `release` - Triggered when a release is created
- `issues` - Triggered when issues are opened, closed, etc.

**Event examples:**
```yaml
# Trigger on push to main branch
on:
  push:
    branches: [ main ]

# Trigger on pull request to main
on:
  pull_request:
    branches: [ main ]

# Multiple events
on: [push, pull_request]

# Scheduled trigger (daily at 2 AM UTC)
on:
  schedule:
    - cron: '0 2 * * *'

# Manual trigger with inputs
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
```

### 3. Jobs

A **job** is a set of steps that execute on the same runner. Jobs run in parallel by default but can be configured to run sequentially using dependencies.

**Key features:**
- Each job runs in a fresh virtual environment
- Jobs can depend on other jobs
- Jobs can run on different operating systems
- Jobs can share data using artifacts or outputs

**Job structure:**
```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: npm test

  build:
    needs: test  # Runs after 'test' job completes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build application
        run: npm run build
```

### 4. Steps

**Steps** are individual tasks that run commands or actions. Each step runs in its own process and has access to the filesystem.

**Types of steps:**
- **Action steps**: Use pre-built actions from the marketplace or custom actions
- **Command steps**: Run shell commands directly

**Step examples:**
```yaml
steps:
  # Action step
  - name: Checkout code
    uses: actions/checkout@v4

  # Command step
  - name: Install dependencies
    run: npm install

  # Step with conditional execution
  - name: Deploy to production
    if: github.ref == 'refs/heads/main'
    run: npm run deploy

  # Step with environment variables
  - name: Run with custom env
    run: echo "Hello $NAME"
    env:
      NAME: "GitHub Actions"
```

### 5. Actions

**Actions** are reusable units of code that perform specific tasks. They can be:
- **Public actions** from GitHub Marketplace
- **Custom actions** you create
- **Community actions** from other developers

**Types of actions:**
- **JavaScript actions**: Run directly on the runner
- **Docker container actions**: Run inside a Docker container
- **Composite actions**: Combine multiple steps into a single action

**Using actions:**
```yaml
steps:
  # Public action from marketplace
  - uses: actions/checkout@v4

  # Action with parameters
  - uses: actions/setup-node@v4
    with:
      node-version: '18'

  # Custom action from same repository
  - uses: ./.github/actions/my-custom-action

  # Action from another repository
  - uses: owner/repository@v1
    with:
      parameter: value
```

### 6. Runners

**Runners** are servers that execute your workflows. GitHub provides hosted runners, or you can host your own.

**GitHub-hosted runners:**
- `ubuntu-latest` (Ubuntu)
- `windows-latest` (Windows Server)
- `macos-latest` (macOS)

**Runner specifications:**
```yaml
jobs:
  test:
    runs-on: ubuntu-latest  # GitHub-hosted Ubuntu runner
    
  windows-test:
    runs-on: windows-latest  # GitHub-hosted Windows runner
    
  self-hosted:
    runs-on: [self-hosted, linux]  # Self-hosted Linux runner
```

## Workflow Syntax Elements

### Environment Variables

```yaml
env:
  GLOBAL_VAR: "global value"

jobs:
  test:
    env:
      JOB_VAR: "job value"
    runs-on: ubuntu-latest
    steps:
      - name: Use environment variables
        env:
          STEP_VAR: "step value"
        run: |
          echo "Global: $GLOBAL_VAR"
          echo "Job: $JOB_VAR"
          echo "Step: $STEP_VAR"
```

### Expressions and Contexts

GitHub Actions provides contexts and expressions for dynamic workflow behavior:

```yaml
steps:
  - name: Check event type
    run: echo "Event: ${{ github.event_name }}"
  
  - name: Conditional step
    if: ${{ github.ref == 'refs/heads/main' }}
    run: echo "This is the main branch"
  
  - name: Use runner info
    run: echo "Runner OS: ${{ runner.os }}"
```

### Matrix Strategy

Run jobs across multiple configurations:

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
      - run: npm test
```

## Best Practices

### 1. Workflow Organization

- Use descriptive workflow and job names
- Keep workflows focused on specific tasks
- Use consistent naming conventions
- Document complex workflows with comments

### 2. Resource Management

- Use appropriate runner types for your workload
- Cache dependencies to speed up builds
- Use parallel jobs when possible
- Set timeouts to prevent runaway jobs

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/cache@v3
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

### 3. Security

- Pin action versions to specific SHAs or tags
- Use secrets for sensitive information
- Limit workflow permissions
- Validate inputs in custom actions

```yaml
jobs:
  secure-job:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608  # v4.1.0
```

## Common Patterns

### 1. CI/CD Pipeline

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: echo "Deploying to production..."
```

### 2. Multi-Platform Testing

```yaml
name: Multi-Platform Tests
on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        python-version: ['3.8', '3.9', '3.10', '3.11']
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install -r requirements.txt
      - run: pytest
```

## Debugging and Troubleshooting

### Enable Debug Logging

Add these secrets to your repository for enhanced logging:
- `ACTIONS_STEP_DEBUG`: Set to `true` for step debug logs
- `ACTIONS_RUNNER_DEBUG`: Set to `true` for runner debug logs

### Common Issues

1. **Workflow not triggering**: Check event configuration and branch filters
2. **Permission errors**: Verify workflow permissions and secrets
3. **Timeout issues**: Set appropriate timeout values
4. **Dependency conflicts**: Use proper caching and clean environments

## Summary

Understanding these building blocks enables you to:
- Create robust and maintainable workflows
- Optimize workflow performance
- Implement proper security practices
- Troubleshoot common issues
- Scale your automation effectively

The key is to start simple and gradually add complexity as your automation needs grow.