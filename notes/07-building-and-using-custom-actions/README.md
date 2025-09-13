# Building and Using Custom Actions in GitHub Actions

GitHub Actions enables you to automate workflows for your software projects. Custom actions are a powerful feature that lets you encapsulate logic, reuse code, and share automation steps across repositories and teams. This guide provides a comprehensive overview of building, testing, publishing, and using custom actions.

---

## Table of Contents

1. [What are Custom Actions?](#what-are-custom-actions)
2. [Types of Custom Actions](#types-of-custom-actions)
3. [When to Use a Custom Action](#when-to-use-a-custom-action)
4. [Creating a Custom Action](#creating-a-custom-action)
    - [Step 1: Define the Action Metadata](#step-1-define-the-action-metadata)
    - [Step 2: Implement the Action Logic](#step-2-implement-the-action-logic)
    - [Step 3: Build and Package the Action](#step-3-build-and-package-the-action)
    - [Step 4: Test the Action](#step-4-test-the-action)
    - [Step 5: Publish the Action](#step-5-publish-the-action)
5. [Using Custom Actions in Workflows](#using-custom-actions-in-workflows)
6. [Best Practices](#best-practices)
7. [Troubleshooting and Debugging](#troubleshooting-and-debugging)
8. [References](#references)

---

## What are Custom Actions?

**Custom actions** are reusable, shareable units of automation logic for GitHub Actions workflows. They allow you to:

- Encapsulate complex or repetitive tasks.
- Share logic across multiple workflows or repositories.
- Standardize automation within your organization.

Custom actions can be published publicly (on the [GitHub Marketplace](https://github.com/marketplace?type=actions)) or kept private within your organization.

---

## Types of Custom Actions

There are three main types of custom actions:

1. **JavaScript Actions**  
   - Run directly on the runner using Node.js.
   - Fast, portable, and easy to debug.
   - Good for most automation tasks.

2. **Docker Actions**  
   - Run in a Docker container.
   - Useful for custom environments or dependencies.
   - Can run any language or tool that works in Docker.

3. **Composite Actions**  
   - Combine multiple steps and actions into one.
   - Written in YAML.
   - Useful for grouping and reusing workflow logic.

---

## When to Use a Custom Action

Consider creating a custom action when:

- You need to reuse logic across multiple workflows or repositories.
- You want to share automation with the community or your team.
- You need to encapsulate complex logic or dependencies.
- You want to simplify workflow YAML files.

---

## Creating a Custom Action

### Step 1: Define the Action Metadata

Every action requires an `action.yml` (or `action.yaml`) file that describes the action’s metadata, inputs, outputs, and execution environment.

**Example `action.yml` for a JavaScript action:**

```yaml
name: 'Greet User'
description: 'Greets the user with a customizable message'
author: 'Your Name <your@email.com>'
inputs:
  username:
    description: 'Name of the user to greet'
    required: true
  greeting:
    description: 'Greeting message'
    required: false
    default: 'Hello'
outputs:
  time:
    description: 'The time the greeting was generated'
runs:
  using: 'node20'
  main: 'dist/index.js'
branding:
  icon: 'smile'
  color: 'blue'
```

**Key fields:**
- `name`, `description`, `author`: Human-readable metadata.
- `inputs`: Parameters your action accepts.
- `outputs`: Values your action returns.
- `runs`: How the action is executed.
- `branding`: (Optional) For Marketplace appearance.

---

### Step 2: Implement the Action Logic

#### JavaScript Action Example

Create your logic in `index.js` (or `src/index.js` if using a build step):

```javascript
// filepath: dist/index.js
const core = require('@actions/core');

async function run() {
  try {
    const username = core.getInput('username');
    const greeting = core.getInput('greeting');
    const message = `${greeting}, ${username}!`;
    console.log(message);

    const now = new Date().toISOString();
    core.setOutput('time', now);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

**Notes:**
- Use `@actions/core` for inputs, outputs, and error handling.
- Always handle errors gracefully.

#### Docker Action Example

Create a `Dockerfile` and entrypoint script:

```Dockerfile
# filepath: Dockerfile
FROM node:20
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

```bash
# filepath: entrypoint.sh
#!/bin/sh
echo "Hello from Docker action!"
```

#### Composite Action Example

```yaml
# filepath: action.yml
name: 'Composite Example'
description: 'Runs multiple shell commands'
runs:
  using: 'composite'
  steps:
    - run: echo "Step 1"
    - run: echo "Step 2"
```

---

### Step 3: Build and Package the Action

- For JavaScript actions, transpile TypeScript (if used) and bundle dependencies.
- Use [`@vercel/ncc`](https://github.com/vercel/ncc) to bundle Node.js actions:
  ```sh
  npx @vercel/ncc build src/index.js -o dist
  ```
- Ensure `node_modules` is not committed (except for bundled actions).

---

### Step 4: Test the Action

- Test locally using [act](https://github.com/nektos/act) or by creating a test workflow in a repository.
- Validate `action.yml` using [action-validator](https://github.com/rhysd/actionlint).

---

### Step 5: Publish the Action

- Commit and push your action to GitHub.
- Tag a release (e.g., `v1.0.0`) for versioning.
- Optionally, publish to the [GitHub Marketplace](https://github.com/marketplace?type=actions).

---

## Using Custom Actions in Workflows

Reference your action in a workflow YAML file:

```yaml
name: Example Workflow

on: [push]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Greet User
        uses: your-username/your-action-repo@v1
        with:
          username: 'Alice'
          greeting: 'Welcome'
```

**Local actions:**  
Use a relative path if the action is in the same repository:

```yaml
uses: ./path/to/action
```

---

## Best Practices

- **Version your actions:** Use tags (e.g., `v1`) instead of `main` for stability.
- **Write clear documentation:** Include usage examples and input/output descriptions.
- **Handle errors gracefully:** Use `core.setFailed()` for actionable error messages.
- **Keep actions small and focused:** Single responsibility principle.
- **Test thoroughly:** Use both local and CI-based tests.
- **Pin dependencies:** Avoid breaking changes from upstream packages.

---

## Troubleshooting and Debugging

- Use `core.debug()` and `core.info()` for logging.
- Enable [step debug logging](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging) by setting `ACTIONS_STEP_DEBUG` to `true` in repository secrets.
- Check the Actions tab for logs and error messages.
- Validate your `action.yml` for syntax errors.

---

## References

- [GitHub Actions: Creating actions](https://docs.github.com/en/actions/creating-actions)
- [GitHub Actions Metadata syntax](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions)
- [GitHub Marketplace](https://github.com/marketplace?type=actions)
- [@actions/toolkit](https://github.com/actions/toolkit)
- [nektos/act](https://github.com/nektos/act) (local runner for testing)

---

By mastering custom actions, you can create powerful, reusable automation that enhances your CI/CD pipelines and demonstrates advanced GitHub Actions usage. Happy automating!