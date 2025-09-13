# GitHub Actions - Environment Variables and Secrets

## Overview

Environment variables and secrets are crucial for configuring workflows, passing data between steps, and securely managing sensitive information. This guide covers all aspects of environment variables and secrets in GitHub Actions, from basic usage to advanced security patterns.

## Environment Variables

Environment variables provide a way to store and access configuration data in your workflows.

### Setting Environment Variables

#### Global Environment Variables
Set at the workflow level and available to all jobs:

```yaml
name: Environment Variables Example
env:
  GLOBAL_VAR: "global-value"
  NODE_ENV: "production"
  API_URL: "https://api.example.com"

on: [push]

jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - name: Access global environment variables
        run: |
          echo "Global var: $GLOBAL_VAR"
          echo "Node env: $NODE_ENV"
          echo "API URL: $API_URL"
```

#### Job-Level Environment Variables
Set at the job level and available to all steps in that job:

```yaml
jobs:
  backend:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: "postgresql://localhost:5432/mydb"
      CACHE_DRIVER: "redis"
    steps:
      - name: Use job environment variables
        run: |
          echo "Database: $DATABASE_URL"
          echo "Cache: $CACHE_DRIVER"

  frontend:
    runs-on: ubuntu-latest
    env:
      API_ENDPOINT: "https://api.frontend.com"
      BUILD_MODE: "production"
    steps:
      - name: Use different job variables
        run: |
          echo "API: $API_ENDPOINT"
          echo "Mode: $BUILD_MODE"
```

#### Step-Level Environment Variables
Set at the step level and only available to that specific step:

```yaml
jobs:
  example:
    runs-on: ubuntu-latest
    steps:
      - name: Step with custom environment
        env:
          CUSTOM_VAR: "step-specific"
          TEMP_DIR: "/tmp/build"
        run: |
          echo "Custom: $CUSTOM_VAR"
          echo "Temp: $TEMP_DIR"
          mkdir -p $TEMP_DIR
```

### Dynamic Environment Variables

#### Setting Variables from Step Outputs
```yaml
jobs:
  dynamic-vars:
    runs-on: ubuntu-latest
    steps:
      - name: Generate dynamic values
        id: generate
        run: |
          timestamp=$(date +%s)
          version="v1.0.$timestamp"
          echo "timestamp=$timestamp" >> $GITHUB_OUTPUT
          echo "version=$version" >> $GITHUB_OUTPUT
      
      - name: Use dynamic values as environment variables
        env:
          BUILD_TIMESTAMP: ${{ steps.generate.outputs.timestamp }}
          APP_VERSION: ${{ steps.generate.outputs.version }}
        run: |
          echo "Build timestamp: $BUILD_TIMESTAMP"
          echo "App version: $APP_VERSION"
```

#### Environment Variables from JSON
```yaml
jobs:
  json-config:
    runs-on: ubuntu-latest
    steps:
      - name: Set up configuration
        id: config
        run: |
          config='{"database":{"host":"localhost","port":5432},"cache":{"driver":"redis","ttl":3600}}'
          echo "config=$config" >> $GITHUB_OUTPUT
      
      - name: Use JSON configuration
        env:
          CONFIG_JSON: ${{ steps.config.outputs.config }}
          DB_HOST: ${{ fromJSON(steps.config.outputs.config).database.host }}
          DB_PORT: ${{ fromJSON(steps.config.outputs.config).database.port }}
          CACHE_DRIVER: ${{ fromJSON(steps.config.outputs.config).cache.driver }}
        run: |
          echo "Full config: $CONFIG_JSON"
          echo "Database host: $DB_HOST"
          echo "Database port: $DB_PORT"
          echo "Cache driver: $CACHE_DRIVER"
```

### Context-Based Environment Variables

#### Using GitHub Context
```yaml
jobs:
  context-vars:
    runs-on: ubuntu-latest
    env:
      # GitHub context variables
      REPOSITORY: ${{ github.repository }}
      BRANCH: ${{ github.ref_name }}
      COMMIT_SHA: ${{ github.sha }}
      ACTOR: ${{ github.actor }}
      RUN_ID: ${{ github.run_id }}
      # Conditional variables
      ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
    steps:
      - name: Display context information
        run: |
          echo "Repository: $REPOSITORY"
          echo "Branch: $BRANCH"
          echo "Commit: $COMMIT_SHA"
          echo "Actor: $ACTOR"
          echo "Run ID: $RUN_ID"
          echo "Environment: $ENVIRONMENT"
```

#### Runner Context Variables
```yaml
jobs:
  runner-vars:
    runs-on: ubuntu-latest
    env:
      RUNNER_OS: ${{ runner.os }}
      RUNNER_ARCH: ${{ runner.arch }}
      RUNNER_TEMP: ${{ runner.temp }}
      RUNNER_WORKSPACE: ${{ runner.workspace }}
    steps:
      - name: Display runner information
        run: |
          echo "OS: $RUNNER_OS"
          echo "Architecture: $RUNNER_ARCH"
          echo "Temp directory: $RUNNER_TEMP"
          echo "Workspace: $RUNNER_WORKSPACE"
```

