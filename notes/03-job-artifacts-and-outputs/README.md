# Job Artifacts and Outputs in GitHub Actions

In GitHub Actions, **job artifacts** and **outputs** are essential for sharing data between jobs and retaining important files generated during workflow execution. Mastering these concepts is crucial for building robust, maintainable, and efficient CI/CD pipelines—especially for certification.

---

## Workflow Context

### What is Workflow Context?

The **workflow context** in GitHub Actions provides metadata and information about the workflow run, jobs, steps, and the GitHub environment. Contexts are special variables that you can use in your workflow YAML to access useful data, such as commit SHA, branch name, event type, and more.

### Common Contexts

- **github**: Contains information about the workflow run, repository, actor, event, etc.
- **env**: Accesses environment variables.
- **job**: Information about the current job.
- **steps**: Outputs from previous steps in the current job.
- **runner**: Information about the runner executing the job.
- **secrets**: Accesses repository or organization secrets.
- **strategy**: Information about the current matrix strategy.
- **matrix**: Values for the current matrix job.

### Example Usage

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - name: Print workflow context
        run: |
          echo "Repository: ${{ github.repository }}"
          echo "Actor: ${{ github.actor }}"
          echo "Event: ${{ github.event_name }}"
          echo "Commit SHA: ${{ github.sha }}"
          echo "Branch: ${{ github.ref }}"
```

### More on the `github` Context

Some useful properties:
- `${{ github.repository }}`: The owner and repository name (e.g., `octocat/Hello-World`)
- `${{ github.ref }}`: The branch or tag ref that triggered the workflow
- `${{ github.sha }}`: The commit SHA that triggered the workflow
- `${{ github.actor }}`: The username of the person or app that initiated the workflow
- `${{ github.event_name }}`: The name of the event that triggered the workflow (e.g., `push`, `pull_request`)
- `${{ github.workflow }}`: The name of the workflow
- `${{ github.run_id }}`: A unique number for each workflow run

---

## GitHub Runners

### What Are Runners?

A **runner** is a server that has the GitHub Actions runner application installed. It listens for available jobs and runs one job at a time. There are two main types:

- **GitHub-hosted runners:** Managed by GitHub, these are ephemeral virtual machines that are automatically created and destroyed for each job. They come pre-installed with popular tools and languages.
- **Self-hosted runners:** Managed by you, these can be physical, virtual, on-premises, or in the cloud. You control the environment and installed software.

### Common GitHub-hosted Runners

| Label            | OS           | Description                                 |
|------------------|--------------|---------------------------------------------|
| `ubuntu-latest`  | Ubuntu Linux | Latest supported Ubuntu LTS (e.g., 22.04)   |
| `windows-latest` | Windows      | Latest supported Windows Server             |
| `macos-latest`   | macOS        | Latest supported macOS                      |

You can also specify specific versions, e.g., `ubuntu-22.04`, `windows-2022`, `macos-14`.

**Example:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "Running on Ubuntu"
```

### Key Points

