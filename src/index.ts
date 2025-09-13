import express from 'express';
import cors from 'cors';
import { AnalysisPipelineWithDB } from './pipeline-with-db';
import { convexClient } from './convex-client';
import { api } from '../convex/_generated/api';

const app = express();
const port = process.env.PORT || 3000;
const pipeline = new AnalysisPipelineWithDB();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Analyze a package
app.post('/api/analyze', async (req, res) => {
  const { name, version } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Package name is required' });
  }

  try {
    console.log(`Received analysis request for ${name}@${version || 'latest'}`);
    
    // Start analysis
    const result = await pipeline.analyzePackage(name, version || 'latest');
    
    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed'
    });
  }
});

// Get package analysis from database
app.get('/api/package/:name', async (req, res) => {
  const { name } = req.params;
  
  try {
    const result = await convexClient.query(api.analysis.getPackageByName, {
      name
    });
    
    if (result) {
      res.json({
        success: true,
        result
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Package not found or not analyzed yet'
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// List recently analyzed packages
app.get('/api/packages/recent', async (req, res) => {
  try {
    const packages = await convexClient.query(api.packages.listPackages, {
      limit: 20
    });
    
    res.json({
      success: true,
      packages
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simple frontend
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>NodeWatch - NPM Package Security Scanner</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        input, button {
          padding: 10px;
          margin: 10px 5px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 16px;
        }
        input { width: 300px; }
        button {
          background: #007bff;
          color: white;
          cursor: pointer;
          padding: 10px 20px;
        }
        button:hover { background: #0056b3; }
        #results {
          margin-top: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 5px;
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          max-height: 500px;
          overflow-y: auto;
        }
        .loading { color: #007bff; }
        .error { color: #dc3545; }
        .safe { color: #28a745; }
        .low { color: #17a2b8; }
        .medium { color: #ffc107; }
        .high { color: #fd7e14; }
        .critical { color: #dc3545; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔍 NodeWatch</h1>
        <p>Analyze NPM packages for potential security risks</p>
        
        <div>
          <input type="text" id="packageName" placeholder="Enter package name (e.g., lodash)" />
          <input type="text" id="version" placeholder="Version (optional)" />
          <button onclick="analyzePackage()">Analyze</button>
        </div>
        
        <div id="results"></div>
      </div>

      <script>
        async function analyzePackage() {
          const packageName = document.getElementById('packageName').value;
          const version = document.getElementById('version').value;
          const resultsDiv = document.getElementById('results');
          
          if (!packageName) {
            resultsDiv.innerHTML = '<span class="error">Please enter a package name</span>';
            return;
          }
          
          resultsDiv.innerHTML = '<span class="loading">Analyzing ' + packageName + '...</span>';
          
          try {
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: packageName, version })
            });
            
            const data = await response.json();
            
            if (data.success) {
              const result = data.result;
              const riskClass = result.risk_level;
              
              resultsDiv.innerHTML = 
                '<h3>Analysis Results</h3>' +
                '<strong>Package:</strong> ' + result.package.name + '@' + result.package.version + '\\n' +
                '<strong>Risk Level:</strong> <span class="' + riskClass + '">' + result.risk_level.toUpperCase() + '</span>\\n' +
                '<strong>Score:</strong> ' + result.overall_score + '/100\\n\\n' +
                '<strong>Static Analysis:</strong>\\n' +
                JSON.stringify(result.static_analysis, null, 2) + '\\n\\n' +
                '<strong>AI Analysis:</strong>\\n' +
                JSON.stringify(result.llm_analysis, null, 2);
            } else {
              resultsDiv.innerHTML = '<span class="error">Error: ' + data.error + '</span>';
            }
          } catch (error) {
            resultsDiv.innerHTML = '<span class="error">Error: ' + error.message + '</span>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`NodeWatch server running at http://localhost:${port}`);
  console.log(`API endpoint: http://localhost:${port}/api/analyze`);
});

export default app;