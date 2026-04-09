import torch
import torch.nn as nn
import numpy as np

class TrafficGenerator(nn.Module):
    """
    Generator: Creates adversarial request patterns (CPU, Mem, Intent, Latency)
    to stress-test the Agentic Load Balancer.
    """
    def __init__(self, input_dim=10, output_dim=4):
        super(TrafficGenerator, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, output_dim),
            nn.Sigmoid() # Output normalized [0, 1] for CPU, Mem, Priority, Latency
        )

    def forward(self, z):
        return self.net(z)

class TrafficDiscriminator(nn.Module):
    """
    Discriminator: Tries to distinguish between "Normal" traffic patterns
    and "Adversarial/Chaos" patterns.
    """
    def __init__(self, input_dim=4):
        super(TrafficDiscriminator, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.LeakyReLU(0.2),
            nn.Linear(32, 16),
            nn.LeakyReLU(0.2),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )

    def forward(self, x):
        return self.net(x)

class ChaosGAN:
    """
    Chaos Engineering GAN Orchestrator.
    Generates "Black Swan" events to find edge cases in the RL Agent's policy.
    """
    def __init__(self):
        self.generator = TrafficGenerator()
        self.discriminator = TrafficDiscriminator()
        
    def generate_chaos_scenario(self):
        """
        Produces a synthetic high-stress state vector.
        """
        z = torch.randn(1, 10)
        with torch.no_grad():
            chaos_state = self.generator(z).numpy()[0]
        
        return {
            "cpu": chaos_state[0],
            "memory": chaos_state[1],
            "priority": chaos_state[2],
            "latency": chaos_state[3] * 500 # Scale to ms
        }

if __name__ == "__main__":
    gan = ChaosGAN()
    scenario = gan.generate_chaos_scenario()
    print(f"[Chaos GAN] Generated Adversarial Scenario: {scenario}")
