# Security and Permissions in GitHub Actions

This document provides a comprehensive guide to security and permissions in GitHub Actions, including best practices, configuration examples, and advanced concepts essential for certification.

---

## Table of Contents

1. [Overview](#overview)
2. [Understanding GitHub Actions Security Model](#understanding-github-actions-security-model)
3. [Best Practices for Security](#best-practices-for-security)
    - [Use Secrets](#use-secrets)
    - [Limit Permissions](#limit-permissions)
    - [Review Third-Party Actions](#review-third-party-actions)
    - [Use Environment Protection Rules](#use-environment-protection-rules)
    - [Audit Logs](#audit-logs)
    - [Branch Protection Rules](#branch-protection-rules)
    - [Limit Workflow Triggers](#limit-workflow-triggers)
4. [Managing Access](#managing-access)
    - [Collaborator Permissions](#collaborator-permissions)
    - [Organization Policies](#organization-policies)
5. [Common Security Pitfalls](#common-security-pitfalls)
6. [References](#references)
7. [Conclusion](#conclusion)

---

## Overview

GitHub Actions enables automation of software workflows directly in your repository. However, automation introduces risks if not properly secured. Understanding the security model and applying best practices is critical to protect your code, secrets, and infrastructure.

---

## Understanding GitHub Actions Security Model

- **Workflow Execution Context:** Workflows run in GitHub-hosted or self-hosted runners. Each runner executes jobs in a fresh environment, but secrets and tokens are injected at runtime.
- **Token Scopes:** The `GITHUB_TOKEN` is automatically created by GitHub for each workflow run, with permissions defined by the workflow or repository settings.
- **Event Triggers:** Workflows can be triggered by various events (push, pull_request, schedule, etc.), each with different security implications.

---

## Best Practices for Security

### Use Secrets

- **Store Sensitive Data:** Use [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets) for API keys, tokens, passwords, etc.
- **Access in Workflows:** Secrets are available as environment variables. Example:
    ```yaml
    jobs:
      build:
        runs-on: ubuntu-latest
        steps:
          - name: Use secret
            run: echo ${{ secrets.MY_SECRET }}
    ```
- **Secret Scoping:** Secrets can be defined at repository, environment, or organization level. Use environment secrets for deployment credentials.

- **Never Print Secrets:** Avoid echoing secrets in logs. Use `***` masking or avoid printing them altogether.

### Limit Permissions

- **Principle of Least Privilege:** Use the `permissions` key to restrict the `GITHUB_TOKEN` to only what is needed.
    ```yaml
    permissions:
      contents: read
      issues: write
    ```
- **Job-level Permissions:** You can further restrict permissions at the job level.
- **Default Permissions:** Set default permissions for all workflows in repository settings.

### Review Third-Party Actions

- **Source Verification:** Use actions from trusted sources (prefer `actions/` or verified creators).
- **Pin Actions by Commit SHA:** Avoid using `@main` or `@master`. Pin to a specific commit:
    ```yaml
    uses: actions/checkout@v4
    # or
    uses: some/action@c0ffee1234567890abcdef
    ```
- **Audit Code:** Review the code of third-party actions, especially if they handle secrets or sensitive data.

### Use Environment Protection Rules

- **Environments:** Define environments for production, staging, etc.
- **Protection Rules:** Require reviewers or wait timers before deployment.
    - Example: Require approval before deploying to production.
- **Environment Secrets:** Store deployment credentials in environment-specific secrets.

### Audit Logs

- **Monitoring:** Regularly review [audit logs](https://docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs) for workflow runs, secret access, and permission changes.
- **Alerting:** Set up notifications for suspicious activities.

### Branch Protection Rules

- **Prevent Direct Pushes:** Require pull requests for protected branches.
- **Require Status Checks:** Ensure workflows pass before merging.
- **Require Reviews:** Enforce code review before merging.

### Limit Workflow Triggers

- **Restrict Events:** Only enable necessary triggers. For example, avoid running workflows on all `pull_request` events if not needed.
- **Workflow Dispatch:** Use `workflow_dispatch` for manual triggers.
- **Path Filters:** Use `paths` to limit workflow runs to specific files or directories.

---

## Managing Access

### Collaborator Permissions

- **Role Assignment:** Assign roles (Read, Triage, Write, Maintain, Admin) based on responsibilities.
- **Least Privilege:** Only grant the minimum required access.
- **External Collaborators:** Regularly review and remove unnecessary external collaborators.

### Organization Policies

- **Enforce SSO:** Require single sign-on for organization members.
- **Secret Scanning:** Enable secret scanning and push protection.
- **Required Reviews:** Enforce required reviewers for sensitive workflows.
- **Repository Rulesets:** Use rulesets to enforce security policies across multiple repositories.

---

## Common Security Pitfalls

- **Hardcoding Secrets:** Never hardcode secrets in workflow files or code.
- **Overly Broad Permissions:** Avoid giving `GITHUB_TOKEN` unnecessary write or admin permissions.
- **Untrusted Actions:** Using unreviewed third-party actions can introduce vulnerabilities.
- **Unrestricted Workflow Triggers:** Allowing workflows to run on all events can be exploited.

---

## References

- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [GitHub Actions: Permissions for the GITHUB_TOKEN](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)
- [GitHub Actions: Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub Actions: Environment Protection Rules](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [GitHub Actions: Audit Logs](https://docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs)
- [GitHub Actions: Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)

---

## Conclusion

Securing GitHub Actions workflows is a shared responsibility. By following these best practices, understanding the security model, and leveraging GitHub’s built-in features, you can significantly reduce risks and protect your code and infrastructure. Stay updated with GitHub’s security advisories and continuously review your workflows for potential vulnerabilities.