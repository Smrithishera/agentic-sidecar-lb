import streamlit as st
import pandas as pd
import numpy as np
import time
import json
import os
from datetime import datetime
import google.generativeai as genai

# Import existing logic from sidecar
from sidecar.chaos_gan import ChaosGAN

# --- Page Config ---
st.set_page_config(
    page_title="Agentic Load Balancer | Streamlit Edition",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- Custom CSS for Styling ---
st.markdown("""
    <style>
    .main {
        background-color: #0f172a;
        color: white;
    }
    .stMetric {
        background-color: rgba(255, 255, 255, 0.05);
        padding: 15px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .report-card {
        background-color: rgba(255, 255, 255, 0.03);
        padding: 20px;
        border-radius: 15px;
        border-left: 5px solid #3b82f6;
        margin-bottom: 15px;
    }
    .critical-card {
        border-left: 5px solid #ef4444;
    }
    </style>
    """, unsafe_allow_html=True)

# --- State Management ---
if 'history' not in st.session_state:
    st.session_state.history = pd.DataFrame(columns=['timestamp', 'cpu', 'memory', 'latency', 'reward'])
if 'reports' not in st.session_state:
    st.session_state.reports = []
if 'is_running' not in st.session_state:
    st.session_state.is_running = False

# --- Gemini SRE Logic ---
def generate_sre_report(incident_data):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {
            "summary": "SRE Report (Fallback): Massive anomaly detected.",
            "rootCause": "Adversarial entropy spike detected by Chaos GAN.",
            "resolution": "Automated throttling engaged."
        }
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Generate a professional SRE post-mortem for this incident data: {incident_data}. Format as JSON."
        response = model.generate_content(prompt)
        return json.loads(response.text.strip('```json').strip('```'))
    except:
        return {"summary": "Error generating AI report.", "rootCause": "N/A", "resolution": "N/A"}

# --- Sidebar Controls ---
st.sidebar.title("🤖 Control Plane")
scenario = st.sidebar.selectbox("Select Scenario", ["Normal", "DDoS Attack", "Flash Sale", "Chaos GAN"])
run_btn = st.sidebar.button("Start Simulation" if not st.session_state.is_running else "Stop Simulation")

if run_btn:
    st.session_state.is_running = not st.session_state.is_running

# --- Main Dashboard ---
st.title("🚀 Agentic Load Balancer")
st.caption("Autonomous Infrastructure Management with MARL & Chaos GAN")

tabs = st.tabs(["📊 Dashboard", "🚨 Post-Mortems", "📜 Live Logs", "🗺️ VANI Roadmap"])

with tabs[0]:
    col1, col2, col3, col4 = st.columns(4)
    
    # Simulation Loop
    if st.session_state.is_running:
        # Generate new data point
        cpu = 0.4 + np.random.normal(0, 0.05)
        mem = 0.3 + np.random.normal(0, 0.02)
        
        if scenario == "DDoS Attack":
            cpu += 0.4
            mem += 0.3
        elif scenario == "Chaos GAN":
            gan = ChaosGAN()
            chaos = gan.generate_chaos_scenario()
            cpu = chaos['cpu']
            mem = chaos['memory']

        latency = 12 + (cpu * 20)
        reward = 1.0 - (cpu * 0.5) - (latency / 100)
        
        new_row = {
            'timestamp': datetime.now(),
            'cpu': cpu,
            'memory': mem,
            'latency': latency,
            'reward': reward
        }
        st.session_state.history = pd.concat([st.session_state.history, pd.DataFrame([new_row])]).tail(50)
        
        # Incident detection
        if cpu > 0.85:
            report = generate_sre_report(new_row)
            st.session_state.reports.insert(0, {**report, "timestamp": datetime.now(), "priority": "HIGH"})

    # Metrics
    if not st.session_state.history.empty:
        latest = st.session_state.history.iloc[-1]
        col1.metric("CPU Utilization", f"{latest['cpu']*100:.1f}%", f"{latest['cpu']-0.5:.1f}%", delta_color="inverse")
        col2.metric("Memory Usage", f"{latest['memory']*100:.1f}%")
        col3.metric("P99 Latency", f"{latest['latency']:.1f}ms")
        col4.metric("Agent Reward", f"{latest['reward']:.2f}")

        # Charts
        st.subheader("Real-time Telemetry")
        st.line_chart(st.session_state.history.set_index('timestamp')[['cpu', 'memory', 'latency']])

with tabs[1]:
    st.subheader("Incident Post-Mortems")
    for r in st.session_state.reports:
        is_high = r.get('priority') == "HIGH"
        st.markdown(f"""
            <div class="report-card {'critical-card' if is_high else ''}">
                <h4 style="color: white;">{r.get('summary', 'Incident Report')}</h4>
                <p style="font-size: 0.8em; color: #94a3b8;">{r['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p><strong>Root Cause:</strong> {r.get('rootCause', 'N/A')}</p>
                <p><strong>Resolution:</strong> {r.get('resolution', 'N/A')}</p>
            </div>
        """, unsafe_allow_html=True)

with tabs[2]:
    st.subheader("System Logs")
    if not st.session_state.history.empty:
        st.table(st.session_state.history.tail(10))

with tabs[3]:
    st.subheader("VANI Rollout Strategy")
    st.info("Day 1-3: Shadow Mode | Day 4-7: Chaos Testing | Day 8-10: Production Enforcement")
    st.progress(40, text="Current Phase: Day 4 (Chaos GAN Stress Test)")

# Auto-refresh if running
if st.session_state.is_running:
    time.sleep(1)
    st.rerun()