## Secrets

Secrets store sensitive information that shouldn't be exposed in workflow files or logs.

### Repository Secrets

#### Setting Up Secrets
Secrets are configured in repository settings and accessed using the `secrets` context:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        env:
          DATABASE_PASSWORD: ${{ secrets.DB_PASSWORD }}
          API_KEY: ${{ secrets.API_KEY }}
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: |
          # Secrets are automatically masked in logs
          echo "Connecting to database..."
          deploy-script --token="$DEPLOY_TOKEN" --api-key="$API_KEY"
```

#### Environment-Specific Secrets
```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
          API_ENDPOINT: ${{ secrets.STAGING_API_ENDPOINT }}
        run: deploy-to-staging.sh

  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          API_ENDPOINT: ${{ secrets.PROD_API_ENDPOINT }}
        run: deploy-to-production.sh
```

### Organization Secrets

Organization-level secrets are available to all repositories in the organization:

```yaml
jobs:
  shared-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Use organization secrets
        env:
          ORG_DOCKER_REGISTRY: ${{ secrets.ORG_DOCKER_REGISTRY }}
          ORG_DEPLOY_KEY: ${{ secrets.ORG_DEPLOY_KEY }}
        run: |
          echo "Using organization Docker registry: $ORG_DOCKER_REGISTRY"
          deploy-with-org-key.sh
```

### Environment Secrets

Environment secrets are associated with specific environments and can have protection rules:

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: 
      name: production
      url: https://myapp.com
    steps:
      - name: Deploy with environment secrets
        env:
          PROD_DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
          PROD_API_SECRET: ${{ secrets.PROD_API_SECRET }}
        run: |
          echo "Deploying to production environment"
          deploy.sh --db-url="$PROD_DATABASE_URL"
```

## Advanced Patterns

### 1. Configuration Management

#### Environment-Based Configuration
```yaml
jobs:
  configure:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [development, staging, production]
    steps:
      - name: Set environment-specific variables
        env:
          ENV_NAME: ${{ matrix.environment }}
        run: |
          case "$ENV_NAME" in
            "development")
              echo "DEBUG=true" >> $GITHUB_ENV
              echo "LOG_LEVEL=debug" >> $GITHUB_ENV
              echo "DATABASE_URL=${{ secrets.DEV_DATABASE_URL }}" >> $GITHUB_ENV
              ;;
            "staging")
              echo "DEBUG=false" >> $GITHUB_ENV
              echo "LOG_LEVEL=info" >> $GITHUB_ENV
              echo "DATABASE_URL=${{ secrets.STAGING_DATABASE_URL }}" >> $GITHUB_ENV
              ;;
            "production")
              echo "DEBUG=false" >> $GITHUB_ENV
              echo "LOG_LEVEL=error" >> $GITHUB_ENV
              echo "DATABASE_URL=${{ secrets.PROD_DATABASE_URL }}" >> $GITHUB_ENV
              ;;
          esac
      
      - name: Use configured variables
        run: |
          echo "Environment: $ENV_NAME"
          echo "Debug mode: $DEBUG"
          echo "Log level: $LOG_LEVEL"
          echo "Database configured: $([ -n "$DATABASE_URL" ] && echo "yes" || echo "no")"
```

#### Configuration from External Source
```yaml
jobs:
  external-config:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch configuration from external service
        env:
          CONFIG_SERVICE_TOKEN: ${{ secrets.CONFIG_SERVICE_TOKEN }}
        run: |
          # Fetch configuration from external service
          config=$(curl -H "Authorization: Bearer $CONFIG_SERVICE_TOKEN" \
                        https://config.example.com/api/config)
          
          # Parse and set environment variables
          echo "API_ENDPOINT=$(echo $config | jq -r '.api.endpoint')" >> $GITHUB_ENV
          echo "CACHE_TTL=$(echo $config | jq -r '.cache.ttl')" >> $GITHUB_ENV
          echo "FEATURE_FLAGS=$(echo $config | jq -r '.features | keys | join(",")')" >> $GITHUB_ENV
      
      - name: Use external configuration
        run: |
          echo "API Endpoint: $API_ENDPOINT"
          echo "Cache TTL: $CACHE_TTL"
          echo "Feature Flags: $FEATURE_FLAGS"
```

### 2. Secret Rotation and Management

