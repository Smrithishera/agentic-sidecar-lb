import time
import random
from intent_analyzer import IntentAnalyzer
from agentic_env import AgenticEnv

class SidecarAgent:
    """
    Main Agentic Sidecar integrating NLP and RL.
    """
    def __init__(self):
        self.analyzer = IntentAnalyzer()
        self.env = AgenticEnv()
        self.obs, _ = self.env.reset()
        
    def process_request(self, request_body: str):
        """
        Sidecar request lifecycle:
        1. NLP Intent Analysis
        2. RL State Update
        3. Action Selection (Routing/Throttling)
        4. Execution
        """
        # 1. NLP Sensor
        analysis = self.analyzer.analyze(request_body)
        intent = analysis["intent"]
        priority = analysis["priority"]
        
        # 2. RL Action Selection (Simplified: Random for boilerplate)
        # In production, this would use a trained PPO or Q-Learning model.
        action = self.env.action_space.sample()
        
        # 3. Step Environment
        new_obs, reward, terminated, truncated, info = self.env.step(action, intent_priority=priority)
        
        # 4. Routing Logic
        routing_map = {0: "SRV_1", 1: "SRV_2", 2: "THROTTLE"}
        route = routing_map[action]
        
        return {
            "intent": intent,
            "route": route,
            "reward": reward,
            "latency_ms": analysis["inference_latency_ms"],
            "budget_cost": info["cost"]
        }

if __name__ == "__main__":
    agent = SidecarAgent()
    requests = [
        "POST /api/v1/transaction { 'amount': 5000, 'type': 'urgent' }",
        "GET /api/v1/health",
        "POST /api/v1/batch_upload { 'data': [...] }"
    ]
    
    for req in requests:
        res = agent.process_request(req)
        print(f"Request: {req[:30]}... -> Route: {res['route']} (Intent: {res['intent']})")
        print(f"  Reward: {res['reward']:.2f}, Inference Latency: {res['latency_ms']:.2f}ms")