- Each job in a workflow runs on a fresh runner instance.
- Runners have a pre-installed set of tools ([see full list](https://github.com/actions/runner-images)).
- Artifacts and outputs are used to share data between jobs, since each job runs in isolation.
- Self-hosted runners can be used for custom environments or to access private resources.

### Security Considerations

- GitHub-hosted runners are recommended for most use cases due to automatic updates and isolation.
- Self-hosted runners should be secured and kept up to date, especially if exposed to public repositories.

---

## Job Artifacts

### What Are Artifacts?

Artifacts are files or directories produced during a workflow run that you want to persist after a job completes. Common use cases include:
- Build outputs (binaries, packages)
- Test results (JUnit XML, coverage reports)
- Logs and debug information
- Deployment manifests

Artifacts are retained by GitHub for a configurable period (default: 90 days, max: 90 days for public repos).

### Storing Artifacts

Artifacts are uploaded using the [`actions/upload-artifact`](https://github.com/actions/upload-artifact) action. Key points:
- You can upload single files, directories, or use wildcards.
- Artifacts are scoped to the workflow run and accessible by subsequent jobs.

**Example: Uploading a directory**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Build
        run: |
          mkdir -p dist
          echo "Hello" > dist/hello.txt

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist-artifacts
          path: dist/
```

**Best Practices:**
- Use descriptive artifact names.
- Avoid uploading sensitive data.
- Limit artifact size to avoid workflow failures (max 2GB per artifact, 100 artifacts per workflow).

### Downloading Artifacts

Artifacts can be downloaded in later jobs (even across different runners) using [`actions/download-artifact`](https://github.com/actions/download-artifact).

**Example:**
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: build-output
          path: dist/

  test:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v3
        with:
          name: build-output
          path: ./downloaded-dist
      - name: Run tests
        run: ls ./downloaded-dist
```

**Notes:**
- Artifacts are only available within the same workflow run.
- Use the `path` input to control where files are extracted.

### Advanced: Retention and Expiry

You can set how long artifacts are retained:
```yaml
      - uses: actions/upload-artifact@v3
        with:
          name: logs
          path: logs/
          retention-days: 14
```

---

## Job Outputs

### What Are Job Outputs?

Job outputs are string values set by one job and consumed by another. They are ideal for passing small pieces of data (IDs, URLs, computed values) between jobs.

### Setting Outputs

Set outputs in a step using the `echo "::set-output name=...::..."` syntax (deprecated), or by writing to the `$GITHUB_OUTPUT` file (recommended):

**Recommended (GitHub Actions v2+):**
```yaml
jobs:
  job1:
    runs-on: ubuntu-latest
    outputs:
      artifact-path: ${{ steps.set-path.outputs.artifact-path }}
    steps:
      - id: set-path
        run: echo "artifact-path=dist/output.txt" >> $GITHUB_OUTPUT
```

**Legacy (deprecated):**
```yaml
      - id: set-path
        run: echo "::set-output name=artifact-path::dist/output.txt"
```

### Consuming Outputs

Downstream jobs can access outputs via the `needs` context:
```yaml
jobs:
  job2:
    runs-on: ubuntu-latest
    needs: job1
    steps:
      - run: echo "Artifact path: ${{ needs.job1.outputs.artifact-path }}"
```

### Step Outputs

You can also pass data between steps in the same job using `id` and `outputs`:
```yaml
steps:
  - id: get-version
    run: echo "version=1.2.3" >> $GITHUB_OUTPUT
  - run: echo "Version is ${{ steps.get-version.outputs.version }}"
```

---

## Artifacts vs. Outputs

| Feature   | Artifacts                          | Outputs                       |
|-----------|------------------------------------|-------------------------------|
| Purpose   | Persist files between jobs         | Pass small data between jobs  |
| Size      | Up to 2GB per artifact             | String values only            |
| Use Case  | Build/test files, logs, reports    | IDs, URLs, computed values    |
| Lifetime  | Until artifact expiry (default 90d)| Only during workflow run      |

---

## Troubleshooting

- **Artifacts not found:** Ensure artifact names match exactly between upload and download.
- **Large artifacts fail:** Check size limits and split large files if needed.
- **Output not available:** Confirm job dependencies (`needs:`) are set correctly.

---

## Best Practices

- Use artifacts for files, outputs for small data.
- Clean up artifacts to avoid storage bloat.
- Avoid leaking secrets in artifacts or outputs.
- Use `retention-days` to control artifact lifetime.

---

## References

- [Contexts in GitHub Actions](https://docs.github.com/en/actions/learn-github-actions/contexts)
- [GitHub Actions: Storing workflow data as artifacts](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [GitHub Actions: Sharing data between jobs](https://docs.github.com/en/actions/using-workflows/sharing-data-between-jobs)
- [actions/upload-artifact](https://github.com/actions/upload-artifact)
- [actions/download-artifact](https://github.com/actions/download-artifact)
- [About GitHub-hosted runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners)
- [About self-hosted runners](https://docs.github.com/en/actions/hosting-your-own-runners/about-self-hosted-runners)