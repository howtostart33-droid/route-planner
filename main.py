import React, { useState, useEffect } from 'react';

const RoutePlanner = () => {
  // Sample locations for demonstration
  const initialLocations = {
    'A': { name: 'Home', x: 100, y: 100 },
    'B': { name: 'Office', x: 300, y: 150 },
    'C': { name: 'Mall', x: 500, y: 100 },
    'D': { name: 'School', x: 200, y: 300 },
    'E': { name: 'Hospital', x: 400, y: 350 },
    'F': { name: 'Park', x: 350, y: 200 }
  };

  // Calculate distances between all locations
  const calculateDistances = (locations) => {
    const distances = {};
    Object.keys(locations).forEach(id1 => {
      distances[id1] = {};
      Object.keys(locations).forEach(id2 => {
        if (id1 !== id2) {
          const dx = locations[id1].x - locations[id2].x;
          const dy = locations[id1].y - locations[id2].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          distances[id1][id2] = Math.round(distance * 100) / 100;
        } else {
          distances[id1][id2] = 0;
        }
      });
    });
    return distances;
  };

  const [locations] = useState(initialLocations);
  const [distances] = useState(calculateDistances(initialLocations));
  const [start, setStart] = useState('A');
  const [end, setEnd] = useState('C');
  const [result, setResult] = useState(null);
  const [visualElement, setVisualElement] = useState(null);

  // Dijkstra's algorithm implementation
  const dijkstra = (startNode, endNode) => {
    const dist = {};
    const prev = {};
    const visited = {};
    
    Object.keys(locations).forEach(id => {
      dist[id] = Infinity;
      prev[id] = null;
      visited[id] = false;
    });
    
    dist[startNode] = 0;
    
    for (let i = 0; i < Object.keys(locations).length; i++) {
      let minDist = Infinity;
      let u = null;
      
      // Find unvisited node with smallest distance
      Object.keys(locations).forEach(id => {
        if (!visited[id] && dist[id] < minDist) {
          minDist = dist[id];
          u = id;
        }
      });
      
      if (u === null || u === endNode) break;
      
      visited[u] = true;
      
      // Update distances to adjacent nodes
      Object.keys(distances[u]).forEach(v => {
        if (!visited[v]) {
          const alt = dist[u] + distances[u][v];
          if (alt < dist[v]) {
            dist[v] = alt;
            prev[v] = u;
          }
        }
      });
    }
    
    // Reconstruct path
    const path = [];
    let u = endNode;
    while (prev[u] !== null) {
      path.unshift(u);
      u = prev[u];
    }
    path.unshift(startNode);
    
    return {
      path: path,
      distance: Math.round(dist[endNode] * 100) / 100,
      steps: getPathSteps(path)
    };
  };
  
  const getPathSteps = (path) => {
    const steps = [];
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i+1];
      const distance = distances[from][to];
      steps.push({
        from: locations[from].name,
        to: locations[to].name,
        distance: Math.round(distance * 100) / 100
      });
    }
    return steps;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const routeResult = dijkstra(start, end);
    setResult(routeResult);
    generateVisualRepresentation(routeResult);
  };
  
  const generateVisualRepresentation = (routeResult) => {
    const svgWidth = 600;
    const svgHeight = 500;
    
    const connections = [];
    Object.keys(distances).forEach(from => {
      Object.keys(distances[from]).forEach(to => {
        if (from !== to) {
          const loc1 = locations[from];
          const loc2 = locations[to];
          let color = '#cccccc';
          let width = 1;
          
          // Highlight path segments
          if (routeResult && routeResult.path.includes(from) && routeResult.path.includes(to)) {
            const index1 = routeResult.path.indexOf(from);
            const index2 = routeResult.path.indexOf(to);
            if (Math.abs(index1 - index2) === 1) {
              color = '#ff0000';
              width = 3;
            }
          }
          
          connections.push(
            <line 
              key={`${from}-${to}`} 
              x1={loc1.x} 
              y1={loc1.y} 
              x2={loc2.x} 
              y2={loc2.y} 
              stroke={color} 
              strokeWidth={width} 
            />
          );
        }
      });
    });
    
    const locationNodes = Object.keys(locations).map(id => {
      const loc = locations[id];
      let fill = '#3498db';
      let stroke = '#2980b9';
      
      // Highlight start and end points
      if (id === start) {
        fill = '#2ecc71';
        stroke = '#27ae60';
      }
      if (id === end) {
        fill = '#e74c3c';
        stroke = '#c0392b';
      }
      
      return (
        <g key={id}>
          <circle 
            cx={loc.x} 
            cy={loc.y} 
            r="20" 
            fill={fill} 
            stroke={stroke} 
            strokeWidth="2" 
          />
          <text 
            x={loc.x} 
            y={loc.y + 5} 
            textAnchor="middle" 
            fill="white" 
            fontFamily="Arial" 
            fontSize="12"
          >
            {loc.name}
          </text>
        </g>
      );
    });
    
    const svgElement = (
      <svg width={svgWidth} height={svgHeight} xmlns="http://www.w3.org/2000/svg">
        {connections}
        {locationNodes}
      </svg>
    );
    
    setVisualElement(svgElement);
  };
  
  // Generate initial visualization
  useEffect(() => {
    generateVisualRepresentation(null);
  }, []);
  
  return (
    <div className="container">
      <header>
        <h1>Smart Route Planner</h1>
        <p className="subtitle">Algorithm Presentation & Analysis</p>
      </header>
      
      <div className="content">
        <div className="panel">
          <h2 className="panel-title">Route Configuration</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="start">Start Location:</label>
              <select 
                name="start" 
                id="start" 
                value={start} 
                onChange={(e) => setStart(e.target.value)}
                required
              >
                {Object.keys(locations).map(id => (
                  <option key={id} value={id}>{locations[id].name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="end">Destination:</label>
              <select 
                name="end" 
                id="end" 
                value={end} 
                onChange={(e) => setEnd(e.target.value)}
                required
              >
                {Object.keys(locations).map(id => (
                  <option key={id} value={id}>{locations[id].name}</option>
                ))}
              </select>
            </div>
            
            <button type="submit">Calculate Optimal Route</button>
          </form>
          
          {result && (
            <div className="results">
              <h3>Optimal Path Found</h3>
              <p><strong>Total Distance:</strong> {result.distance} units</p>
              
              <h4>Step-by-step Journey:</h4>
              {result.steps.map((step, i) => (
                <div className="step" key={i}>
                  Step {i+1}: {step.from} → {step.to} 
                  ({step.distance} units)
                </div>
              ))}
            </div>
          )}
          
          <h3 className="panel-title">Distance Matrix</h3>
          <div className="matrix">
            <table>
              <thead>
                <tr>
                  <th></th>
                  {Object.keys(locations).map(id => (
                    <th key={id}>{locations[id].name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(distances).map(from => (
                  <tr key={from}>
                    <th>{locations[from].name}</th>
                    {Object.keys(distances[from]).map(to => (
                      <td key={to}>{distances[from][to]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="visualization">
          <h2 className="panel-title">Route Visualization</h2>
          {visualElement}
          
          <div className="legend">
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#3498db'}}></div>
              <span>Location</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#2ecc71'}}></div>
              <span>Start Point</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#e74c3c'}}></div>
              <span>Destination</span>
            </div>
            <div className="legend-item">
              <div style={{width: '30px', height: '4px', backgroundColor: '#ff0000'}}></div>
              <span>Optimal Path</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="panel" style={{marginTop: '30px'}}>
        <h2 className="panel-title">Algorithm Explanation</h2>
        <h3>Dijkstra's Shortest Path Algorithm</h3>
        <p>Dijkstra's algorithm finds the shortest paths between nodes in a graph, which in our case represents locations connected by roads.</p>
        
        <h4>How It Works:</h4>
        <ol>
          <li><strong>Initialization:</strong> Set the distance to the start node as 0 and all other nodes as infinity.</li>
          <li><strong>Selection:</strong> Select the unvisited node with the smallest known distance.</li>
          <li><strong>Relaxation:</strong> Update distance values for adjacent nodes if a shorter path is found.</li>
          <li><strong>Repeat:</strong> Mark the current node as visited and repeat until the destination node is reached.</li>
        </ol>
        
        <h4>Complexity Analysis:</h4>
        <ul>
          <li><strong>Time Complexity:</strong> O(V²) where V is the number of vertices (with simple implementation)</li>
          <li><strong>Space Complexity:</strong> O(V) for storing distances and previous nodes</li>
        </ul>
        
        <h4>Key Advantages:</h4>
        <ul>
          <li>Globally optimal solution for non-negative edge weights</li>
          <li>Systematic exploration of paths</li>
          <li>Widely used in navigation systems</li>
        </ul>
      </div>
    </div>
  );
};

export default RoutePlanner;
