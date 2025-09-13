# GitHub Actions - Security and Permissions

## Overview

Security is paramount in CI/CD workflows. This comprehensive guide covers GitHub Actions security concepts, permission models, secret management, vulnerability prevention, and best practices for creating secure automation workflows.

## Permission Models

### 1. Workflow Permissions

GitHub Actions workflows have different permission levels that control what they can access:

#### Default Permissions
```yaml
name: Default Permissions Example
on: [push]

# Default permissions (can be restricted in repository settings)
permissions:
  contents: read
  metadata: read

jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: List files
        run: ls -la
```

#### Explicit Permission Control
```yaml
name: Explicit Permissions
on: [push]

# Minimal permissions
permissions:
  contents: read      # Read repository contents
  actions: read       # Read workflow run data
  checks: write       # Write check runs
  issues: write       # Create/update issues
  pull-requests: write # Create/update PRs

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy with specific permissions
        run: echo "Deploying with controlled permissions"
```

#### Job-Level Permissions
```yaml
name: Job-Level Permissions
on: [push]

jobs:
  read-only-job:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      metadata: read
    steps:
      - uses: actions/checkout@v4
      - name: Read-only operations
        run: echo "Can only read"

  write-job:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - name: Operations requiring write access
        run: echo "Can write to repository"
```

### 2. GITHUB_TOKEN Permissions

The `GITHUB_TOKEN` is automatically provided to workflows with specific permissions:

#### Available Permission Scopes
```yaml
permissions:
  actions: read|write        # Workflow runs and artifacts
  checks: read|write         # Check runs and suites
  contents: read|write       # Repository contents
  deployments: read|write    # Deployments
  id-token: write           # OIDC token generation
  issues: read|write         # Issues
  discussions: read|write    # Discussions
  packages: read|write       # Packages
  pages: read|write          # GitHub Pages
  pull-requests: read|write  # Pull requests
  repository-projects: read|write  # Repository projects
  security-events: read|write     # Security events
  statuses: read|write       # Commit statuses
  metadata: read            # Repository metadata (always available)
```

#### Minimal Permission Example
```yaml
name: Minimal Permissions
on: [push]

permissions:
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Lint code
        run: npm run lint
```

#### Write Permissions Example
```yaml
name: Write Permissions
on: [push]

permissions:
  contents: write
  pull-requests: write
  issues: write

jobs:
  auto-update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Update dependencies
        run: npm update
      
      - name: Create pull request
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: 'chore: update dependencies'
          title: 'Automated dependency update'
```

## Secret Management

### 1. Repository Secrets

Repository secrets are encrypted and only accessible to workflows in that repository:

```yaml
name: Using Repository Secrets
on: [push]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to production
        env:
          DATABASE_PASSWORD: ${{ secrets.DB_PASSWORD }}
          API_KEY: ${{ secrets.API_KEY }}
          SSH_PRIVATE_KEY: ${{ secrets.SSH_KEY }}
        run: |
          # Secrets are automatically masked in logs
          echo "Deploying with API key: [MASKED]"
          deploy-script.sh
```

### 2. Environment Secrets

Environment secrets are associated with specific environments and can have protection rules:

```yaml
name: Environment Deployment
on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        env:
          STAGING_API_KEY: ${{ secrets.STAGING_API_KEY }}
          STAGING_DB_URL: ${{ secrets.STAGING_DB_URL }}
        run: deploy-to-staging.sh

  deploy-production:
    runs-on: ubuntu-latest
    environment: 
      name: production
      url: https://myapp.com
    steps:
      - name: Deploy to production
        env:
          PROD_API_KEY: ${{ secrets.PROD_API_KEY }}
          PROD_DB_URL: ${{ secrets.PROD_DB_URL }}
        run: deploy-to-production.sh
```

### 3. Organization Secrets

Organization secrets are available to all repositories in the organization:

```yaml
name: Organization Secrets
on: [push]

jobs:
  shared-deployment:
    runs-on: ubuntu-latest
    steps:
      - name: Use organization-wide secrets
        env:
          ORG_DOCKER_REGISTRY: ${{ secrets.ORG_DOCKER_REGISTRY }}
          ORG_DEPLOYMENT_KEY: ${{ secrets.ORG_DEPLOYMENT_KEY }}
        run: |
          echo "Using organization Docker registry"
          docker login $ORG_DOCKER_REGISTRY
```

### 4. Secret Rotation and Management

