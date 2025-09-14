# Workflow Events and Deep Dive

This document provides a comprehensive exploration of workflow events in GitHub Actions. Understanding these events is fundamental for designing robust, efficient, and secure automation pipelines.

---

## What are Workflow Events?

**Workflow events** are specific activities or occurrences within a GitHub repository that trigger the execution of a workflow. These events can originate from user actions (like pushing code), repository activities (such as opening issues), or external systems (like scheduled times or API calls).

### Why are Workflow Events Important?

- **Automation**: They enable automation of CI/CD, testing, deployments, and more.
- **Granularity**: Allow workflows to respond to precise repository changes or actions.
- **Security**: Proper event configuration helps prevent unauthorized or unintended workflow runs.

---

## Types of Workflow Events

GitHub Actions supports a wide range of events. Here are the most important categories and examples:

### 1. **GitHub Platform Events**

These are triggered by activities within the repository:

- **push**: Fires when commits are pushed to a branch or tag.
  - Can be filtered by branch, tag, or path.
- **pull_request**: Fires on PR actions (opened, synchronized, reopened, closed, etc.).
  - Supports filtering by PR type and target branch.
- **issues**: Fires on issue actions (opened, edited, closed, etc.).
- **release**: Fires when a release is published, created, or edited.
- **fork**: Fires when someone forks the repository.
- **delete**: Fires when a branch or tag is deleted.

### 2. **Scheduled Events**

- **schedule**: Uses cron syntax to run workflows at defined intervals (e.g., nightly builds, weekly reports).

### 3. **Manual Events**

- **workflow_dispatch**: Allows users to manually trigger workflows from the GitHub UI or API.
  - Supports custom input parameters for dynamic workflows.

### 4. **External Events**

- **repository_dispatch**: Enables external systems to trigger workflows via the GitHub API.
  - Useful for integrating with other CI/CD tools or external services.

### 5. **Other Notable Events**

- **workflow_call**: Allows one workflow to be called by another, enabling reusable workflow components.
- **workflow_run**: Triggers when another workflow run is completed.
- **check_run** and **check_suite**: Related to GitHub Checks API, useful for advanced integrations.

---

## Event Payloads

Each event provides a **payload**—a JSON object containing detailed information about the event (e.g., commit SHA, PR number, user info). This payload is accessible in workflows via the `github` context and as a file at `$GITHUB_EVENT_PATH`.

**Example:** Accessing event data in a workflow step:
```yaml
- name: Print event name
  run: echo "Event: ${{ github.event_name }}"
```

---

## Configuring Workflow Events

You configure events in the `on:` key of your workflow YAML file. Events can be specified as a single event, a list, or with detailed filters.

### Basic Example: Trigger on Push to Main

```yaml
on:
  push:
    branches:
      - main
```

### Multiple Events

```yaml
on: [push, pull_request]
```

### Advanced Filtering

- **Branches/Tags**: Limit to specific branches or tags.
- **Paths**: Trigger only if certain files change.
- **Types**: For events like `pull_request`, specify actions (e.g., `opened`, `closed`).

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
    paths:
      - 'src/**'
```

#### Activity Types

Many events support **activity types** (also called "actions" or "event types") that specify which specific activity within the event should trigger the workflow. For example:

- **pull_request**:  
  - `opened`: A pull request is created.
  - `synchronize`: Commits are pushed to an existing pull request.
  - `reopened`: A closed pull request is reopened.
  - `closed`: A pull request is closed (merged or declined).
  - `labeled`, `unlabeled`, `assigned`, `unassigned`, etc.

- **issues**:  
  - `opened`: An issue is created.
  - `edited`: An issue is edited.
  - `closed`: An issue is closed.
  - `reopened`, `labeled`, `unlabeled`, etc.

- **release**:  
  - `published`: A release is published.
  - `created`: A release is created as a draft.
  - `edited`: A release is edited.
  - `prereleased`, `unpublished`, etc.

You can filter workflows to run only on specific activity types using the `types` keyword:

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

This ensures your workflow only runs for the specified activities, making your automation more efficient and targeted.

---

### Scheduled Events

```yaml
on:
  schedule:
    - cron: '0 0 * * 0' # Every Sunday at midnight UTC
```

### Manual Trigger with Inputs

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
```

---

## Security Considerations

- **Untrusted Events**: Events like `pull_request` from forks can introduce untrusted code. Use `pull_request_target` for workflows that need access to secrets, but be cautious.
- **Secrets Exposure**: Secrets are not available to workflows triggered by certain events from forks.
- **Least Privilege**: Only enable events necessary for your workflow to minimize risk.

---

## Best Practices

- **Use Filters**: Always filter events by branch, path, or type to avoid unnecessary workflow runs.
- **Leverage Manual Triggers**: Use `workflow_dispatch` for workflows that should not run automatically.
- **Monitor Event Payloads**: Use the `github` context to access event data and make workflows dynamic.
- **Reuse Workflows**: Use `workflow_call` to create modular, reusable workflow components.

---

## Conclusion

Mastering workflow events is essential for building efficient, secure, and maintainable automation with GitHub Actions. By understanding the full range of events and how to configure them, you can tailor your workflows to respond precisely to your project's needs.
