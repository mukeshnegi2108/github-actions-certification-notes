# GitHub Actions - Building and Using Custom Actions

## Overview

Custom actions allow you to create reusable automation components that can be shared across workflows and repositories. This guide covers all types of custom actions, from simple composite actions to complex JavaScript and Docker-based actions, along with best practices for development, testing, and distribution.

## Types of Custom Actions

### 1. Composite Actions

Composite actions combine multiple steps into a single reusable action using shell scripts and existing actions.

#### Basic Composite Action

Create `.github/actions/setup-node-cache/action.yml`:

```yaml
name: 'Setup Node with Cache'
description: 'Setup Node.js with dependency caching'
inputs:
  node-version:
    description: 'Node.js version to use'
    required: true
    default: '18'
  working-directory:
    description: 'Working directory'
    required: false
    default: '.'
outputs:
  cache-hit:
    description: 'Whether cache was hit'
    value: ${{ steps.cache.outputs.cache-hit }}
runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
    
    - name: Cache dependencies
      id: cache
      uses: actions/cache@v3
      with:
        path: ~/.npm
        key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
        restore-keys: |
          ${{ runner.os }}-node-
    
    - name: Install dependencies
      if: steps.cache.outputs.cache-hit != 'true'
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: npm ci
```

**Using the composite action:**

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node with caching
        uses: ./.github/actions/setup-node-cache
        with:
          node-version: '18'
          working-directory: './frontend'
      
      - name: Run tests
        run: npm test
```

#### Advanced Composite Action

`.github/actions/deploy-to-environment/action.yml`:

```yaml
name: 'Deploy to Environment'
description: 'Deploy application to specified environment with validation'
inputs:
  environment:
    description: 'Target environment (staging/production)'
    required: true
  version:
    description: 'Version to deploy'
    required: true
  api-key:
    description: 'API key for deployment'
    required: true
  dry-run:
    description: 'Perform dry run only'
    required: false
    default: 'false'
outputs:
  deployment-url:
    description: 'URL of deployed application'
    value: ${{ steps.deploy.outputs.url }}
  deployment-id:
    description: 'Deployment ID'
    value: ${{ steps.deploy.outputs.id }}
runs:
  using: 'composite'
  steps:
    - name: Validate inputs
      shell: bash
      run: |
        if [[ "${{ inputs.environment }}" != "staging" && "${{ inputs.environment }}" != "production" ]]; then
          echo "Invalid environment: ${{ inputs.environment }}"
          exit 1
        fi
        
        if [[ -z "${{ inputs.version }}" ]]; then
          echo "Version is required"
          exit 1
        fi
    
    - name: Setup deployment tools
      shell: bash
      run: |
        curl -sL https://deploy-tool.example.com/install.sh | bash
        echo "/opt/deploy-tool/bin" >> $GITHUB_PATH
    
    - name: Pre-deployment validation
      shell: bash
      run: |
        echo "Validating deployment readiness..."
        deploy-tool validate --env ${{ inputs.environment }} --version ${{ inputs.version }}
    
    - name: Deploy application
      id: deploy
      shell: bash
      env:
        API_KEY: ${{ inputs.api-key }}
        DRY_RUN: ${{ inputs.dry-run }}
      run: |
        if [[ "$DRY_RUN" == "true" ]]; then
          echo "Performing dry run deployment"
          result=$(deploy-tool deploy --env ${{ inputs.environment }} --version ${{ inputs.version }} --dry-run)
        else
          echo "Performing actual deployment"
          result=$(deploy-tool deploy --env ${{ inputs.environment }} --version ${{ inputs.version }})
        fi
        
        # Extract deployment info
        url=$(echo "$result" | grep "URL:" | cut -d' ' -f2)
        id=$(echo "$result" | grep "ID:" | cut -d' ' -f2)
        
        echo "url=$url" >> $GITHUB_OUTPUT
        echo "id=$id" >> $GITHUB_OUTPUT
    
    - name: Post-deployment verification
      if: inputs.dry-run != 'true'
      shell: bash
      run: |
        echo "Verifying deployment..."
        sleep 30  # Wait for deployment to stabilize
        curl -f ${{ steps.deploy.outputs.url }}/health || exit 1
        echo "Deployment verification successful"
