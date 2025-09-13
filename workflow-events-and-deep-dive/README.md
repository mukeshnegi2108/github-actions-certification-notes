# GitHub Actions - Workflow Events and Deep Dive

## Overview

Workflow events are the triggers that initiate GitHub Actions workflows. Understanding events deeply is crucial for creating responsive and efficient automation. This guide covers all event types, their configurations, and advanced patterns.

## Event Categories

### 1. Repository Events

Events that occur within your repository:

#### Push Events
Triggered when commits are pushed to the repository.

```yaml
on:
  push:
    branches: 
      - main
      - 'feature/*'
    paths:
      - 'src/**'
      - '!src/tests/**'
    tags:
      - 'v*'
```

**Activity types**: None (push is the activity)

**Common patterns**:
```yaml
# Only on main branch
on:
  push:
    branches: [ main ]

# Exclude certain paths
on:
  push:
    paths-ignore:
      - 'docs/**'
      - '**.md'

# Only for tags
on:
  push:
    tags: [ 'v*' ]
```

#### Pull Request Events
Triggered by pull request activities.

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [ main, develop ]
    paths:
      - 'src/**'
```

**Activity types**:
- `opened` - Pull request was opened
- `synchronize` - Pull request was updated with new commits
- `reopened` - Pull request was reopened
- `closed` - Pull request was closed
- `assigned`, `unassigned` - Assignee changes
- `labeled`, `unlabeled` - Label changes
- `review_requested`, `review_request_removed` - Review request changes

**Pull request target event**:
```yaml
on:
  pull_request_target:
    types: [opened, synchronize]
```
⚠️ **Security Note**: `pull_request_target` runs with the target branch's permissions and should be used carefully.

#### Issues Events
Triggered by issue activities.

```yaml
on:
  issues:
    types: [opened, edited, closed, reopened, labeled]
```

**Activity types**:
- `opened`, `edited`, `deleted`
- `closed`, `reopened`
- `assigned`, `unassigned`
- `labeled`, `unlabeled`
- `locked`, `unlocked`
- `transferred`, `pinned`, `unpinned`

#### Release Events
Triggered by release activities.

```yaml
on:
  release:
    types: [published, created, edited, deleted]
```

### 2. Scheduled Events

Run workflows on a schedule using cron syntax.

```yaml
on:
  schedule:
    # Run at 2:30 AM UTC every day
    - cron: '30 2 * * *'
    # Run every Monday at 8:00 AM UTC
    - cron: '0 8 * * 1'
    # Run every 15 minutes
    - cron: '*/15 * * * *'
```

**Cron syntax**: `minute hour day month day-of-week`
- `*` - Any value
- `,` - Value list separator
- `-` - Range of values
- `/` - Step values

**Examples**:
```yaml
on:
  schedule:
    # Daily at midnight
    - cron: '0 0 * * *'
    # Weekly on Sunday
    - cron: '0 0 * * 0'
    # Monthly on the 1st
    - cron: '0 0 1 * *'
    # Weekdays at 9 AM
    - cron: '0 9 * * 1-5'
```

### 3. Manual Events

#### Workflow Dispatch
Manually trigger workflows with optional inputs.

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
      version:
        description: 'Version to deploy'
        required: false
        type: string
      debug:
        description: 'Enable debug mode'
        required: false
        type: boolean
        default: false
```

**Input types**:
- `string` - Text input
- `boolean` - Checkbox
- `choice` - Dropdown menu
- `environment` - Environment selector

**Using inputs in workflow**:
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to environment
        run: |
          echo "Deploying version ${{ inputs.version }} to ${{ inputs.environment }}"
          echo "Debug mode: ${{ inputs.debug }}"
```

#### Repository Dispatch
Trigger workflows via GitHub API from external systems.

```yaml
on:
  repository_dispatch:
    types: [deploy, test, custom-event]
```

**Triggering via API**:
```bash
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/owner/repo/dispatches \
  -d '{"event_type":"deploy","client_payload":{"environment":"production"}}'
```

**Accessing payload**:
```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Use client payload
        run: echo "Environment: ${{ github.event.client_payload.environment }}"
```

### 4. Workflow Events

#### Workflow Call
Create reusable workflows that can be called by other workflows.

**Reusable workflow** (`.github/workflows/reusable.yml`):
```yaml
on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
      version:
        required: false
        type: string
        default: 'latest'
    secrets:
      token:
        required: true
    outputs:
      deployment-id:
        description: "Deployment ID"
        value: ${{ jobs.deploy.outputs.deployment-id }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    outputs:
      deployment-id: ${{ steps.deploy.outputs.id }}
    steps:
      - name: Deploy
        id: deploy
        run: echo "id=123" >> $GITHUB_OUTPUT
```

**Calling workflow**:
```yaml
jobs:
  call-reusable:
    uses: ./.github/workflows/reusable.yml
    with:
      environment: production
      version: v1.0.0
    secrets:
      token: ${{ secrets.DEPLOY_TOKEN }}
```

#### Workflow Run
Triggered when another workflow runs.

```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]
```

### 5. External Events

#### Webhook Events
Various webhook events from GitHub:

```yaml
on:
  # Branch or tag creation
  create:
  
  # Branch or tag deletion
  delete:
  
  # Repository forked
  fork:
  
  # Wiki page updated
  gollum:
  
  # Issue comment
  issue_comment:
    types: [created, edited, deleted]
  
  # Pull request review
  pull_request_review:
    types: [submitted, edited, dismissed]
  
  # Pull request review comment
  pull_request_review_comment:
    types: [created, edited, deleted]
  
  # Repository starred
  watch:
    types: [started]
