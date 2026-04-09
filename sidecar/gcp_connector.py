from google.cloud import monitoring_v3
import time
import os

class GCPConnector:
    """
    Real-time telemetry connector for Google Cloud Monitoring.
    Fetches CPU and Memory metrics from Cloud Run or GKE.
    """
    def __init__(self, project_id=None):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID")
        self.client = monitoring_v3.MetricServiceClient()
        self.project_name = f"projects/{self.project_id}"

    def get_real_time_metrics(self):
        """
        Queries the last 1 minute of CPU utilization.
        """
        if not self.project_id:
            print("[Warning] No GCP_PROJECT_ID set. Returning simulated metrics.")
            return {"cpu": 0.5, "memory": 0.4, "latency": 12}

        now = time.time()
        seconds = int(now)
        nanos = int((now - seconds) * 10**9)
        interval = monitoring_v3.TimeInterval(
            {
                "end_time": {"seconds": seconds, "nanos": nanos},
                "start_time": {"seconds": seconds - 60, "nanos": nanos},
            }
        )

        # Example filter for Cloud Run CPU utilization
        results = self.client.list_time_series(
            request={
                "name": self.project_name,
                "filter": 'metric.type="run.googleapis.com/container/cpu/utilizations"',
                "interval": interval,
                "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            }
        )

        # Extract the most recent data point
        for result in results:
            if result.points:
                latest_point = result.points[0]
                return {
                    "cpu": latest_point.value.double_value,
                    "memory": 0.45, # Placeholder for memory metric
                    "latency": 15.0, # Placeholder for latency metric
                    "timestamp": latest_point.interval.end_time.seconds
                }
        
        return {"cpu": 0.0, "memory": 0.0, "latency": 0.0}

if __name__ == "__main__":
    connector = GCPConnector(project_id="your-project-id")
    metrics = connector.get_real_time_metrics()
    print(f"Real-time GCP Metrics: {metrics}")