```

### 2. JavaScript Actions

JavaScript actions provide more flexibility and can interact with the GitHub API and external services.

#### Basic JavaScript Action Structure

**action.yml:**
```yaml
name: 'GitHub Issue Creator'
description: 'Create GitHub issues based on workflow results'
inputs:
  github-token:
    description: 'GitHub token for API access'
    required: true
  issue-title:
    description: 'Title for the issue'
    required: true
  issue-body:
    description: 'Body content for the issue'
    required: false
    default: 'Issue created by GitHub Actions'
  labels:
    description: 'Comma-separated list of labels'
    required: false
outputs:
  issue-number:
    description: 'Number of created issue'
  issue-url:
    description: 'URL of created issue'
runs:
  using: 'node20'
  main: 'index.js'
```

**package.json:**
```json
{
  "name": "github-issue-creator",
  "version": "1.0.0",
  "description": "Create GitHub issues from workflow",
  "main": "index.js",
  "scripts": {
    "build": "ncc build index.js -o dist",
    "test": "jest"
  },
  "dependencies": {
    "@actions/core": "^1.10.0",
    "@actions/github": "^5.1.1"
  },
  "devDependencies": {
    "@vercel/ncc": "^0.36.1",
    "jest": "^29.5.0"
  }
}
```

**index.js:**
```javascript
const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    // Get inputs
    const token = core.getInput('github-token', { required: true });
    const title = core.getInput('issue-title', { required: true });
    const body = core.getInput('issue-body');
    const labels = core.getInput('labels');

    // Create GitHub client
    const octokit = github.getOctokit(token);
    const context = github.context;

    // Prepare issue data
    const issueData = {
      owner: context.repo.owner,
      repo: context.repo.repo,
      title: title,
      body: body
    };

    // Add labels if provided
    if (labels) {
      issueData.labels = labels.split(',').map(label => label.trim());
    }

    // Create issue
    const response = await octokit.rest.issues.create(issueData);

    // Set outputs
    core.setOutput('issue-number', response.data.number);
    core.setOutput('issue-url', response.data.html_url);

    core.info(`Created issue #${response.data.number}: ${response.data.html_url}`);
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
```

**Using the JavaScript action:**
```yaml
jobs:
  create-issue:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Create issue on failure
        if: failure()
        uses: ./.github/actions/github-issue-creator
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          issue-title: 'Workflow failed: ${{ github.workflow }}'
          issue-body: |
            The workflow **${{ github.workflow }}** failed.
            
            **Run:** ${{ github.run_id }}
            **Commit:** ${{ github.sha }}
            **Actor:** ${{ github.actor }}
          labels: 'bug,workflow-failure'
```

#### Advanced JavaScript Action

**Complex action with multiple features:**

```javascript
const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');

class WorkflowAnalyzer {
  constructor(token) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  async analyzeWorkflow() {
    try {
      // Get workflow runs
      const runs = await this.getRecentWorkflowRuns();
      
      // Analyze success rate
      const analysis = this.calculateMetrics(runs);
      
      // Generate report
      const report = this.generateReport(analysis);
      
      // Save report
      await this.saveReport(report);
      
      return analysis;
    } catch (error) {
      throw new Error(`Workflow analysis failed: ${error.message}`);
    }
  }

  async getRecentWorkflowRuns() {
    const { data } = await this.octokit.rest.actions.listWorkflowRuns({
      owner: this.context.repo.owner,
      repo: this.context.repo.repo,
      workflow_id: this.context.workflow,
      per_page: 50
    });
    
    return data.workflow_runs;
  }

  calculateMetrics(runs) {
    const totalRuns = runs.length;
    const successfulRuns = runs.filter(run => run.conclusion === 'success').length;
    const failedRuns = runs.filter(run => run.conclusion === 'failure').length;
    const successRate = totalRuns > 0 ? (successfulRuns / totalRuns) * 100 : 0;
    
    // Calculate average duration
    const completedRuns = runs.filter(run => run.conclusion !== null);
    const avgDuration = completedRuns.length > 0 
      ? completedRuns.reduce((sum, run) => {
          const duration = new Date(run.updated_at) - new Date(run.created_at);
          return sum + duration;
        }, 0) / completedRuns.length
      : 0;

    return {
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate: Math.round(successRate * 100) / 100,
      avgDurationMinutes: Math.round(avgDuration / (1000 * 60) * 100) / 100
    };
  }