#### Dynamic Secret Retrieval
```yaml
jobs:
  dynamic-secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Retrieve secrets from vault
        env:
          VAULT_TOKEN: ${{ secrets.VAULT_TOKEN }}
          VAULT_URL: ${{ secrets.VAULT_URL }}
        run: |
          # Retrieve secrets from HashiCorp Vault
          db_password=$(vault kv get -field=password secret/database)
          api_key=$(vault kv get -field=key secret/api)
          
          # Set as environment variables for subsequent steps
          echo "::add-mask::$db_password"
          echo "::add-mask::$api_key"
          echo "DATABASE_PASSWORD=$db_password" >> $GITHUB_ENV
          echo "API_KEY=$api_key" >> $GITHUB_ENV
      
      - name: Use retrieved secrets
        run: |
          echo "Database password length: ${#DATABASE_PASSWORD}"
          echo "API key length: ${#API_KEY}"
```

#### Secret Validation
```yaml
jobs:
  validate-secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Validate required secrets
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: |
          # Check if all required secrets are present
          missing_secrets=()
          
          [ -z "$DATABASE_URL" ] && missing_secrets+=("DATABASE_URL")
          [ -z "$API_KEY" ] && missing_secrets+=("API_KEY")
          [ -z "$DEPLOY_TOKEN" ] && missing_secrets+=("DEPLOY_TOKEN")
          
          if [ ${#missing_secrets[@]} -ne 0 ]; then
            echo "Missing required secrets: ${missing_secrets[*]}"
            exit 1
          fi
          
          echo "All required secrets are present"
      
      - name: Validate secret formats
        env:
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          # Validate API key format (example: should be 32 characters)
          if [ ${#API_KEY} -ne 32 ]; then
            echo "API key has invalid length: ${#API_KEY}"
            exit 1
          fi
          
          # Validate API key characters (example: should be alphanumeric)
          if [[ ! "$API_KEY" =~ ^[a-zA-Z0-9]+$ ]]; then
            echo "API key contains invalid characters"
            exit 1
          fi
          
          echo "API key format is valid"
```

### 3. Multi-Step Environment Building

#### Accumulating Environment Variables
```yaml
jobs:
  build-environment:
    runs-on: ubuntu-latest
    steps:
      - name: Set base variables
        run: |
          echo "NODE_ENV=production" >> $GITHUB_ENV
          echo "PORT=3000" >> $GITHUB_ENV
      
      - name: Add database configuration
        env:
          DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
        run: |
          echo "DATABASE_HOST=localhost" >> $GITHUB_ENV
          echo "DATABASE_PORT=5432" >> $GITHUB_ENV
          echo "DATABASE_NAME=myapp" >> $GITHUB_ENV
          echo "DATABASE_PASSWORD=$DATABASE_PASSWORD" >> $GITHUB_ENV
      
      - name: Add feature flags
        run: |
          echo "FEATURE_NEW_UI=true" >> $GITHUB_ENV
          echo "FEATURE_BETA_API=false" >> $GITHUB_ENV
      
      - name: Add computed variables
        run: |
          # Compute variables based on existing ones
          connection_string="postgresql://user:$DATABASE_PASSWORD@$DATABASE_HOST:$DATABASE_PORT/$DATABASE_NAME"
          echo "::add-mask::$connection_string"
          echo "DATABASE_URL=$connection_string" >> $GITHUB_ENV
      
      - name: Display final environment (safely)
        run: |
          echo "NODE_ENV: $NODE_ENV"
          echo "PORT: $PORT"
          echo "DATABASE_HOST: $DATABASE_HOST"
          echo "DATABASE_PORT: $DATABASE_PORT"
          echo "DATABASE_NAME: $DATABASE_NAME"
          echo "Database URL configured: $([ -n "$DATABASE_URL" ] && echo "yes" || echo "no")"
          echo "FEATURE_NEW_UI: $FEATURE_NEW_UI"
          echo "FEATURE_BETA_API: $FEATURE_BETA_API"
```

## Security Best Practices

### 1. Secret Masking

```yaml
jobs:
  secure-handling:
    runs-on: ubuntu-latest
    steps:
      - name: Handle secrets securely
        env:
          SECRET_VALUE: ${{ secrets.MY_SECRET }}
        run: |
          # Secrets are automatically masked, but you can add explicit masking
          echo "::add-mask::$SECRET_VALUE"
          
          # Never echo secrets directly
          # BAD: echo "Secret: $SECRET_VALUE"
          # GOOD: echo "Secret is configured"
          
          # Use secrets in commands without exposing them
          result=$(curl -H "Authorization: Bearer $SECRET_VALUE" https://api.example.com/test)
          echo "API call successful: $result"
```

### 2. Environment Variable Validation

