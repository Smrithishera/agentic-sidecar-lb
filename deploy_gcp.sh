#!/bin/bash

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"
REPO_NAME="agentic-lb-repo"

echo "🚀 Starting Google Cloud Deployment for Agentic Load Balancer..."

# 1. Create Artifact Registry
gcloud artifacts repositories create $REPO_NAME \
    --repository-format=docker \
    --location=$REGION \
    --description="Repository for Agentic LB images"

# 2. Build and Push Dashboard
echo "📦 Building Dashboard..."
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/dashboard:latest .

# 3. Build and Push Sidecar
echo "📦 Building Sidecar..."
gcloud builds submit --tag $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/sidecar:latest -f Dockerfile.sidecar .

# 4. Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy agentic-load-balancer \
    --image $REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/dashboard:latest \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated

echo "✅ Deployment Complete!"