```yaml
name: Secret Rotation Example
on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM

jobs:
  rotate-secrets:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      actions: write
    steps:
      - name: Rotate API keys
        env:
          CURRENT_API_KEY: ${{ secrets.API_KEY }}
          KEY_ROTATION_SERVICE: ${{ secrets.KEY_ROTATION_SERVICE }}
        run: |
          # Generate new API key
          new_key=$(curl -X POST "$KEY_ROTATION_SERVICE/rotate" \
            -H "Authorization: Bearer $CURRENT_API_KEY")
          
          # Update secret (requires external tool or API)
          update-github-secret.sh "API_KEY" "$new_key"
```

## OIDC and External Authentication

### 1. OpenID Connect (OIDC) Integration

OIDC allows workflows to authenticate with cloud providers without storing long-lived credentials:

```yaml
name: OIDC AWS Deployment
on: [push]

permissions:
  id-token: write
  contents: read

jobs:
  deploy-aws:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          role-session-name: GitHubActions
          aws-region: us-east-1
      
      - name: Deploy to AWS
        run: |
          aws s3 sync ./dist s3://my-bucket/
          aws cloudformation deploy --template-file template.yml
```

### 2. Azure OIDC Integration

```yaml
name: OIDC Azure Deployment
on: [push]

permissions:
  id-token: write
  contents: read

jobs:
  deploy-azure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      
      - name: Deploy to Azure
        run: |
          az webapp deployment source config-zip \
            --resource-group myResourceGroup \
            --name myapp \
            --src deployment.zip
```

### 3. Google Cloud OIDC Integration

```yaml
name: OIDC GCP Deployment
on: [push]

permissions:
  id-token: write
  contents: read

jobs:
  deploy-gcp:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          workload_identity_provider: 'projects/123456789/locations/global/workloadIdentityPools/my-pool/providers/my-provider'
          service_account: 'my-service-account@my-project.iam.gserviceaccount.com'
      
      - name: Deploy to GCP
        run: |
          gcloud app deploy app.yaml
```

## Security Hardening

### 1. Runner Security

#### Self-Hosted Runner Security
```yaml
name: Self-Hosted Runner Security
on: [push]

jobs:
  secure-job:
    runs-on: [self-hosted, linux, secure]
    steps:
      - name: Verify runner environment
        run: |
          # Check for required security tools
          command -v docker >/dev/null 2>&1 || { echo "Docker not found"; exit 1; }
          command -v clamav >/dev/null 2>&1 || { echo "ClamAV not found"; exit 1; }
          
          # Verify runner is up to date
          runner-update-check.sh
      
      - uses: actions/checkout@v4
      
      - name: Scan for malware
        run: |
          clamscan -r . --exclude-dir=.git
```

#### GitHub-Hosted Runner Hardening
```yaml
name: Hardened GitHub Runner
on: [push]

jobs:
  hardened-job:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Security scan of checkout
        run: |
          # Scan for suspicious files
          find . -name "*.sh" -exec grep -l "curl.*|.*sh" {} \;
          find . -name "*.py" -exec grep -l "eval\|exec\|__import__" {} \;
      
      - name: Verify checksums
        run: |
          # Verify important files haven't been tampered with
          if [ -f checksums.txt ]; then
            sha256sum -c checksums.txt
          fi
```

### 2. Dependency Security

#### Dependency Scanning
```yaml
name: Dependency Security
on: [push, pull_request]

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Upload Snyk results to GitHub
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: snyk.sarif
```

#### Supply Chain Security
```yaml
name: Supply Chain Security
on: [push]

jobs:
  supply-chain-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Verify package integrity
        run: |
          # Check for package-lock.json
          if [ ! -f package-lock.json ]; then
            echo "package-lock.json missing - potential supply chain risk"
            exit 1
          fi
          
          # Verify npm packages
          npm ci --audit
          npm audit --audit-level moderate
      
      - name: Check for suspicious dependencies
        run: |
          # Look for packages with suspicious patterns
          suspicious_packages=$(npm list --depth=0 --json | jq -r '.dependencies | keys[]' | grep -E '(test|temp|tmp)')
          if [ -n "$suspicious_packages" ]; then
            echo "Suspicious packages found: $suspicious_packages"
            exit 1
          fi
```

### 3. Code Scanning and Analysis

#### CodeQL Security Analysis
```yaml
name: CodeQL Security Analysis
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write
    
    strategy:
      fail-fast: false
      matrix:
        language: ['javascript', 'python']
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: ${{ matrix.language }}
          queries: security-extended
      
      - name: Autobuild
        uses: github/codeql-action/autobuild@v2
      
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        with:
          category: "/language:${{matrix.language}}"
```

