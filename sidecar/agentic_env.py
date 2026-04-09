import gymnasium as gym
from gymnasium import spaces
import numpy as np
from gcp_connector import GCPConnector

class AgenticEnv(gym.Env):
    """
    Custom Gymnasium Environment for Agentic Load Balancing.
    State: [CPU_Load, Memory_Usage, Intent_Priority, Latency]
    Action: [Route_to_Srv1, Route_to_Srv2, Throttle]
    """
    def __init__(self, budget_limit=82000, use_real_telemetry=False):
        super(AgenticEnv, self).__init__()
        self.use_real_telemetry = use_real_telemetry
        self.gcp_connector = GCPConnector() if use_real_telemetry else None
        
        # Action space: 0: Srv1, 1: Srv2, 2: Throttle
        self.action_space = spaces.Discrete(3)
        
        # Observation space: [CPU (0-1), Mem (0-1), Priority (0-1), Latency (ms/1000)]
        self.observation_space = spaces.Box(
            low=0, high=1, shape=(4,), dtype=np.float32
        )
        
        self.budget_limit = budget_limit
        self.current_cost = 0
        self.state = np.zeros(4)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        if self.use_real_telemetry:
            metrics = self.gcp_connector.get_real_time_metrics()
            self.state = np.array([metrics["cpu"], metrics["memory"], 0.5, metrics["latency"]/1000]).astype(np.float32)
        else:
            self.state = np.random.uniform(0, 0.5, size=(4,)).astype(np.float32)
        self.current_cost = 0
        return self.state, {}

    def step(self, action, intent_priority=0.5):
        """
        Execute routing action and calculate reward.
        """
        if self.use_real_telemetry:
            metrics = self.gcp_connector.get_real_time_metrics()
            cpu, mem, latency = metrics["cpu"], metrics["memory"], metrics["latency"]
        else:
            cpu, mem, priority, latency = self.state
        
        # Simulate environment transition based on action
        if action == 2:  # Throttle
            new_latency = latency * 0.5
            throughput = 0.1
            cost_inc = 0
        else:
            new_latency = latency + (0.2 * cpu)
            throughput = 1.0
            cost_inc = 50  # Simulated cost per request
            
        self.current_cost += cost_inc
        
        # Reward Function Logic
        reward = self._calculate_reward(action, throughput, new_latency, intent_priority)
        
        # Update state
        if self.use_real_telemetry:
            metrics = self.gcp_connector.get_real_time_metrics()
            self.state = np.array([metrics["cpu"], metrics["memory"], intent_priority, metrics["latency"]/1000]).astype(np.float32)
        else:
            self.state = np.clip(
                self.state + np.random.normal(0, 0.05, size=(4,)), 0, 1
            ).astype(np.float32)
            self.state[2] = intent_priority
        
        terminated = False
        truncated = self.current_cost > self.budget_limit
        
        return self.state, reward, terminated, truncated, {"cost": self.current_cost}

    def _calculate_reward(self, action, throughput, latency, intent_priority):
        """
        Reward Logic:
        - Penalize high latency.
        - Penalize budget overruns (anomaly prevention).
        - Reward high throughput for 'Critical_Write' (high priority).
        """
        # 1. Latency Penalty (Exponential)
        latency_penalty = -np.exp(latency * 5)
        
        # 2. Budget Anomaly Prevention
        budget_penalty = -1000 if self.current_cost > self.budget_limit else 0
        
        # 3. Intent-based Throughput Reward
        # Reward is amplified by intent_priority (Critical_Write = 1.0)
        throughput_reward = throughput * intent_priority * 10
        
        # 4. Throttling Penalty for High Priority
        throttle_penalty = -50 if (action == 2 and intent_priority > 0.8) else 0
        
        return latency_penalty + budget_penalty + throughput_reward + throttle_penalty

if __name__ == "__main__":
    env = AgenticEnv()
    obs, _ = env.reset()
    for _ in range(5):
        action = env.action_space.sample()
        obs, reward, done, trunc, info = env.step(action, intent_priority=0.9)
        print(f"Action: {action}, Reward: {reward:.2f}, Cost: {info['cost']}")