```yaml
jobs:
  validate-environment:
    runs-on: ubuntu-latest
    env:
      API_ENDPOINT: ${{ vars.API_ENDPOINT }}
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
    steps:
      - name: Validate environment variables
        run: |
          # Validate required variables are set
          required_vars=("API_ENDPOINT" "DATABASE_URL")
          for var in "${required_vars[@]}"; do
            if [ -z "${!var}" ]; then
              echo "Required variable $var is not set"
              exit 1
            fi
          done
          
          # Validate URL formats
          if [[ ! "$API_ENDPOINT" =~ ^https?:// ]]; then
            echo "API_ENDPOINT must be a valid URL"
            exit 1
          fi
          
          echo "Environment validation passed"
```

### 3. Least Privilege Access

```yaml
jobs:
  limited-access:
    runs-on: ubuntu-latest
    # Use environment protection for sensitive operations
    environment: production
    steps:
      - name: Deploy with limited secrets
        env:
          # Only use secrets that are absolutely necessary
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          # Don't expose database admin credentials for deployment
        run: |
          # Use deployment-specific limited credentials
          deploy.sh --key="$DEPLOY_KEY"
```

### 4. Secret Scope Management

```yaml
name: Multi-Environment Deployment
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options: ['staging', 'production']

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - name: Deploy to selected environment
        env:
          # Secrets are automatically scoped to the selected environment
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          echo "Deploying to ${{ inputs.environment }}"
          deploy.sh --env="${{ inputs.environment }}"
```

## Common Patterns

### 1. Environment File Generation

```yaml
jobs:
  generate-env-file:
    runs-on: ubuntu-latest
    steps:
      - name: Create .env file
        env:
          DATABASE_PASSWORD: ${{ secrets.DATABASE_PASSWORD }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          cat > .env << EOF
          NODE_ENV=production
          PORT=3000
          DATABASE_HOST=localhost
          DATABASE_PORT=5432
          DATABASE_USER=myuser
          DATABASE_PASSWORD=$DATABASE_PASSWORD
          API_KEY=$API_KEY
          REDIS_URL=redis://localhost:6379
          LOG_LEVEL=info
          EOF
          
          # Secure the file
          chmod 600 .env
      
      - name: Upload environment file as artifact
        uses: actions/upload-artifact@v4
        with:
          name: environment-config
          path: .env
          retention-days: 1
```

### 2. Cross-Job Environment Sharing

```yaml
jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.detect.outputs.environment }}
      version: ${{ steps.version.outputs.version }}
    steps:
      - name: Detect environment
        id: detect
        run: |
          if [ "${{ github.ref }}" = "refs/heads/main" ]; then
            echo "environment=production" >> $GITHUB_OUTPUT
          else
            echo "environment=staging" >> $GITHUB_OUTPUT
          fi
      
      - name: Get version
        id: version
        run: |
          version="1.0.$(date +%s)"
          echo "version=$version" >> $GITHUB_OUTPUT

  build:
    needs: setup
    runs-on: ubuntu-latest
    env:
      TARGET_ENV: ${{ needs.setup.outputs.environment }}
      APP_VERSION: ${{ needs.setup.outputs.version }}
    steps:
      - name: Build for environment
        run: |
          echo "Building for $TARGET_ENV environment"
          echo "Version: $APP_VERSION"

  deploy:
    needs: [setup, build]
    runs-on: ubuntu-latest
    environment: ${{ needs.setup.outputs.environment }}
    env:
      DEPLOY_VERSION: ${{ needs.setup.outputs.version }}
    steps:
      - name: Deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          API_KEY: ${{ secrets.API_KEY }}
        run: |
          echo "Deploying version $DEPLOY_VERSION to ${{ needs.setup.outputs.environment }}"
          deploy.sh --version="$DEPLOY_VERSION"
```

## Troubleshooting

### Common Issues

1. **Secret not found**
   ```yaml
   steps:
     - name: Check secret availability
       env:
         MY_SECRET: ${{ secrets.MY_SECRET }}
       run: |
         if [ -z "$MY_SECRET" ]; then
           echo "Secret MY_SECRET is not configured"
           exit 1
         fi
         echo "Secret is available"
   ```

2. **Environment variable not persisting**
   ```yaml
   steps:
     - name: Set variable incorrectly (won't persist)
       run: export MY_VAR="value"  # This won't work
     
     - name: Set variable correctly (will persist)
       run: echo "MY_VAR=value" >> $GITHUB_ENV
     
     - name: Use persisted variable
       run: echo "MY_VAR is: $MY_VAR"
   ```

3. **Special characters in environment variables**
   ```yaml
   steps:
     - name: Handle special characters
       run: |
         # For values with special characters, use proper quoting
         complex_value="password with spaces and $pecial chars"
         echo "COMPLEX_VAR<<EOF" >> $GITHUB_ENV
         echo "$complex_value" >> $GITHUB_ENV
         echo "EOF" >> $GITHUB_ENV
   ```

Understanding environment variables and secrets enables you to build secure, configurable workflows that can adapt to different environments and securely manage sensitive information throughout your CI/CD pipelines.