#### Custom Security Checks
```yaml
name: Custom Security Checks
on: [push, pull_request]

jobs:
  security-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Check for hardcoded secrets
        run: |
          # Look for potential secrets in code
          secrets_found=$(grep -r -E "(password|secret|key|token).*=.*([\"\'][^\"\']{8,}[\"\'])" . --exclude-dir=.git || true)
          if [ -n "$secrets_found" ]; then
            echo "Potential hardcoded secrets found:"
            echo "$secrets_found"
            exit 1
          fi
      
      - name: Check for dangerous functions
        run: |
          # Look for dangerous function calls
          dangerous_funcs=$(grep -r -E "(eval|exec|system|shell_exec)" . --include="*.py" --include="*.js" --exclude-dir=.git || true)
          if [ -n "$dangerous_funcs" ]; then
            echo "Dangerous functions found:"
            echo "$dangerous_funcs"
            exit 1
          fi
      
      - name: Check file permissions
        run: |
          # Check for executable files that shouldn't be
          executable_files=$(find . -type f -executable -not -path "./.git/*" -not -name "*.sh" -not -name "*.py" || true)
          if [ -n "$executable_files" ]; then
            echo "Unexpected executable files found:"
            echo "$executable_files"
            exit 1
          fi
```

## Secure Workflow Patterns

### 1. Pull Request Security

#### Safe Pull Request Handling
```yaml
name: Safe PR Handling
on:
  pull_request_target:  # Has write permissions but uses base branch code
    types: [opened, synchronize]

jobs:
  security-check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.base_ref }}  # Checkout base branch, not PR branch
      
      - name: Download PR diff
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Safely analyze PR changes without executing them
          curl -H "Authorization: token $GITHUB_TOKEN" \
               "${{ github.event.pull_request.diff_url }}" > pr.diff
      
      - name: Analyze PR changes
        run: |
          # Check for suspicious changes
          if grep -q "curl.*|.*sh" pr.diff; then
            echo "Suspicious shell command found in PR"
            exit 1
          fi
      
      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Security check passed'
            })
```

#### Trusted Contributor Workflow
```yaml
name: Trusted Contributor
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  check-contributor:
    runs-on: ubuntu-latest
    outputs:
      is-trusted: ${{ steps.check.outputs.trusted }}
    steps:
      - name: Check if contributor is trusted
        id: check
        run: |
          trusted_users=("user1" "user2" "organization-member")
          if [[ " ${trusted_users[@]} " =~ " ${{ github.event.pull_request.user.login }} " ]]; then
            echo "trusted=true" >> $GITHUB_OUTPUT
          else
            echo "trusted=false" >> $GITHUB_OUTPUT
          fi

  test-trusted:
    needs: check-contributor
    if: needs.check-contributor.outputs.is-trusted == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run full test suite
        run: npm test

  test-untrusted:
    needs: check-contributor
    if: needs.check-contributor.outputs.is-trusted == 'false'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run limited tests
        run: npm run test:safe
```

### 2. Deployment Security

#### Secure Deployment Pipeline
```yaml
name: Secure Deployment
on:
  push:
    branches: [main]

jobs:
  security-gate:
    runs-on: ubuntu-latest
    outputs:
      security-passed: ${{ steps.scan.outputs.passed }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Security scan
        id: scan
        run: |
          # Run comprehensive security scan
          security-scan.sh
          if [ $? -eq 0 ]; then
            echo "passed=true" >> $GITHUB_OUTPUT
          else
            echo "passed=false" >> $GITHUB_OUTPUT
          fi

  deploy:
    needs: security-gate
    if: needs.security-gate.outputs.security-passed == 'true'
    runs-on: ubuntu-latest
    environment: production
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Secure deployment
        env:
          DEPLOYMENT_TOKEN: ${{ secrets.DEPLOYMENT_TOKEN }}
        run: |
          # Verify deployment integrity
          verify-deployment-integrity.sh
          
          # Deploy with secure methods
          secure-deploy.sh
```

