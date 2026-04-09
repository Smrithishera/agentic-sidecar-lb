# Google Cloud Integration Guide: Agentic Load Balancer

This guide explains how to move from the simulation dashboard to a live production environment on Google Cloud.

## 1. IAM Permissions
The Sidecar Agent requires a Service Account with the following roles to fetch real-time telemetry and log its decisions:

*   **Monitoring Viewer** (`roles/monitoring.viewer`): To read CPU/Memory metrics.
*   **Logs Writer** (`roles/logging.logWriter`): To send agent decisions to Cloud Logging.
*   **Vertex AI User** (`roles/aiplatform.user`): If you decide to host the DistilBERT model on Vertex AI Endpoints instead of locally in the container.

## 2. Networking Flow (The "Google" Way)
To achieve <2ms latency, the communication follows this path:

1.  **Ingress**: Traffic hits the **Cloud Load Balancer**.
2.  **Proxy Interception**: The request reaches the **Envoy Proxy** inside your Pod/Container.
3.  **External Processing (ext_proc)**: Envoy uses the `ext_proc` filter to send the request headers/body to our **Python Sidecar** via gRPC on `localhost:50051`.
4.  **Inference**: The Sidecar runs the `IntentAnalyzer` (NLP) and `AgenticEnv` (RL).
5.  **Decision**: The Sidecar returns a "Route" or "Throttle" instruction to Envoy.
6.  **Execution**: Envoy forwards the request to the `main-app` or returns a `429 Too Many Requests` (Throttling).

## 3. Containerizing the Sidecar
Your `Dockerfile` for the sidecar should look like this:

```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY sidecar/ .
RUN pip install transformers torch gymnasium google-cloud-monitoring grpcio
# Start the gRPC server that wraps sidecar_agent.py
CMD ["python", "grpc_server.py"]
```

## 4. Connecting the Dashboard
To see real production data in the dashboard we built:
1.  Go to the **Secrets** panel in AI Studio.
2.  Add `GCP_PROJECT_ID` with your real project ID.
3.  The Node.js backend (`server.ts`) will automatically switch from `simulation` to `gcp` mode.
4.  The dashboard will start displaying the **actual CPU and Memory** of your Cloud Run/GKE service.

## 5. Performance Optimization
For the **Forward Deployed Engineer** role, emphasize these production tweaks:
*   **Shared Memory**: Use shared memory volumes if the request bodies are large.
*   **WASM Filters**: For even lower latency, port the `IntentAnalyzer` logic to a C++/Rust WASM filter that runs directly inside Envoy.
*   **VPC Service Controls**: Ensure the sidecar is within your VPC to avoid public internet latency when calling Cloud Monitoring.
