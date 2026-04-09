import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { MetricServiceClient } from '@google-cloud/monitoring';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // --- GCP Telemetry Logic ---
  const monitoringClient = new MetricServiceClient();
  const projectId = process.env.GCP_PROJECT_ID;
  
  // Initialize Gemini with better error handling
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  let model: any = null;

  if (apiKey && apiKey !== 'TODO' && apiKey.length > 10) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('Gemini AI initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize Gemini AI:', err);
    }
  } else {
    console.warn('GEMINI_API_KEY is missing or invalid. SRE reports will use fallback summaries.');
  }

  async function generateSREPostMortem(incidentData: any) {
    if (!model) {
      return { 
        summary: "SRE Report (Fallback): Massive anomaly detected in system telemetry.", 
        impact: "High load detected affecting routine operations.", 
        rootCause: "Adversarial entropy or unexpected traffic spike.", 
        trigger: "Threshold breach in CPU/Memory utilization.", 
        resolution: "Automated throttling engaged by MARL agent.", 
        lessonsLearned: "System requires tighter policy constraints for high-entropy states.", 
        actionItems: ["Review RL reward weights", "Increase throttling sensitivity"] 
      };
    }
    const prompt = `
      You are a Senior Site Reliability Engineer (SRE) at Google. 
      Generate a professional, detailed Post-Mortem report based on the following incident data:
      ${JSON.stringify(incidentData, null, 2)}

      The report MUST follow standard Google SRE post-mortem rules and include these sections:
      1. Executive Summary
      2. User Impact
      3. Root Cause
      4. Trigger
      5. Resolution
      6. Lessons Learned
      7. Action Items (to prevent recurrence)

      Format the output as a clean JSON object with these keys: 
      "summary", "impact", "rootCause", "trigger", "resolution", "lessonsLearned", "actionItems".
      Keep the tone professional and technical.
    `;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      // Extract JSON from the response (Gemini might wrap it in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { summary: "Failed to parse SRE report.", impact: "N/A", rootCause: "N/A", trigger: "N/A", resolution: "N/A", lessonsLearned: "N/A", actionItems: [] };
    } catch (error) {
      console.error("Gemini SRE Generation Error:", error);
      return { summary: "Error generating SRE report.", impact: "N/A", rootCause: "N/A", trigger: "N/A", resolution: "N/A", lessonsLearned: "N/A", actionItems: [] };
    }
  }

  app.get('/api/telemetry', async (req, res) => {
    if (!projectId || projectId === 'your-project-id') {
      // Fallback to simulated telemetry if not configured
      return res.json({
        source: 'simulation',
        cpu: 0.4 + Math.random() * 0.2,
        memory: 0.3 + Math.random() * 0.1,
        latency: 15 + Math.random() * 10,
        timestamp: Date.now()
      });
    }

    try {
      // Real GCP Monitoring Query (Example: Cloud Run CPU Utilization)
      const request = {
        name: monitoringClient.projectPath(projectId),
        filter: 'metric.type="run.googleapis.com/container/cpu/utilizations" AND resource.type="cloud_run_revision"',
        interval: {
          startTime: { seconds: Date.now() / 1000 - 60 },
          endTime: { seconds: Date.now() / 1000 },
        },
      };

      const [timeSeries] = await monitoringClient.listTimeSeries(request);
      
      // Simplify for the dashboard
      const latestValue = timeSeries[0]?.points[0]?.value?.doubleValue || 0.5;

      res.json({
        source: 'gcp',
        cpu: latestValue,
        memory: 0.4, // Mocked for brevity
        latency: 12,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('GCP Telemetry Error:', error);
      res.status(500).json({ error: 'Failed to fetch GCP telemetry' });
    }
  });

  // --- Incident & Report Logic ---
  let incidents: any[] = [];
  let reports: any[] = [];
  let lastDailyReport = 0;
  let lastThreeHourReport = Date.now();

  app.get('/api/reports', (req, res) => {
    res.json(reports);
  });

  app.post('/api/incidents', express.json(), async (req, res) => {
    const incident = { ...req.body, timestamp: Date.now() };
    incidents.push(incident);
    
    // Check if we need to generate a 3-hour "Massive" report
    const now = Date.now();
    const threeHours = 3 * 60 * 60 * 1000;
    const isHighPriority = incident.priority === 'high' || incident.severity === 'critical';

    if (isHighPriority && (now - lastThreeHourReport >= threeHours)) {
      const sreDetails = await generateSREPostMortem(incidents.slice(-10));
      const report = {
        id: `PM-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        type: 'CRITICAL_POST_MORTEM',
        timestamp: now,
        priority: 'HIGH',
        ...sreDetails
      };
      reports.unshift(report);
      lastThreeHourReport = now;
      incidents = []; // Reset for next window
    }
    
    res.json({ status: 'logged' });
  });

  // Daily cleanup and report generation (Simulated)
  setInterval(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - lastDailyReport >= oneDay) {
      generateSREPostMortem(incidents).then(sreDetails => {
        const report = {
          id: `DAILY-${new Date().toISOString().split('T')[0]}`,
          type: 'DAILY_SUMMARY',
          timestamp: now,
          priority: 'LOW',
          ...sreDetails
        };
        reports.unshift(report);
      });
      lastDailyReport = now;
      incidents = [];
    }
  }, 60000); // Check every minute

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (projectId) {
      console.log(`Connected to GCP Project: ${projectId}`);
    } else {
      console.log('Running in Simulation Mode (No GCP_PROJECT_ID found)');
    }
  });
}

startServer();
