# GitHub Actions - Job Artifacts and Outputs

## Overview

Artifacts and outputs are essential mechanisms for sharing data between workflow jobs and preserving build results. Understanding how to effectively use artifacts and outputs enables you to create sophisticated workflows that can pass data, store build results, and coordinate complex CI/CD pipelines.

## Job Outputs

Job outputs allow you to pass data from one job to another within the same workflow run.

### Basic Job Outputs

```yaml
jobs:
  job1:
    runs-on: ubuntu-latest
    outputs:
      # Define outputs at job level
      output1: ${{ steps.step1.outputs.result }}
      output2: ${{ steps.step2.outputs.value }}
    steps:
      - name: Generate output 1
        id: step1
        run: echo "result=hello" >> $GITHUB_OUTPUT
      
      - name: Generate output 2
        id: step2
        run: echo "value=world" >> $GITHUB_OUTPUT

  job2:
    needs: job1
    runs-on: ubuntu-latest
    steps:
      - name: Use outputs from job1
        run: |
          echo "Output 1: ${{ needs.job1.outputs.output1 }}"
          echo "Output 2: ${{ needs.job1.outputs.output2 }}"
```

### Step Outputs

Steps can generate outputs that can be used by later steps in the same job or passed as job outputs.

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.get-version.outputs.version }}
      build-number: ${{ steps.get-build.outputs.number }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Get version from package.json
        id: get-version
        run: |
          VERSION=$(jq -r '.version' package.json)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Generate build number
        id: get-build
        run: |
          BUILD_NUMBER=$(date +%Y%m%d%H%M%S)
          echo "number=$BUILD_NUMBER" >> $GITHUB_OUTPUT
      
      - name: Use outputs in same job
        run: |
          echo "Building version ${{ steps.get-version.outputs.version }}"
          echo "Build number: ${{ steps.get-build.outputs.number }}"
```

### Complex Output Examples

#### JSON Outputs
```yaml
jobs:
  generate-matrix:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - name: Set matrix
        id: set-matrix
        run: |
          matrix='{"include":[
            {"os":"ubuntu-latest","node":"16"},
            {"os":"ubuntu-latest","node":"18"},
            {"os":"windows-latest","node":"18"}
          ]}'
          echo "matrix=$matrix" >> $GITHUB_OUTPUT

  test:
    needs: generate-matrix
    strategy:
      matrix: ${{ fromJSON(needs.generate-matrix.outputs.matrix) }}
    runs-on: ${{ matrix.os }}
    steps:
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
```

#### Multi-line Outputs
```yaml
jobs:
  generate-report:
    runs-on: ubuntu-latest
    outputs:
      report: ${{ steps.create-report.outputs.report }}
    steps:
      - name: Create report
        id: create-report
        run: |
          {
            echo 'report<<EOF'
            echo "Build Status: Success"
            echo "Tests Passed: 150"
            echo "Coverage: 95%"
            echo "Duration: 5m 30s"
            echo 'EOF'
          } >> $GITHUB_OUTPUT

  notify:
    needs: generate-report
    runs-on: ubuntu-latest
    steps:
      - name: Send notification
        run: |
          echo "Build Report:"
          echo "${{ needs.generate-report.outputs.report }}"
```

## Artifacts

Artifacts are files or collections of files that are uploaded during a workflow run and can be downloaded later.

### Uploading Artifacts

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Build application
        run: |
          mkdir -p dist
          echo "Built application" > dist/app.js
          echo "Build complete" > dist/build.log
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-artifacts
          path: |
            dist/
            package.json
          retention-days: 30
```

### Downloading Artifacts

```yaml
jobs:
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-artifacts
          path: ./downloaded-artifacts
      
      - name: List downloaded files
        run: |
          ls -la ./downloaded-artifacts
          cat ./downloaded-artifacts/dist/build.log
```

### Advanced Artifact Patterns

#### Multiple Artifacts
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build frontend
        run: |
          mkdir -p frontend/dist
          echo "Frontend build" > frontend/dist/index.html
      
      - name: Build backend
        run: |
          mkdir -p backend/dist
          echo "Backend build" > backend/dist/server.js
      
      - name: Upload frontend artifacts
        uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: frontend/dist/
      
      - name: Upload backend artifacts
        uses: actions/upload-artifact@v4
        with:
          name: backend-build
          path: backend/dist/
```

#### Conditional Artifacts
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build application
        run: |
          mkdir -p dist logs
          echo "Application" > dist/app.js
          echo "Error log" > logs/error.log
      
      - name: Upload application artifacts
        uses: actions/upload-artifact@v4
        with:
          name: application
          path: dist/
      
      - name: Upload logs on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: error-logs
          path: logs/
          retention-days: 7
```