#### Multi-Environment Security
```yaml
name: Multi-Environment Security
on:
  push:
    branches: [main, develop]

jobs:
  determine-environment:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.env.outputs.environment }}
      security-level: ${{ steps.env.outputs.security-level }}
    steps:
      - name: Determine environment and security level
        id: env
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
            echo "security-level=high" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
            echo "security-level=medium" >> $GITHUB_OUTPUT
          fi

  security-scan:
    needs: determine-environment
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: High security scan
        if: needs.determine-environment.outputs.security-level == 'high'
        run: |
          # Comprehensive security scan for production
          run-comprehensive-security-scan.sh
      
      - name: Standard security scan
        if: needs.determine-environment.outputs.security-level == 'medium'
        run: |
          # Standard security scan for staging
          run-standard-security-scan.sh

  deploy:
    needs: [determine-environment, security-scan]
    runs-on: ubuntu-latest
    environment: ${{ needs.determine-environment.outputs.environment }}
    steps:
      - name: Deploy to environment
        run: |
          echo "Deploying to ${{ needs.determine-environment.outputs.environment }}"
          deploy-to-environment.sh ${{ needs.determine-environment.outputs.environment }}
```

## Monitoring and Auditing

### 1. Workflow Auditing

```yaml
name: Workflow Audit
on:
  workflow_run:
    workflows: ["*"]
    types: [completed]

jobs:
  audit:
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
    steps:
      - name: Audit workflow execution
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Log workflow execution details
          echo "Workflow: ${{ github.event.workflow_run.name }}"
          echo "Status: ${{ github.event.workflow_run.conclusion }}"
          echo "Actor: ${{ github.event.workflow_run.actor.login }}"
          echo "Repository: ${{ github.event.workflow_run.repository.full_name }}"
          
          # Send to audit log service
          curl -X POST "${{ secrets.AUDIT_ENDPOINT }}" \
            -H "Content-Type: application/json" \
            -d '{
              "workflow": "${{ github.event.workflow_run.name }}",
              "status": "${{ github.event.workflow_run.conclusion }}",
              "actor": "${{ github.event.workflow_run.actor.login }}",
              "repository": "${{ github.event.workflow_run.repository.full_name }}",
              "timestamp": "${{ github.event.workflow_run.updated_at }}"
            }'
```

### 2. Security Monitoring

```yaml
name: Security Monitoring
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  security-monitoring:
    runs-on: ubuntu-latest
    permissions:
      security-events: read
      actions: read
    steps:
      - name: Check for security alerts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Check for new security alerts
          alerts=$(gh api repos/${{ github.repository }}/security-advisories \
            --jq '.[] | select(.state == "published" and (.published_at | fromdateiso8601) > (now - 86400))')
          
          if [ -n "$alerts" ]; then
            echo "New security alerts found:"
            echo "$alerts"
            
            # Send notification
            curl -X POST "${{ secrets.SECURITY_WEBHOOK }}" \
              -H "Content-Type: application/json" \
              -d "{\"message\": \"New security alerts for ${{ github.repository }}\"}"
          fi
      
      - name: Check failed workflows with security implications
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Check for failed workflows that might indicate security issues
          failed_workflows=$(gh api repos/${{ github.repository }}/actions/runs \
            --jq '.workflow_runs[] | select(.conclusion == "failure" and .name | contains("security"))')
          
          if [ -n "$failed_workflows" ]; then
            echo "Failed security workflows detected"
            # Trigger security incident response
          fi
```

## Best Practices Summary

### 1. Principle of Least Privilege

```yaml
# Good: Minimal permissions
permissions:
  contents: read

# Bad: Excessive permissions
permissions: write-all
```

### 2. Secret Management

```yaml
# Good: Use secrets for sensitive data
env:
  API_KEY: ${{ secrets.API_KEY }}

# Bad: Hardcoded secrets
env:
  API_KEY: "abc123def456"
```

### 3. Input Validation

```yaml
# Good: Validate inputs
- name: Validate input
  run: |
    if [[ ! "${{ inputs.environment }}" =~ ^(staging|production)$ ]]; then
      echo "Invalid environment"
      exit 1
    fi

# Bad: Use inputs directly without validation
- name: Deploy
  run: deploy.sh ${{ inputs.environment }}
```

### 4. Secure Actions Usage

```yaml
# Good: Pin to specific versions
- uses: actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608  # v4.1.0

# Bad: Use latest or mutable tags
- uses: actions/checkout@main
```

### 5. Environment Isolation

```yaml
# Good: Use environment protection
environment:
  name: production
  url: https://myapp.com

# Bad: Deploy directly without environment controls
```

Understanding and implementing these security practices ensures that your GitHub Actions workflows are robust, secure, and follow industry best practices for CI/CD security.