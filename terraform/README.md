# Terraform Multi-Environment Setup

This directory contains separate Terraform configurations for different environments. Each environment is completely isolated with its own state, resources, and configuration.

## Directory Structure

```
terraform/
├── production/          # Production environment
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── get_docker_host.sh
│   └── terraform.tfvars.example
├── dev/                 # Development environment
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── get_docker_host.sh
│   └── terraform.tfvars.example
└── README.md           # This file
```

## Environment Isolation

Each environment creates completely separate resources:

### Production Environment
- **Cloud Run Service**: `bigid-agentic-app` (existing resources preserved)
- **Service Account**: `bigid-agentic-app-sa` (existing resources preserved)
- **Artifact Registry**: `bigid-agentic-app-repo` (existing resources preserved)
- **Default Token Limit**: 12,000,000 tokens/day

### Dev Environment
- **Cloud Run Service**: `bigid-agentic-app-dev`
- **Service Account**: `bigid-agentic-app-sa-dev`
- **Artifact Registry**: `bigid-agentic-app-repo-dev`
- **Default Token Limit**: 5,000,000 tokens/day

## Deployment Instructions

### Initial Setup (for both environments)

1. Navigate to the environment directory:
   ```bash
   # For production
   cd terraform/production
   
   # OR for dev
   cd terraform/dev
   ```

2. Copy the example tfvars file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. Edit `terraform.tfvars` with your values:
   ```bash
   # Required values
   gcp_project_id = "your-gcp-project-id"
   
   # Optional values (adjust as needed)
   daily_token_limit = 12000000  # or 5000000 for dev
   stdio_safe_hostnames = "*.aws.env.fyi"
   ```

4. Initialize Terraform:
   ```bash
   terraform init
   ```

### Deploying Changes

1. Navigate to the environment directory:
   ```bash
   cd terraform/production  # or terraform/dev
   ```

2. Review the planned changes:
   ```bash
   terraform plan
   ```

3. Apply the changes:
   ```bash
   terraform apply
   ```

4. Get the service URL:
   ```bash
   terraform output service_url
   ```

### Destroying Resources

To destroy an environment (be careful!):

```bash
cd terraform/production  # or terraform/dev
terraform destroy
```

## State Management

Each environment maintains its own Terraform state file:
- `terraform/production/terraform.tfstate`
- `terraform/dev/terraform.tfstate`

**IMPORTANT**: 
- Never commit `terraform.tfstate` or `terraform.tfvars` to version control
- Consider using [remote state backends](https://www.terraform.io/language/settings/backends) for team environments
- Each environment's state is completely separate - changes to one won't affect the other

## Adding Remote State (Recommended for Teams)

To use GCS for remote state, add this to the beginning of `main.tf` in each environment:

```hcl
terraform {
  backend "gcs" {
    bucket = "your-terraform-state-bucket"
    prefix = "terraform/state/production"  # or "dev" for dev environment
  }
}
```

Then run:
```bash
terraform init -migrate-state
```

## Best Practices

1. **Always test in dev first**: Deploy and test changes in the dev environment before applying to production
2. **Review plans carefully**: Always run `terraform plan` before `terraform apply`
4. **Tag resources**: Consider adding tags to resources for better organization and cost tracking
5. **Document changes**: Keep track of what changes are made and why

## Switching Between Environments

When working with multiple environments, always ensure you're in the correct directory:

```bash
# Check current directory
pwd

# Should show one of:
# /path/to/mcpapp/terraform/production
# /path/to/mcpapp/terraform/dev
```

## Troubleshooting

### Error: "resource already exists"
This usually means resources with the same name exist. Since each environment uses different names, this shouldn't happen unless you manually created resources.

### Error: "Authentication failed"
Ensure you're authenticated with GCP:
```bash
gcloud auth application-default login
```

### State Lock Issues
If Terraform state is locked, you may need to manually unlock it:
```bash
terraform force-unlock <lock-id>
```

## Additional Resources

- [Terraform GCP Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
