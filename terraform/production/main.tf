terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
  }
}

data "external" "docker_host" {
  program = ["bash", "${path.module}/get_docker_host.sh"]
}

data "google_client_config" "default" {}

provider "docker" {
  host = data.external.docker_host.result.host
  registry_auth {
    address  = "us-central1-docker.pkg.dev"
    username = "oauth2accesstoken"
    password = data.google_client_config.default.access_token
  }
}

provider "google" {
  project = var.gcp_project_id
}

resource "google_project_service" "services" {
  project  = var.gcp_project_id
  for_each = toset([
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "firestore.googleapis.com",
  ])
  service = each.key
}

resource "google_artifact_registry_repository" "repo" {
  project       = var.gcp_project_id
  location      = "us-central1"
  repository_id = "bigid-agentic-app-repo"
  format        = "DOCKER"
  depends_on    = [google_project_service.services]
}

locals {
  # The timestamp function captures the current time when Terraform is executed,
  # providing a unique value for each run. This is useful for creating unique
  # resource names or tags, ensuring that each deployment is distinct.
  timestamp = formatdate("YYYY-MM-DD-hh-mm-ss", timestamp())
}

# Clean up old local Docker images to prevent storage issues
resource "null_resource" "cleanup_old_images" {
  triggers = {
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Cleaning up Docker build cache and old images..."
      
      # Clean up Docker build cache (this can grow exponentially)
      echo "Cleaning Docker build cache..."
      docker builder prune -af --filter "until=24h" || echo "No build cache to remove"
      
      # Remove dangling images (untagged)
      echo "Removing dangling images..."
      docker image prune -f || echo "No dangling images to remove"
      
      # List all local images for this project (sorted by creation time, oldest first)
      # Keep only the 3 most recent images, delete the rest
      REPO_PREFIX="us-central1-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.repo.repository_id}/bigid-agentic-app"
      
      # Get list of image IDs for this repo, sorted by creation date (oldest first)
      OLD_IMAGES=$(docker images "$REPO_PREFIX" --format "{{.ID}} {{.CreatedAt}}" | sort -k2 | head -n -3 | awk '{print $1}' || true)
      
      if [ ! -z "$OLD_IMAGES" ]; then
        echo "Removing old images (keeping latest 3):"
        echo "$OLD_IMAGES" | while read image_id; do
          if [ ! -z "$image_id" ]; then
            echo "Deleting image: $image_id"
            docker rmi -f "$image_id" || echo "Failed to delete $image_id, continuing..."
          fi
        done
        echo "Local cleanup completed!"
      else
        echo "No old local images to clean up (keeping latest 3)"
      fi
      
      # Show remaining disk usage
      echo "Docker disk usage after cleanup:"
      docker system df
    EOT
  }

  depends_on = [google_artifact_registry_repository.repo]
}

resource "docker_image" "app" {
  name         = "us-central1-docker.pkg.dev/${var.gcp_project_id}/${google_artifact_registry_repository.repo.repository_id}/bigid-agentic-app:${local.timestamp}"
  build {
    context    = "../.."
    dockerfile = "../../Dockerfile"
    platform   = "linux/amd64"
  }
  
  depends_on = [null_resource.cleanup_old_images]
}

resource "docker_registry_image" "app" {
  name = docker_image.app.name
}

resource "google_service_account" "default" {
  project      = var.gcp_project_id
  account_id   = "bigid-agentic-app-sa"
  display_name = "BigID Agentic App Service Account"
}

resource "google_project_iam_member" "default" {
  project = var.gcp_project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.default.email}"
}

resource "google_project_iam_member" "default2" {
  project = var.gcp_project_id
  role    = "roles/viewer"
  member  = "serviceAccount:${google_service_account.default.email}"
}

# Firestore database for token usage tracking
resource "google_firestore_database" "usage_database" {
  project     = var.gcp_project_id
  name        = "bigid-agentic-app-usage"
  location_id = "us-central1"
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.services]
}

# Grant the service account access to Firestore
resource "google_project_iam_member" "firestore_user" {
  project = var.gcp_project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.default.email}"
}

resource "google_cloud_run_v2_service" "default" {
  project  = var.gcp_project_id
  name     = "bigid-agentic-app"
  location = "us-central1"

  template {
    service_account = google_service_account.default.email
    containers {
      image = docker_registry_image.app.name
      
      resources {
        limits = {
          cpu    = "2"
          memory = "4Gi"
        }
      }
      
      env {
        name  = "STDIO_SAFE_HOSTNAMES"
        value = var.stdio_safe_hostnames
      }
      env {
        name  = "DAILY_TOKEN_LIMIT"
        value = tostring(var.daily_token_limit)
      }
      env {
        name  = "ENVIRONMENT_NAME"
        value = var.environment_name
      }
      env {
        name  = "HAS_AI_PERMISSION"
        value = "true"
      }
      env {
        name  = "FIRESTORE_DATABASE"
        value = google_firestore_database.usage_database.name
      }
    }
  }

  depends_on = [docker_registry_image.app, google_project_iam_member.default]
}

resource "google_cloud_run_v2_service_iam_binding" "default" {
  project  = google_cloud_run_v2_service.default.project
  location = google_cloud_run_v2_service.default.location
  name     = google_cloud_run_v2_service.default.name
  role     = "roles/run.invoker"
  members = [
    "allUsers",
  ]
}