```

## Event Filtering

### Branch and Tag Filters

```yaml
on:
  push:
    branches:
      - main
      - 'releases/**'
      - '!releases/old/**'
    tags:
      - 'v*'
      - '!v*-beta'
```

**Filter patterns**:
- `*` - Matches any character except `/`
- `**` - Matches any character including `/`
- `!` - Negates the pattern (excludes)

### Path Filters

```yaml
on:
  push:
    paths:
      - 'src/**'
      - 'tests/**'
      - 'package.json'
    paths-ignore:
      - 'docs/**'
      - '**.md'
      - '.gitignore'
```

**Path filter examples**:
```yaml
# Only trigger when source code changes
paths: ['src/**', 'tests/**']

# Ignore documentation changes
paths-ignore: ['docs/**', '*.md', '*.txt']

# Multiple conditions
paths: 
  - 'src/**'
  - '!src/legacy/**'
```

## Event Contexts and Data

### GitHub Context

Access event data through the `github` context:

```yaml
steps:
  - name: Event information
    run: |
      echo "Event: ${{ github.event_name }}"
      echo "Actor: ${{ github.actor }}"
      echo "Repository: ${{ github.repository }}"
      echo "Ref: ${{ github.ref }}"
      echo "SHA: ${{ github.sha }}"
```

### Event-Specific Data

#### Push Event Data
```yaml
steps:
  - name: Push event data
    run: |
      echo "Head commit: ${{ github.event.head_commit.id }}"
      echo "Commit message: ${{ github.event.head_commit.message }}"
      echo "Author: ${{ github.event.head_commit.author.name }}"
      echo "Modified files: ${{ github.event.head_commit.modified }}"
```

#### Pull Request Event Data
```yaml
steps:
  - name: PR event data
    run: |
      echo "PR number: ${{ github.event.number }}"
      echo "PR title: ${{ github.event.pull_request.title }}"
      echo "Base branch: ${{ github.event.pull_request.base.ref }}"
      echo "Head branch: ${{ github.event.pull_request.head.ref }}"
      echo "Author: ${{ github.event.pull_request.user.login }}"
```

#### Issue Event Data
```yaml
steps:
  - name: Issue event data
    run: |
      echo "Issue number: ${{ github.event.issue.number }}"
      echo "Issue title: ${{ github.event.issue.title }}"
      echo "Issue state: ${{ github.event.issue.state }}"
      echo "Author: ${{ github.event.issue.user.login }}"
```

## Advanced Event Patterns

### 1. Conditional Workflows

```yaml
name: Conditional Workflow
on: [push, pull_request]

jobs:
  deploy:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploying to production"

  test:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Run tests
        run: echo "Running tests"
```

### 2. Multi-Event Workflows

```yaml
name: Multi-Event Workflow
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Determine trigger
        run: |
          case "${{ github.event_name }}" in
            "push")
              echo "Triggered by push to main"
              ;;
            "pull_request")
              echo "Triggered by pull request"
              ;;
            "schedule")
              echo "Triggered by schedule"
              ;;
            "workflow_dispatch")
              echo "Triggered manually"
              ;;
          esac
```

### 3. Event-Based Job Matrix

```yaml
name: Event-Based Matrix
on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        include:
          - event: push
            os: ubuntu-latest
            node: '18'
          - event: pull_request
            os: [ubuntu-latest, windows-latest]
            node: ['16', '18', '20']
    runs-on: ${{ matrix.os }}
    if: github.event_name == matrix.event
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
```

## Event Security Considerations

### 1. Pull Request Security

```yaml
# Safe for external contributors
on:
  pull_request:
    types: [opened, synchronize]

# Use with caution - has write permissions
on:
  pull_request_target:
    types: [opened, synchronize]
```

### 2. Limiting Event Scope

```yaml
# Limit to specific branches
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

# Limit to specific paths
on:
  push:
    paths: ['src/**']
```

### 3. Input Validation

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        type: choice
        options: [staging, production]  # Restrict to known values

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Validate input
        run: |
          if [[ "${{ inputs.environment }}" != "staging" && "${{ inputs.environment }}" != "production" ]]; then
            echo "Invalid environment"
            exit 1
          fi
```

## Best Practices

### 1. Event Selection
- Use specific events rather than broad triggers
- Combine multiple events only when necessary
- Use path filters to reduce unnecessary runs

### 2. Performance
- Use `paths` and `paths-ignore` to avoid unnecessary workflow runs
- Leverage branch filters to limit scope
- Consider caching strategies for frequent events

### 3. Security
- Be cautious with `pull_request_target`
- Validate inputs in `workflow_dispatch`
- Use minimal permissions for external events

### 4. Debugging
- Use event context data for conditional logic
- Log event information for troubleshooting
- Test events thoroughly in development

## Common Event Combinations

### 1. CI/CD Pipeline
```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### 2. Release Automation
```yaml
on:
  release:
    types: [published]
  push:
    tags: ['v*']
```

### 3. Scheduled Maintenance
```yaml
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly
  workflow_dispatch:     # Manual override
```

### 4. Issue Management
```yaml
on:
  issues:
    types: [opened, labeled]
  issue_comment:
    types: [created]
```

Understanding these event patterns and configurations enables you to create sophisticated, responsive, and secure automation workflows that react appropriately to different repository activities and external triggers.