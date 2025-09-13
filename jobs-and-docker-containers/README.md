# GitHub Actions - Jobs and Docker Containers

## Overview

Docker containers in GitHub Actions provide isolated, consistent environments for running jobs. This guide covers using pre-built Docker images, creating custom containers, managing container configurations, and advanced Docker patterns for CI/CD workflows.

## Running Jobs in Containers

### Basic Container Usage

```yaml
jobs:
  container-job:
    runs-on: ubuntu-latest
    container: node:18  # Use Node.js 18 container
    steps:
      - uses: actions/checkout@v4
      - name: Run Node.js commands
        run: |
          node --version
          npm --version
```

### Container with Specific Tag

```yaml
jobs:
  specific-version:
    runs-on: ubuntu-latest
    container: 
      image: node:18.17.0-alpine  # Specific version
    steps:
      - name: Check Node version
        run: node --version
```

### Container Configuration

```yaml
jobs:
  configured-container:
    runs-on: ubuntu-latest
    container:
      image: postgres:13
      env:
        POSTGRES_PASSWORD: password
        POSTGRES_DB: testdb
      ports:
        - 5432:5432
      volumes:
        - postgres_data:/var/lib/postgresql/data
      options: --health-cmd="pg_isready" --health-interval=10s --health-timeout=5s --health-retries=5
    steps:
      - name: Test database connection
        run: |
          apt-get update && apt-get install -y postgresql-client
          psql -h localhost -U postgres -d testdb -c "SELECT version();"
```

## Service Containers

Service containers run alongside your job container to provide dependencies like databases, caches, or message queues.

### Basic Service Container

```yaml
jobs:
  test-with-database:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - name: Install PostgreSQL client
        run: sudo apt-get update && sudo apt-get install -y postgresql-client
      - name: Test database connection
        run: psql -h localhost -U postgres -d testdb -c "SELECT 1;"
        env:
          PGPASSWORD: password
```

### Multiple Service Containers

```yaml
jobs:
  integration-test:
    runs-on: ubuntu-latest
    services:
      # Database service
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      # Redis cache service
      redis:
        image: redis:7
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      # Elasticsearch service
      elasticsearch:
        image: elasticsearch:8.8.0
        env:
          discovery.type: single-node
          xpack.security.enabled: false
        ports:
          - 9200:9200
        options: >-
          --health-cmd "curl -f http://localhost:9200/_cluster/health"
          --health-interval 30s
          --health-timeout 10s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Wait for services
        run: |
          # Wait for PostgreSQL
          until pg_isready -h localhost -p 5432; do sleep 1; done
          
          # Wait for Redis
          until redis-cli -h localhost -p 6379 ping; do sleep 1; done
          
          # Wait for Elasticsearch
          until curl -f http://localhost:9200/_cluster/health; do sleep 1; done
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:password@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
          ELASTICSEARCH_URL: http://localhost:9200
```

## Custom Docker Images

### Using Dockerfile in Repository

Create a custom Dockerfile for your specific needs:

```dockerfile
# .github/docker/Dockerfile
FROM node:18-alpine

# Install additional tools
RUN apk add --no-cache git curl postgresql-client

# Install global npm packages
RUN npm install -g @angular/cli

# Set working directory
WORKDIR /workspace

# Set default user
USER node
```

```yaml
jobs:
  custom-container:
    runs-on: ubuntu-latest
    container:
      image: .github/docker/Dockerfile
    steps:
      - uses: actions/checkout@v4
      - name: Use custom environment
        run: |
          node --version
          ng version
          psql --version
```

### Building Custom Image During Workflow

```yaml
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build custom Docker image
        run: |
          docker build -t my-custom-image:latest .
      
      - name: Run tests in custom container
        run: |
          docker run --rm \
            -v ${{ github.workspace }}:/workspace \
            -w /workspace \
            my-custom-image:latest \
            npm test
```

### Multi-Stage Docker Builds

```dockerfile
# Multi-stage Dockerfile
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
jobs:
  multi-stage-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build multi-stage image
        run: |
          docker build --target builder -t myapp:builder .
          docker build --target runtime -t myapp:runtime .
      
      - name: Test in builder stage
        run: |
          docker run --rm myapp:builder npm test
      
      - name: Run application
        run: |
          docker run -d --name myapp -p 3000:3000 myapp:runtime
          sleep 5
          curl http://localhost:3000/health
```

## Advanced Container Patterns

### 1. Matrix Builds with Different Images

```yaml
jobs:
  test-matrix:
    strategy:
      matrix:
        include:
          - name: "Node 16"
            container: "node:16"
            test-script: "npm test"
          - name: "Node 18"
            container: "node:18"
            test-script: "npm test"
          - name: "Node 20"
            container: "node:20"
            test-script: "npm test"
          - name: "Python 3.9"
            container: "python:3.9"
            test-script: "python -m pytest"
          - name: "Python 3.11"
            container: "python:3.11"
            test-script: "python -m pytest"
    
    runs-on: ubuntu-latest
    container: ${{ matrix.container }}
    name: Test on ${{ matrix.name }}
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: |
          if [[ "${{ matrix.container }}" == node* ]]; then
            npm ci
          elif [[ "${{ matrix.container }}" == python* ]]; then
            pip install -r requirements.txt
          fi
      
      - name: Run tests
        run: ${{ matrix.test-script }}
```

