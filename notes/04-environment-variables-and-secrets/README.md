# Environment Variables and Secrets in GitHub Actions

This section provides a comprehensive guide to using environment variables and secrets in GitHub Actions, including their scope, security considerations, best practices, and troubleshooting tips.

---

## 1. What Are Environment Variables?

Environment variables are dynamic key-value pairs available to processes running in your workflow. They are commonly used to configure jobs, pass data between steps, and manage settings without hardcoding values.

### Types of Environment Variables

- **Default Variables**: Provided by GitHub Actions (e.g., `GITHUB_WORKSPACE`, `GITHUB_REF`).
- **Custom Variables**: Defined by you at the workflow, job, or step level.
- **Secrets**: Special, encrypted environment variables for sensitive data.

---

## 2. Setting Environment Variables

### At the Workflow Level

All jobs and steps inherit these variables.

```yaml
env:
  GLOBAL_VAR: 'Available to all jobs and steps'
```

### At the Job Level

Only steps within the job can access these.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      JOB_VAR: 'Job-specific value'
```

### At the Step Level

Only the specific step can access these.

```yaml
steps:
  - name: Example Step
    env:
      STEP_VAR: 'Step-specific value'
    run: echo $STEP_VAR
```

### Setting Variables Dynamically

You can set environment variables dynamically using the `echo` command and the special `$GITHUB_ENV` file:

```yaml
- name: Set dynamic variable
  run: echo "DYNAMIC_VAR=dynamic_value" >> $GITHUB_ENV
```

---

## 3. Using Environment Variables

- **Bash/Unix Shell**: Use `$VAR_NAME`
- **PowerShell**: Use `$env:VAR_NAME`
- **Windows CMD**: Use `%VAR_NAME%`

Example:

```yaml
- name: Print variable
  run: echo $MY_VARIABLE
```

---

## 4. GitHub Actions Secrets

Secrets are encrypted environment variables used to store sensitive information such as API keys, tokens, and passwords.

### Defining Secrets

- Go to your repository on GitHub.
- Click **Settings** > **Secrets and variables** > **Actions**.
- Click **New repository secret** and add your key-value pair.

### Accessing Secrets

Secrets are accessed via the `secrets` context:

```yaml
run: echo ${{ secrets.MY_SECRET }}
```

**Note:** Secrets are not passed to workflows triggered by a pull request from a fork for security reasons.

---

## 5. Security Considerations

- **Never hardcode sensitive data** in workflow files.
- **Secrets are masked** in logs, but avoid printing them.
- **Limit secret scope**: Use repository, environment, or organization-level secrets as appropriate.
- **Review and rotate secrets** regularly.

---

## 6. Advanced Usage

### Masking Output

GitHub automatically masks secrets in logs, but you can mask additional values:

```yaml
- name: Mask value
  run: echo "::add-mask::my_value"
```

### Passing Data Between Steps

Use the `$GITHUB_ENV` file to persist environment variables between steps:

```yaml
- name: Set variable
  run: echo "RESULT=success" >> $GITHUB_ENV

- name: Use variable
  run: echo $RESULT
```

### Using Environment Files

- `$GITHUB_ENV`: Set environment variables.
- `$GITHUB_OUTPUT`: Set step outputs.
- `$GITHUB_PATH`: Add directories to the `PATH`.

---

## 7. Troubleshooting

- **Variable not available?** Check the scope (workflow, job, step).
- **Secret not working?** Ensure it’s defined in the correct repository/environment.
- **Printing secrets?** Avoid using `echo ${{ secrets.MY_SECRET }}` directly; use secrets only where needed.

---

## 8. Best Practices

- **Principle of Least Privilege**: Only give jobs access to the secrets they need.
- **Use Environments for Deployment**: Environments can have their own secrets and required reviewers.
- **Audit and Rotate**: Regularly audit who has access to secrets and rotate them periodically.
- **Avoid Logging Secrets**: Never print secrets to logs, even accidentally.

---

## 9. References

- [GitHub Actions: Environment variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables)
- [GitHub Actions: Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions: Security hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

---

By mastering environment variables and secrets, you ensure your workflows are both flexible and secure—an essential skill for GitHub Actions