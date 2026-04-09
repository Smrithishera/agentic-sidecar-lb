# 10 Steps to Production: Agentic Load Balancer

Follow these steps to deploy and integrate the system into Google Cloud.

### Step 1: Configure GCP Project
*   Create a new Google Cloud Project or select an existing one.
*   Enable the following APIs:
    *   Cloud Monitoring API
    *   Cloud Logging API
    *   Artifact Registry API
    *   Cloud Run API (or GKE API)

### Step 2: Set Up AI Studio Secrets
*   In the AI Studio **Secrets** panel, add:
    *   `GCP_PROJECT_ID`: Your real Google Cloud Project ID.
    *   `GEMINI_API_KEY`: (Already handled by AI Studio).

### Step 3: Verify Local Simulation
*   Click **"Start Simulation"** in the dashboard.
*   Trigger different scenarios (DDoS, Flash Sale) to ensure the RL agent's reward logic is behaving as expected.
*   Check the **Benchmark** tab to confirm the 20x latency improvement.

### Step 4: Containerize the Components
*   **Sidecar Agent**: Create `Dockerfile.sidecar`
    ```dockerfile
    FROM python:3.9-slim
    WORKDIR /app
    COPY sidecar/ .
    RUN pip install gymnasium transformers torch numpy google-cloud-monitoring grpcio
    CMD ["python", "sidecar_agent.py"]
    ```
*   **Control Plane (Dashboard)**: Create `Dockerfile.dashboard`
    ```dockerfile
    FROM node:20-slim
    WORKDIR /app
    COPY package*.json ./
    RUN npm install
    COPY . .
    RUN npm run build
    EXPOSE 3000
    CMD ["npm", "run", "dev"]
    ```
*   Build and push both images to **Google Artifact Registry**.

### Step 5: Configure IAM Permissions
*   Create a Service Account for the Sidecar.
*   Assign the `roles/monitoring.viewer` and `roles/logging.logWriter` roles.
*   Download the JSON key (for local testing) or use **Workload Identity** (for GKE/Cloud Run).

### Step 6: Deploy to Cloud Run (Multi-Container)
*   Use the `service.yaml` (Cloud Run Multi-container definition) to deploy.
*   This setup ensures the **Dashboard**, **Sidecar**, and **Chaos GAN** all run in the same service.
*   **CRITICAL**: Ensure `GEMINI_API_KEY` is passed to the Dashboard container for SRE report generation.

### Step 7: Integrate with Envoy/Proxy
*   If using GKE, deploy the `deployment/gke-manifest.yaml`.
*   Configure Envoy to send headers to `localhost:50051` (the Sidecar) for admission control.

### Step 8: Enable "Cloud Mode" in Dashboard
*   In the dashboard header, toggle **"CLOUD: LIVE"**.
*   The dashboard will now pull real CPU/Memory metrics from your Cloud Run service via the `server.ts` backend.

### Step 9: Run Shadow Mode (VANI Day 3-5)
*   Let the agent run in "Observation Mode" for 48 hours.
*   Review the **Live Logs** tab to see what decisions the agent *would* have made.
*   Adjust the `AgenticEnv` reward weights if you see any potential budget anomalies.

### Step 10: Full Production Rollout
*   Switch the Proxy from "Shadow" to "Enforce".
*   Monitor the **Performance Matrix** in the dashboard to ensure latency remains sub-2ms and rewards are positive.