### 2. Database Migration in Container

```yaml
jobs:
  database-migration:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: myapp
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    container:
      image: node:18
      env:
        DATABASE_URL: postgresql://postgres:password@postgres:5432/myapp
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run database migrations
        run: npm run migrate
      
      - name: Seed database
        run: npm run seed
      
      - name: Run tests
        run: npm test
```

### 3. Container-to-Container Communication

```yaml
jobs:
  microservices-test:
    runs-on: ubuntu-latest
    services:
      database:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: password
          POSTGRES_DB: testdb
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      api-service:
        image: my-api:latest
        env:
          DATABASE_URL: postgresql://postgres:password@database:5432/testdb
        ports:
          - 3000:3000
        options: >-
          --health-cmd "curl -f http://localhost:3000/health"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 10
    
    container:
      image: node:18
      env:
        API_BASE_URL: http://api-service:3000
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run integration tests
        run: |
          npm ci
          npm run test:integration
```

## Docker Registry Integration

### Building and Pushing Images

```yaml
jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            myusername/myapp:latest
            myusername/myapp:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Multi-Platform Builds

```yaml
jobs:
  multi-platform-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push multi-platform
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
```

## Container Security

### Security Scanning

```yaml
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t myapp:latest .
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:latest'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### Secure Container Configuration

```yaml
jobs:
  secure-container:
    runs-on: ubuntu-latest
    container:
      image: node:18-alpine
      options: >-
        --user 1001:1001
        --read-only
        --tmpfs /tmp
        --tmpfs /var/tmp
        --security-opt no-new-privileges:true
        --cap-drop ALL
        --cap-add CHOWN
        --cap-add SETUID
        --cap-add SETGID
    steps:
      - uses: actions/checkout@v4
      - name: Run with restricted permissions
        run: |
          id
          npm ci --cache /tmp/.npm
          npm test
```

### Image Signing and Verification

```yaml
jobs:
  sign-and-verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Cosign
        uses: sigstore/cosign-installer@v3
      
      - name: Login to registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
      
      - name: Sign image with Cosign
        run: |
          cosign sign --yes ghcr.io/${{ github.repository }}:${{ github.sha }}
      
      - name: Verify image signature
        run: |
          cosign verify ghcr.io/${{ github.repository }}:${{ github.sha }}
```

## Performance Optimization

### 1. Layer Caching

```yaml
jobs:
  optimized-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Build with cache
        uses: docker/build-push-action@v5
        with:
          context: .
          tags: myapp:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            BUILDKIT_INLINE_CACHE=1
```

### 2. Dockerfile Optimization

```dockerfile
# Optimized Dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
# Copy only package files first for better caching
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

### 3. Parallel Container Operations

```yaml
jobs:
  parallel-containers:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [frontend, backend, worker]
    steps:
      - uses: actions/checkout@v4
      
      - name: Build ${{ matrix.service }}
        run: |
          docker build -t ${{ matrix.service }}:latest ./${{ matrix.service }}
      
      - name: Test ${{ matrix.service }}
        run: |
          docker run --rm ${{ matrix.service }}:latest npm test
```

## Best Practices

### 1. Container Image Management

```yaml
jobs:
  image-management:
    runs-on: ubuntu-latest
    steps:
      - name: Use specific image versions
        run: |
          # Good: Use specific versions
          docker run --rm node:18.17.0-alpine node --version
          
          # Avoid: Using 'latest' tag in production
          # docker run --rm node:latest node --version
      
      - name: Clean up unused images
        run: |
          docker image prune -f
          docker container prune -f
```

### 2. Environment Consistency

```yaml
jobs:
  consistent-environment:
    runs-on: ubuntu-latest
    container:
      image: node:18.17.0-alpine  # Pin exact version
      env:
        NODE_ENV: test
        TZ: UTC  # Set timezone explicitly
    steps:
      - name: Verify environment
        run: |
          echo "Node version: $(node --version)"
          echo "Timezone: $(date)"
          echo "Environment: $NODE_ENV"
```

### 3. Resource Management

```yaml
jobs:
  resource-managed:
    runs-on: ubuntu-latest
    container:
      image: node:18
      options: >-
        --memory=2g
        --cpus=2
        --ulimit nofile=65536:65536
    steps:
      - name: Check resources
        run: |
          echo "Memory limit: $(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)"
          echo "CPU count: $(nproc)"
```

## Troubleshooting

### Common Issues

1. **Container networking**
   ```yaml
   steps:
     - name: Debug container networking
       run: |
         # Check if service is accessible
         curl -f http://postgres:5432 || echo "PostgreSQL not accessible"
         nslookup postgres || echo "DNS resolution failed"
   ```

2. **Permission issues**
   ```yaml
   container:
     image: node:18
     options: --user root  # Temporary fix for permission issues
   steps:
     - name: Fix permissions
       run: |
         chown -R node:node /github/workspace
         su node -c "npm install"
   ```

3. **Volume mounting**
   ```yaml
   steps:
     - name: Debug volume mounts
       run: |
         ls -la /github/workspace
         mount | grep workspace
   ```

Understanding Docker containers in GitHub Actions enables you to create consistent, isolated, and scalable CI/CD environments that can handle complex application stacks and ensure reproducible builds across different environments.