#### Platform-Specific Artifacts
```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - name: Build for platform
        run: |
          mkdir -p dist
          echo "Build for ${{ runner.os }}" > dist/app-${{ runner.os }}
      
      - name: Upload platform artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ runner.os }}
          path: dist/
```

### Artifact Configuration Options

```yaml
- name: Upload with options
  uses: actions/upload-artifact@v4
  with:
    name: my-artifact
    path: |
      dist/
      docs/
    retention-days: 90          # Keep for 90 days (max)
    compression-level: 6        # Compression level 0-9
    overwrite: true            # Overwrite existing artifact
    include-hidden-files: true  # Include hidden files
```

## Cross-Job Data Sharing Patterns

### 1. Build and Test Pipeline

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
      build-id: ${{ steps.build.outputs.id }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Get version
        id: version
        run: echo "version=$(cat VERSION)" >> $GITHUB_OUTPUT
      
      - name: Build application
        id: build
        run: |
          npm run build
          BUILD_ID=$(date +%s)
          echo "id=$BUILD_ID" >> $GITHUB_OUTPUT
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ steps.build.outputs.id }}
          path: dist/

  test:
    needs: build
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-type: [unit, integration, e2e]
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-${{ needs.build.outputs.build-id }}
          path: dist/
      
      - name: Run ${{ matrix.test-type }} tests
        run: npm run test:${{ matrix.test-type }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-${{ matrix.test-type }}
          path: test-results/

  deploy:
    needs: [build, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-${{ needs.build.outputs.build-id }}
          path: dist/
      
      - name: Deploy version ${{ needs.build.outputs.version }}
        run: |
          echo "Deploying version ${{ needs.build.outputs.version }}"
          echo "Build ID: ${{ needs.build.outputs.build-id }}"
```

### 2. Multi-Platform Build

```yaml
jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            platform: linux
            arch: amd64
          - os: windows-latest
            platform: windows
            arch: amd64
          - os: macos-latest
            platform: darwin
            arch: amd64
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Build for ${{ matrix.platform }}
        run: |
          mkdir -p dist
          # Build commands here
          echo "Binary for ${{ matrix.platform }}" > dist/app-${{ matrix.platform }}-${{ matrix.arch }}
      
      - name: Upload platform binary
        uses: actions/upload-artifact@v4
        with:
          name: binary-${{ matrix.platform }}-${{ matrix.arch }}
          path: dist/

  package:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts/
      
      - name: Create release package
        run: |
          mkdir -p release
          cp -r artifacts/*/. release/
          tar -czf release.tar.gz -C release .
      
      - name: Upload release package
        uses: actions/upload-artifact@v4
        with:
          name: release-package
          path: release.tar.gz
```

## Advanced Patterns

### 1. Artifact Merging

```yaml
jobs:
  generate-docs:
    strategy:
      matrix:
        component: [api, frontend, backend]
    runs-on: ubuntu-latest
    steps:
      - name: Generate docs for ${{ matrix.component }}
        run: |
          mkdir -p docs
          echo "Documentation for ${{ matrix.component }}" > docs/${{ matrix.component }}.md
      
      - name: Upload component docs
        uses: actions/upload-artifact@v4
        with:
          name: docs-${{ matrix.component }}
          path: docs/

  merge-docs:
    needs: generate-docs
    runs-on: ubuntu-latest
    steps:
      - name: Download all documentation
        uses: actions/download-artifact@v4
        with:
          pattern: docs-*
          path: all-docs/
          merge-multiple: true
      
      - name: Create documentation bundle
        run: |
          ls -la all-docs/
          tar -czf documentation.tar.gz -C all-docs .
      
      - name: Upload merged documentation
        uses: actions/upload-artifact@v4
        with:
          name: complete-documentation
          path: documentation.tar.gz
```

### 2. Cache Integration

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Cache build output
        uses: actions/cache@v3
        with:
          path: dist/
          key: build-${{ github.sha }}
      
      - name: Upload build artifacts (backup)
        uses: actions/upload-artifact@v4
        with:
          name: build-backup
          path: dist/
          retention-days: 1

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Restore build cache
        uses: actions/cache@v3
        with:
          path: dist/
          key: build-${{ github.sha }}
      
      - name: Download artifacts if cache miss
        if: steps.cache.outputs.cache-hit != 'true'
        uses: actions/download-artifact@v4
        with:
          name: build-backup
          path: dist/
```

### 3. Dynamic Artifact Names

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Get timestamp and commit
        id: info
        run: |
          echo "timestamp=$(date +%Y%m%d-%H%M%S)" >> $GITHUB_OUTPUT
          echo "short-sha=${GITHUB_SHA:0:7}" >> $GITHUB_OUTPUT
      
      - name: Build application
        run: |
          mkdir -p dist
          echo "Build info" > dist/build-info.txt
      
      - name: Upload with dynamic name
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ steps.info.outputs.timestamp }}-${{ steps.info.outputs.short-sha }}
          path: dist/
```

## Best Practices

### 1. Artifact Management

```yaml
# Good: Specific retention periods
- name: Upload logs
  uses: actions/upload-artifact@v4
  with:
    name: logs
    path: logs/
    retention-days: 7  # Short retention for logs

- name: Upload release assets
  uses: actions/upload-artifact@v4
  with:
    name: release
    path: dist/
    retention-days: 90  # Longer retention for releases
```

### 2. Efficient Artifact Usage

```yaml
# Good: Use specific paths
- name: Upload specific files
  uses: actions/upload-artifact@v4
  with:
    name: important-files
    path: |
      dist/*.js
      config.json
      !dist/*.map

# Avoid: Uploading everything
- name: Upload everything (bad)
  uses: actions/upload-artifact@v4
  with:
    name: all-files
    path: .  # Uploads entire workspace
```

### 3. Output Validation

```yaml
jobs:
  producer:
    runs-on: ubuntu-latest
    outputs:
      config: ${{ steps.validate.outputs.config }}
    steps:
      - name: Generate config
        id: generate
        run: |
          config='{"env":"production","debug":false}'
          echo "config=$config" >> $GITHUB_OUTPUT
      
      - name: Validate config
        id: validate
        run: |
          config='${{ steps.generate.outputs.config }}'
          if echo "$config" | jq empty; then
            echo "config=$config" >> $GITHUB_OUTPUT
          else
            echo "Invalid JSON config"
            exit 1
          fi

  consumer:
    needs: producer
    runs-on: ubuntu-latest
    steps:
      - name: Use validated config
        run: |
          config='${{ needs.producer.outputs.config }}'
          echo "Using config: $config"
          echo "$config" | jq .
```

## Security Considerations

### 1. Artifact Content Validation

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build and scan
        run: |
          # Build process
          npm run build
          
          # Security scan of artifacts
          find dist/ -name "*.js" -exec grep -l "eval\|Function" {} \; > security-issues.txt
          if [ -s security-issues.txt ]; then
            echo "Security issues found in build artifacts"
            cat security-issues.txt
            exit 1
          fi
      
      - name: Upload verified artifacts
        uses: actions/upload-artifact@v4
        with:
          name: verified-build
          path: dist/
```

### 2. Output Sanitization

```yaml
jobs:
  process:
    runs-on: ubuntu-latest
    outputs:
      safe-output: ${{ steps.sanitize.outputs.result }}
    steps:
      - name: Generate output
        id: generate
        run: |
          # Potentially unsafe input
          user_input="${{ github.event.inputs.message }}"
          echo "raw=$user_input" >> $GITHUB_OUTPUT
      
      - name: Sanitize output
        id: sanitize
        run: |
          raw="${{ steps.generate.outputs.raw }}"
          # Remove potentially dangerous characters
          safe=$(echo "$raw" | tr -d '`$;|&<>(){}[]')
          echo "result=$safe" >> $GITHUB_OUTPUT
```

## Troubleshooting

### Common Issues

1. **Artifact not found**
   ```yaml
   - name: Download with error handling
     uses: actions/download-artifact@v4
     with:
       name: my-artifact
       path: ./artifacts
     continue-on-error: true
   
   - name: Check if artifact exists
     run: |
       if [ ! -d "./artifacts" ]; then
         echo "Artifact not found, using defaults"
         mkdir -p ./artifacts
         echo "default" > ./artifacts/file.txt
       fi
   ```

2. **Output size limits**
   ```yaml
   - name: Handle large outputs
     id: large-output
     run: |
       # For large outputs, use artifacts instead
       large_data=$(generate_large_data)
       echo "$large_data" > large-output.txt
       echo "file-created=large-output.txt" >> $GITHUB_OUTPUT
   
   - name: Upload large data as artifact
     uses: actions/upload-artifact@v4
     with:
       name: large-data
       path: large-output.txt
   ```

Understanding artifacts and outputs enables you to build sophisticated workflows that can coordinate complex processes, share data efficiently, and maintain build artifacts for deployment and analysis.