  generateReport(analysis) {
    return `# Workflow Analysis Report

## Metrics
- **Total Runs**: ${analysis.totalRuns}
- **Successful Runs**: ${analysis.successfulRuns}
- **Failed Runs**: ${analysis.failedRuns}
- **Success Rate**: ${analysis.successRate}%
- **Average Duration**: ${analysis.avgDurationMinutes} minutes

## Recommendations
${this.generateRecommendations(analysis)}

Generated on: ${new Date().toISOString()}
`;
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    
    if (analysis.successRate < 80) {
      recommendations.push('- Consider improving test stability or fixing flaky tests');
    }
    
    if (analysis.avgDurationMinutes > 30) {
      recommendations.push('- Workflow duration is above 30 minutes, consider optimization');
    }
    
    if (analysis.failedRuns > analysis.successfulRuns) {
      recommendations.push('- High failure rate detected, immediate attention required');
    }
    
    return recommendations.length > 0 
      ? recommendations.join('\n')
      : '- Workflow performance looks good!';
  }

  async saveReport(report) {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const filename = `workflow-analysis-${Date.now()}.md`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, report);
    core.info(`Report saved to ${filepath}`);
    
    return filepath;
  }
}

async function run() {
  try {
    const token = core.getInput('github-token', { required: true });
    const analyzer = new WorkflowAnalyzer(token);
    
    const analysis = await analyzer.analyzeWorkflow();
    
    // Set outputs
    core.setOutput('success-rate', analysis.successRate);
    core.setOutput('avg-duration', analysis.avgDurationMinutes);
    core.setOutput('total-runs', analysis.totalRuns);
    
    core.info(`Analysis complete: ${analysis.successRate}% success rate`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
```

### 3. Docker Container Actions

Docker actions provide complete control over the runtime environment.

#### Dockerfile for Custom Action

**Dockerfile:**
```dockerfile
FROM python:3.11-slim

# Install dependencies
RUN pip install requests pyyaml

# Copy action script
COPY entrypoint.py /entrypoint.py
RUN chmod +x /entrypoint.py

# Set entrypoint
ENTRYPOINT ["python", "/entrypoint.py"]
```

**action.yml:**
```yaml
name: 'Security Vulnerability Scanner'
description: 'Scan dependencies for security vulnerabilities'
inputs:
  severity-threshold:
    description: 'Minimum severity level to report (low, medium, high, critical)'
    required: false
    default: 'medium'
  output-format:
    description: 'Output format (json, yaml, table)'
    required: false
    default: 'table'
  fail-on-findings:
    description: 'Fail the action if vulnerabilities are found'
    required: false
    default: 'true'
outputs:
  vulnerabilities-found:
    description: 'Number of vulnerabilities found'
  report-file:
    description: 'Path to the generated report file'
runs:
  using: 'docker'
  image: 'Dockerfile'
  args:
    - ${{ inputs.severity-threshold }}
    - ${{ inputs.output-format }}
    - ${{ inputs.fail-on-findings }}
```

**entrypoint.py:**
```python
#!/usr/bin/env python3

import os
import sys
import json
import subprocess
import requests
from pathlib import Path

class VulnerabilityScanner:
    def __init__(self, severity_threshold, output_format, fail_on_findings):
        self.severity_threshold = severity_threshold
        self.output_format = output_format
        self.fail_on_findings = fail_on_findings.lower() == 'true'
        self.severity_levels = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
        
    def scan_dependencies(self):
        """Scan dependencies for vulnerabilities"""
        vulnerabilities = []
        
        # Check for package.json (Node.js)
        if Path('package.json').exists():
            vulnerabilities.extend(self.scan_npm())
        
        # Check for requirements.txt (Python)
        if Path('requirements.txt').exists():
            vulnerabilities.extend(self.scan_python())
        
        # Check for pom.xml (Java)
        if Path('pom.xml').exists():
            vulnerabilities.extend(self.scan_maven())
        
        return vulnerabilities
    
    def scan_npm(self):
        """Scan npm dependencies"""
        try:
            result = subprocess.run(['npm', 'audit', '--json'], 
                                  capture_output=True, text=True)
            if result.returncode != 0 and result.stdout:
                audit_data = json.loads(result.stdout)
                return self.parse_npm_audit(audit_data)
        except Exception as e:
            print(f"Error scanning npm dependencies: {e}")
        return []
    
    def scan_python(self):
        """Scan Python dependencies using safety"""
        vulnerabilities = []
        try:
            # Install safety if not available
            subprocess.run(['pip', 'install', 'safety'], 
                          capture_output=True, check=True)
            
            result = subprocess.run(['safety', 'check', '--json'], 
                                  capture_output=True, text=True)
            if result.stdout:
                safety_data = json.loads(result.stdout)
                vulnerabilities.extend(self.parse_safety_report(safety_data))
        except Exception as e:
            print(f"Error scanning Python dependencies: {e}")
        return vulnerabilities
    
    def parse_npm_audit(self, audit_data):
        """Parse npm audit results"""
        vulnerabilities = []
        if 'vulnerabilities' in audit_data:
            for vuln_id, vuln_data in audit_data['vulnerabilities'].items():
                severity = vuln_data.get('severity', 'unknown')
                if self.meets_threshold(severity):
                    vulnerabilities.append({
                        'id': vuln_id,
                        'severity': severity,
                        'title': vuln_data.get('title', 'Unknown'),
                        'package': vuln_data.get('name', 'Unknown'),
                        'source': 'npm'
                    })
        return vulnerabilities
    
    def parse_safety_report(self, safety_data):
        """Parse safety check results"""
        vulnerabilities = []
        for vuln in safety_data:
            severity = self.map_safety_severity(vuln.get('vulnerability_id'))
            if self.meets_threshold(severity):
                vulnerabilities.append({
                    'id': vuln.get('vulnerability_id'),
                    'severity': severity,
                    'title': vuln.get('advisory'),
                    'package': vuln.get('package_name'),
                    'source': 'safety'
                })
        return vulnerabilities
    
    def meets_threshold(self, severity):
        """Check if severity meets the threshold"""
        return (self.severity_levels.get(severity.lower(), 0) >= 
                self.severity_levels.get(self.severity_threshold.lower(), 2))
    
    def map_safety_severity(self, vuln_id):
        """Map vulnerability ID to severity (simplified)"""
        # This would typically query a vulnerability database
        return 'medium'  # Default severity
    
    def generate_report(self, vulnerabilities):
        """Generate report in specified format"""
        if self.output_format == 'json':
            return json.dumps(vulnerabilities, indent=2)
        elif self.output_format == 'yaml':
            import yaml
            return yaml.dump(vulnerabilities, default_flow_style=False)
        else:  # table format
            return self.format_table(vulnerabilities)
    
    def format_table(self, vulnerabilities):
        """Format vulnerabilities as a table"""
        if not vulnerabilities:
            return "No vulnerabilities found above threshold."
        
        table = "| Package | Severity | Title | Source |\n"
        table += "|---------|----------|-------|--------|\n"
        
        for vuln in vulnerabilities:
            table += f"| {vuln['package']} | {vuln['severity']} | {vuln['title'][:50]}... | {vuln['source']} |\n"
        
        return table
    
    def save_report(self, report):
        """Save report to file"""
        filename = f"vulnerability-report.{self.output_format}"
        with open(filename, 'w') as f:
            f.write(report)
        return filename

def set_output(name, value):
    """Set GitHub Actions output"""
    print(f"::set-output name={name}::{value}")

def main():
    if len(sys.argv) != 4:
        print("Usage: entrypoint.py <severity_threshold> <output_format> <fail_on_findings>")
        sys.exit(1)
    
    severity_threshold = sys.argv[1]
    output_format = sys.argv[2]
    fail_on_findings = sys.argv[3]
    
    scanner = VulnerabilityScanner(severity_threshold, output_format, fail_on_findings)
    
    print("Scanning dependencies for vulnerabilities...")
    vulnerabilities = scanner.scan_dependencies()
    
    print(f"Found {len(vulnerabilities)} vulnerabilities above {severity_threshold} threshold")
    
    # Generate and save report
    report = scanner.generate_report(vulnerabilities)
    report_file = scanner.save_report(report)
    
    print(f"Report saved to {report_file}")
    print("Report content:")
    print(report)
    
    # Set outputs
    set_output('vulnerabilities-found', len(vulnerabilities))
    set_output('report-file', report_file)
    
    # Fail if vulnerabilities found and fail_on_findings is true
    if vulnerabilities and scanner.fail_on_findings:
        print("Vulnerabilities found and fail-on-findings is enabled")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Action Distribution and Versioning

### 1. Publishing to GitHub Marketplace

**Required files for marketplace:**

- `action.yml` or `action.yaml`
- `README.md`
- `LICENSE`

**action.yml with marketplace metadata:**
```yaml
name: 'My Awesome Action'
description: 'A comprehensive action for CI/CD workflows'
author: 'Your Name'
branding:
  icon: 'check-circle'
  color: 'green'
inputs:
  # ... input definitions
runs:
  using: 'node20'
  main: 'dist/index.js'
```

### 2. Versioning Strategy

```bash
# Create and push tags
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Create major version tag (moves with updates)
git tag -fa v1 -m "Update v1 to v1.0.0"
git push origin v1 --force
```

**Usage with versions:**
```yaml
steps:
  - uses: username/my-action@v1        # Major version (recommended)
  - uses: username/my-action@v1.0.0    # Specific version
  - uses: username/my-action@main      # Latest (not recommended for production)
```

### 3. Action Marketplace Optimization

**README.md example:**
```markdown
# My Awesome Action

Brief description of what the action does.

## Usage

```yaml
- uses: username/my-awesome-action@v1
  with:
    input1: 'value1'
    input2: 'value2'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `input1` | Description of input1 | Yes | N/A |
| `input2` | Description of input2 | No | `default` |

## Outputs

| Output | Description |
|--------|-------------|
| `output1` | Description of output1 |

## Examples

### Basic Usage
[Example workflows]

### Advanced Usage
[Complex examples]
```

## Testing Custom Actions

### 1. Local Testing

**test-action.yml:**
```yaml
name: Test Custom Action
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Test custom action
        id: test
        uses: ./
        with:
          input1: 'test-value'
          input2: 'another-test'
      
      - name: Verify outputs
        run: |
          echo "Output 1: ${{ steps.test.outputs.output1 }}"
          if [ -z "${{ steps.test.outputs.output1 }}" ]; then
            echo "Output1 is missing"
            exit 1
          fi
```

### 2. Unit Testing JavaScript Actions

**test/index.test.js:**
```javascript
const process = require('process');
const cp = require('child_process');
const path = require('path');

test('test action with valid inputs', () => {
  process.env['INPUT_GITHUB-TOKEN'] = 'fake-token';
  process.env['INPUT_ISSUE-TITLE'] = 'Test Issue';
  process.env['INPUT_ISSUE-BODY'] = 'Test body';
  
  const ip = path.join(__dirname, '..', 'index.js');
  const result = cp.execSync(`node ${ip}`, { env: process.env }).toString();
  
  expect(result).toContain('Created issue');
});

test('test action with missing inputs', () => {
  delete process.env['INPUT_GITHUB-TOKEN'];
  
  const ip = path.join(__dirname, '..', 'index.js');
  
  expect(() => {
    cp.execSync(`node ${ip}`, { env: process.env });
  }).toThrow();
});
```

### 3. Integration Testing

**integration-test.yml:**
```yaml
name: Integration Test
on:
  push:
    branches: [main]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup test environment
        run: |
          # Setup any required services or dependencies
          echo "Setting up test environment"
      
      - name: Test action in realistic scenario
        uses: ./
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          issue-title: 'Integration Test Issue'
          labels: 'test,automated'
      
      - name: Cleanup test data
        if: always()
        run: |
          # Clean up any test issues or resources
          echo "Cleaning up test data"
```

## Best Practices

### 1. Input Validation

```javascript
// Validate required inputs
const requiredInputs = ['github-token', 'issue-title'];
for (const input of requiredInputs) {
  if (!core.getInput(input)) {
    core.setFailed(`Required input '${input}' is missing`);
    return;
  }
}

// Validate input formats
const email = core.getInput('email');
if (email && !email.includes('@')) {
  core.setFailed('Invalid email format');
  return;
}
```

### 2. Error Handling

```javascript
async function run() {
  try {
    // Action logic here
  } catch (error) {
    // Log detailed error for debugging
    core.debug(`Full error: ${error.stack}`);
    
    // Set user-friendly failure message
    core.setFailed(`Action failed: ${error.message}`);
  }
}
```

### 3. Security Considerations

```javascript
// Mask sensitive outputs
const apiKey = core.getInput('api-key');
core.setSecret(apiKey);

// Validate input to prevent injection
const userInput = core.getInput('user-input');
if (userInput.includes('$(') || userInput.includes('`')) {
  core.setFailed('Invalid characters in input');
  return;
}
```

### 4. Performance Optimization

```javascript
// Use efficient GitHub API patterns
const octokit = github.getOctokit(token);

// Batch API calls when possible
const promises = items.map(item => 
  octokit.rest.issues.create(item)
);
const results = await Promise.all(promises);

// Cache expensive operations
const cache = new Map();
function getCachedData(key) {
  if (!cache.has(key)) {
    cache.set(key, fetchExpensiveData(key));
  }
  return cache.get(key);
}
```

## Common Patterns

### 1. Multi-Step Composite Action

```yaml
name: 'Complete CI Pipeline'
description: 'Run complete CI pipeline with testing and analysis'
inputs:
  node-version:
    required: false
    default: '18'
  run-security-scan:
    required: false
    default: 'true'
outputs:
  test-coverage:
    value: ${{ steps.test.outputs.coverage }}
  security-issues:
    value: ${{ steps.security.outputs.issues }}
runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
    
    - name: Install dependencies
      shell: bash
      run: npm ci
    
    - name: Run linting
      shell: bash
      run: npm run lint
    
    - name: Run tests with coverage
      id: test
      shell: bash
      run: |
        npm run test:coverage
        coverage=$(grep -o '"pct":[0-9.]*' coverage/coverage-summary.json | head -1 | cut -d: -f2)
        echo "coverage=$coverage" >> $GITHUB_OUTPUT
    
    - name: Security scan
      id: security
      if: inputs.run-security-scan == 'true'
      shell: bash
      run: |
        npm audit --audit-level moderate
        issues=$(npm audit --json | jq '.metadata.vulnerabilities.total')
        echo "issues=$issues" >> $GITHUB_OUTPUT
```

### 2. Conditional Action Execution

```yaml
name: 'Environment Deployer'
description: 'Deploy to environment based on branch'
inputs:
  aws-access-key:
    required: true
  aws-secret-key:
    required: true
runs:
  using: 'composite'
  steps:
    - name: Determine environment
      id: env
      shell: bash
      run: |
        if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
          echo "environment=production" >> $GITHUB_OUTPUT
        elif [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then
          echo "environment=staging" >> $GITHUB_OUTPUT
        else
          echo "environment=review" >> $GITHUB_OUTPUT
        fi
    
    - name: Deploy to production
      if: steps.env.outputs.environment == 'production'
      shell: bash
      run: deploy-to-production.sh
    
    - name: Deploy to staging
      if: steps.env.outputs.environment == 'staging'
      shell: bash
      run: deploy-to-staging.sh
    
    - name: Deploy review environment
      if: steps.env.outputs.environment == 'review'
      shell: bash
      run: deploy-review-env.sh ${{ github.head_ref }}
```

Understanding custom actions enables you to create powerful, reusable automation components that can simplify workflows, promote code reuse, and provide specialized functionality for your CI/CD pipelines.