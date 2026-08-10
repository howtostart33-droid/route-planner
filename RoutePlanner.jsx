import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RoutePlanner = () => {
  // Real locations for Dhaka city with coordinates
  const LOCATIONS = {
    "Savar":      [23.8583, 90.2667],
    "Gabtoli":    [23.7797, 90.3492],
    "Mirpur":     [23.8046, 90.3631],
    "Pallabi":    [23.8258, 90.3601],
    "Uttara":     [23.8742, 90.3846],
    "Airport":    [23.8433, 90.4079],
    "Banani":     [23.7936, 90.4043],
    "Gulshan":    [23.7917, 90.4167],
    "Mohakhali":  [23.7808, 90.4067],
    "Tejgaon":    [23.7644, 90.3931],
    "Farmgate":   [23.7581, 90.3897],
    "Dhanmondi":  [23.7461, 90.3742],
    "NewMarket":  [23.7331, 90.3844],
    "Motijheel":  [23.7268, 90.4216],
    "Paltan":     [23.7328, 90.4103],
    "Gulistan":   [23.7259, 90.4118],
    "Jatrabari":  [23.7104, 90.4335],
    "Demra":      [23.7133, 90.4667],
  };

  // Roads connecting locations: (place_a, place_b, distance_in_km)
  const ROADS = [
    ["Savar", "Gabtoli", 14.0],
    ["Gabtoli", "Mirpur", 6.0],
    ["Gabtoli", "Dhanmondi", 9.0],
    ["Mirpur", "Pallabi", 3.0],
    ["Pallabi", "Uttara", 7.0],
    ["Mirpur", "Farmgate", 8.0],
    ["Uttara", "Airport", 5.0],
    ["Airport", "Banani", 7.0],
    ["Banani", "Gulshan", 2.0],
    ["Banani", "Mohakhali", 3.0],
    ["Gulshan", "Mohakhali", 3.0],
    ["Mohakhali", "Tejgaon", 2.5],
    ["Tejgaon", "Farmgate", 2.0],
    ["Farmgate", "Dhanmondi", 3.0],
    ["Dhanmondi", "NewMarket", 2.0],
    ["NewMarket", "Motijheel", 5.0],
    ["Motijheel", "Paltan", 1.5],
    ["Paltan", "Gulistan", 1.0],
    ["Motijheel", "Gulistan", 1.5],
    ["Gulistan", "Jatrabari", 5.0],
    ["Jatrabari", "Demra", 6.0],
    ["Mohakhali", "Gulistan", 7.0]
  ];

  // Route themes
  const ROUTE_THEMES = {
    "Ocean Blue": {
      color: "#1D4ED8",
      weight: 6,
      dashArray: "10, 10",
      className: "ocean-blue"
    },
    "Sunset Glow": {
      color: "#EA580C",
      weight: 6,
      dashArray: "15, 5",
      className: "sunset-glow"
    },
    "Emerald Dream": {
      color: "#047857",
      weight: 6,
      dashArray: "5, 15",
      className: "emerald-dream"
    },
    "Royal Purple": {
      color: "#7E22CE",
      weight: 6,
      dashArray: "20, 10",
      className: "royal-purple"
    },
    "Fiery Red": {
      color: "#DC2626",
      weight: 6,
      dashArray: "8, 8",
      className: "fiery-red"
    },
    "Golden Trail": {
      color: "#D97706",
      weight: 6,
      dashArray: "12, 6",
      className: "golden-trail"
    }
  };

  // Calculate distances based on roads
  const calculateDistances = (roads) => {
    const distances = {};
    
    // Initialize all distances to infinity
    Object.keys(LOCATIONS).forEach(location => {
      distances[location] = {};
      Object.keys(LOCATIONS).forEach(otherLocation => {
        distances[location][otherLocation] = location === otherLocation ? 0 : Infinity;
      });
    });
    
    // Set direct road distances
    roads.forEach(([from, to, distance]) => {
      distances[from][to] = distance;
      distances[to][from] = distance; // Since roads are bidirectional
    });
    
    return distances;
  };

  const [distances] = useState(calculateDistances(ROADS));
  const [start, setStart] = useState('Savar');
  const [end, setEnd] = useState('Demra');
  const [result, setResult] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [routeTheme, setRouteTheme] = useState('Ocean Blue');
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef({});
  const routeLineRef = useRef(null);
  const animationRefs = useRef([]);

  // Dijkstra's algorithm implementation
  const dijkstra = (startNode, endNode) => {
    const dist = {};
    const prev = {};
    const visited = {};
    const explorationOrder = [];
    
    Object.keys(LOCATIONS).forEach(id => {
      dist[id] = Infinity;
      prev[id] = null;
      visited[id] = false;
    });
    
    dist[startNode] = 0;
    
    for (let i = 0; i < Object.keys(LOCATIONS).length; i++) {
      let minDist = Infinity;
      let u = null;
      
      // Find unvisited node with smallest distance
      Object.keys(LOCATIONS).forEach(id => {
        if (!visited[id] && dist[id] < minDist) {
          minDist = dist[id];
          u = id;
        }
      });
      
      if (u === null || u === endNode) {
        if (u === endNode) {
          explorationOrder.push(u);
        }
        break;
      }
      
      visited[u] = true;
      explorationOrder.push(u);
      
      // Update distances to adjacent nodes
      Object.keys(distances[u]).forEach(v => {
        if (!visited[v] && distances[u][v] !== Infinity) {
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
      steps: getPathSteps(path),
      explorationOrder: explorationOrder
    };
  };
  
  const getPathSteps = (path) => {
    const steps = [];
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i+1];
      const distance = distances[from][to];
      steps.push({
        from: from,
        to: to,
        distance: Math.round(distance * 100) / 100,
        fromId: from,
        toId: to
      });
    }
    return steps;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSelectedStep(null);
    
    // Simulate processing delay for better UX
    setTimeout(() => {
      const routeResult = dijkstra(start, end);
      setResult(routeResult);
      setIsLoading(false);
    }, 500);
  };
  
  const swapLocations = () => {
    const temp = start;
    setStart(end);
    setEnd(temp);
    setSelectedStep(null);
  };
  
  const centerRoute = () => {
    if (leafletMapRef.current && result) {
      const bounds = L.latLngBounds(
        result.path.map(id => LOCATIONS[id])
      );
      leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };
  
  // Initialize the map
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Create map centered on Dhaka with the previous theme
    const map = L.map(mapRef.current, {
      zoomControl: true,
      doubleClickZoom: true,
      scrollWheelZoom: true,
      dragging: true
    }).setView([23.8103, 90.4125], 12);
    leafletMapRef.current = map;
    
    // Add OpenStreetMap tiles with previous styling
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
      className: 'custom-tile-layer'
    }).addTo(map);
    
    // Add location markers
    Object.entries(LOCATIONS).forEach(([id, coords]) => {
      const marker = L.circleMarker(coords, {
        radius: 12,
        fillColor: "#9CA3AF", // light gray
        color: "#4B5563",
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);
      
      // Add label
      const label = L.marker(coords, {
        icon: L.divIcon({
          className: 'location-label',
          html: `<div class="label-content">${id}</div>`,
          iconSize: null,
          iconAnchor: [0, 0]
        })
      }).addTo(map);
      
      markersRef.current[id] = { marker, label };
    });
    
    // Add custom CSS for map tiles and route themes
    const style = document.createElement('style');
    style.innerHTML = `
      .custom-tile-layer {
        filter: brightness(0.9) contrast(1.1) saturate(1.2);
      }
      
      .leaflet-container {
        background: #1a1a2e;
      }
      
      .location-label {
        font-weight: bold;
        color: white;
        text-shadow: 1px 1px 2px black;
        font-size: 12px;
      }
      
      /* Route theme styles */
      .ocean-blue {
        filter: drop-shadow(0 0 5px #1D4ED8);
      }
      
      .sunset-glow {
        filter: drop-shadow(0 0 5px #EA580C);
        animation: pulse-orange 1.5s infinite alternate;
      }
      
      .emerald-dream {
        filter: drop-shadow(0 0 5px #047857);
        animation: shimmer-green 2s infinite linear;
      }
      
      .royal-purple {
        filter: drop-shadow(0 0 5px #7E22CE);
        animation: glow-purple 2s infinite alternate;
      }
      
      .fiery-red {
        filter: drop-shadow(0 0 5px #DC2626);
        animation: flicker-red 1s infinite alternate;
      }
      
      .golden-trail {
        filter: drop-shadow(0 0 5px #D97706);
        animation: shine-yellow 3s infinite linear;
      }
      
      @keyframes pulse-orange {
        0% { stroke-opacity: 0.7; }
        100% { stroke-opacity: 1; }
      }
      
      @keyframes shimmer-green {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: 20; }
      }
      
      @keyframes glow-purple {
        0% { filter: drop-shadow(0 0 5px #7E22CE); }
        100% { filter: drop-shadow(0 0 15px #7E22CE); }
      }
      
      @keyframes flicker-red {
        0% { opacity: 0.7; }
        50% { opacity: 1; }
        100% { opacity: 0.8; }
      }
      
      @keyframes shine-yellow {
        0% { stroke-dashoffset: 0; }
        100% { stroke-dashoffset: 30; }
      }
    `;
    document.head.appendChild(style);
    
    // Initial route calculation
    const routeResult = dijkstra(start, end);
    setResult(routeResult);
    
    // Cleanup function
    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
      map.remove();
    };
  }, []);
  
  // Update map when result or theme changes
  useEffect(() => {
    if (!leafletMapRef.current || !result) return;
    
    // Reset all markers to default
    Object.entries(markersRef.current).forEach(([id, { marker }]) => {
      marker.setStyle({
        fillColor: "#9CA3AF", // light gray
        color: "#4B5563"
      });
    });
    
    // Cancel any ongoing animations
    animationRefs.current.forEach(id => clearTimeout(id));
    animationRefs.current = [];
    
    // Animate exploration order
    let delay = 0;
    result.explorationOrder.forEach((id, index) => {
      const timeoutId = setTimeout(() => {
        if (markersRef.current[id]) {
          markersRef.current[id].marker.setStyle({
            fillColor: "#F59E0B", // amber
            color: "#D97706"
          });
        }
      }, delay);
      animationRefs.current.push(timeoutId);
      delay += 200; // 200ms between each highlight
    });
    
    // After exploration, draw the final route
    const routeTimeoutId = setTimeout(() => {
      // Highlight start and end points
      if (markersRef.current[start]) {
        markersRef.current[start].marker.setStyle({
          fillColor: "#0B8457", // green
          color: "#065F46"
        });
      }
      
      if (markersRef.current[end]) {
        markersRef.current[end].marker.setStyle({
          fillColor: "#FFFFFF", // white
          color: "#1F2937" // dark
        });
      }
      
      // Highlight path nodes
      result.path.forEach(id => {
        if (markersRef.current[id] && id !== start && id !== end) {
          markersRef.current[id].marker.setStyle({
            fillColor: "#1D4ED8", // blue
            color: "#1E40AF"
          });
        }
      });
      
      // Remove previous route line if exists
      if (routeLineRef.current) {
        leafletMapRef.current.removeLayer(routeLineRef.current);
      }
      
      // Draw new route line with selected theme
      const routeCoords = result.path.map(id => LOCATIONS[id]);
      const theme = ROUTE_THEMES[routeTheme];
      routeLineRef.current = L.polyline(routeCoords, {
        color: theme.color,
        weight: theme.weight,
        opacity: 0.8,
        dashArray: theme.dashArray,
        className: theme.className
      }).addTo(leafletMapRef.current);
      
      // Fit map to route bounds
      const bounds = L.latLngBounds(routeCoords);
      leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }, delay + 500);
    
    animationRefs.current.push(routeTimeoutId);
    
    // Cleanup function
    return () => {
      animationRefs.current.forEach(id => clearTimeout(id));
    };
  }, [result, start, end, routeTheme]);
  
  const handleStepClick = (step) => {
    setSelectedStep(step);
    if (leafletMapRef.current && markersRef.current[step.fromId]) {
      leafletMapRef.current.setView(LOCATIONS[step.fromId], 14);
    }
  };
  
  return (
    <div className="container">
      <header>
        <h1>Smart Route Planner</h1>
        <p className="subtitle">Dhaka City Navigation</p>
      </header>
      
      {/* Controls Panel */}
      <div className="controls-panel panel">
        <h2 className="panel-title">Route Configuration</h2>
        <form onSubmit={handleSubmit} className="route-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start">From:</label>
              <div className="input-with-icon">
                <span className="icon start-icon">📍</span>
                <select 
                  name="start" 
                  id="start" 
                  value={start} 
                  onChange={(e) => setStart(e.target.value)}
                  required
                >
                  {Object.keys(LOCATIONS).map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="swap-container">
              <button type="button" onClick={swapLocations} className="swap-btn">
                ⇄
              </button>
            </div>
            
            <div className="form-group">
              <label htmlFor="end">To:</label>
              <div className="input-with-icon">
                <span className="icon end-icon">🏁</span>
                <select 
                  name="end" 
                  id="end" 
                  value={end} 
                  onChange={(e) => setEnd(e.target.value)}
                  required
                >
                  {Object.keys(LOCATIONS).map(id => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="form-actions">
            <button type="submit" disabled={isLoading} className="find-route-btn">
              {isLoading ? (
                <span className="loading-text">
                  <span className="spinner-small"></span> Calculating...
                </span>
              ) : '🧭 Find Best Route'}
            </button>
          </div>
        </form>
        
        {/* Route Info Card */}
        {result && !isLoading && (
          <div className="route-summary">
            <div className="summary-header">
              <h3 className="summary-title">Route Summary</h3>
              <button 
                onClick={() => setShowMatrix(!showMatrix)} 
                className="toggle-details-btn"
              >
                {showMatrix ? 'Hide Details' : 'View Details'}
              </button>
            </div>
            
            <div className="summary-stats">
              <div className="stat-card">
                <div className="stat-icon">📏</div>
                <div className="stat-content">
                  <div className="stat-value">{result.distance} km</div>
                  <div className="stat-label">Distance</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-content">
                  <div className="stat-value">~{Math.round(result.distance * 2)} mins</div>
                  <div className="stat-label">Est. Time</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">📍</div>
                <div className="stat-content">
                  <div className="stat-value">{result.path.length}</div>
                  <div className="stat-label">Locations</div>
                </div>
              </div>
            </div>
            
            {showMatrix && (
              <div className="matrix-container">
                <h4 className="matrix-title">Distance Matrix (km)</h4>
                <div className="matrix-scroll">
                  <table className="distance-matrix">
                    <thead>
                      <tr>
                        <th></th>
                        {Object.keys(LOCATIONS).map(id => (
                          <th key={id} title={id}>
                            {id.length > 6 ? id.substring(0, 6) + '..' : id}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(distances).map(from => (
                        <tr key={from}>
                          <th title={from}>
                            {from.length > 6 ? from.substring(0, 6) + '..' : from}
                          </th>
                          {Object.keys(distances[from]).map(to => (
                            <td 
                              key={to} 
                              title={`${from} to ${to}`}
                              className={distances[from][to] === Infinity ? 'no-path' : ''}
                            >
                              {distances[from][to] === Infinity 
                                ? '∞' 
                                : distances[from][to].toFixed(1)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Main Visualization Area */}
      <div className="visualization-area">
        <div className="visualization-header">
          <h2 className="panel-title">Route Visualization</h2>
          <div className="viz-controls">
            <div className="theme-selector">
              <label htmlFor="route-theme">Route Theme:</label>
              <select 
                id="route-theme" 
                value={routeTheme} 
                onChange={(e) => setRouteTheme(e.target.value)}
                className="theme-select"
              >
                {Object.keys(ROUTE_THEMES).map(theme => (
                  <option key={theme} value={theme}>{theme}</option>
                ))}
              </select>
            </div>
            <button onClick={centerRoute} className="control-btn">
              Center Route
            </button>
          </div>
        </div>
        
        <div 
          ref={mapRef} 
          className="map-container"
          style={{ height: '500px', width: '100%' }}
        ></div>
        
        {/* Legend */}
        <div className="legend">
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#0B8457'}}></div>
            <span>Start Point</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#FFFFFF', border: '1px solid #1F2937'}}></div>
            <span>Destination</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#1D4ED8'}}></div>
            <span>Route Path</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{backgroundColor: '#F59E0B'}}></div>
            <span>Explored Nodes</span>
          </div>
        </div>
      </div>
      
      {/* Step-by-step Guidance */}
      {result && !isLoading && (
        <div className="steps-panel panel">
          <h3 className="panel-title">Navigation Steps</h3>
          <div className="steps-container">
            <ol className="steps-list">
              {result.steps.map((step, i) => (
                <li 
                  key={i} 
                  className={`step-item ${selectedStep === step ? 'selected' : ''}`}
                  onClick={() => handleStepClick(step)}
                >
                  <div className="step-number">{i + 1}</div>
                  <div className="step-content">
                    <div className="step-text">
                      Head from <strong>{step.from}</strong> to <strong>{step.to}</strong>
                    </div>
                    <div className="step-distance">{step.distance} km</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
      
      {/* Algorithm Explanation */}
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
      
      {/* System Comparison */}
      <div className="panel" style={{marginTop: '30px'}}>
        <h2 className="panel-title">System Comparison</h2>
        <div className="comparison-table">
          <table>
            <thead>
              <tr>
                <th>System</th>
                <th>Strengths</th>
                <th>Limitations</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Google Maps</strong></td>
                <td>• Excellent UI/UX<br/>• Real-time traffic data<br/>• Multiple transport modes<br/>• Street view integration</td>
                <td>• Not fully customizable<br/>• Requires internet connection<br/>• Resource intensive<br/>• Privacy concerns</td>
              </tr>
              <tr>
                <td><strong>Waze</strong></td>
                <td>• Community-driven updates<br/>• Real-time traffic info<br/>• Accident reporting<br/>• Fuel price tracking</td>
                <td>• Heavy on battery usage<br/>• Requires constant data connection<br/>• Can be distracting<br/>• Limited to driving</td>
              </tr>
              <tr>
                <td><strong>Our App</strong></td>
                <td>• Focused on shortest path optimization<br/>• Lightweight and fast<br/>• Works offline<br/>• Minimal resource usage<br/>• Customizable for local needs<br/>• Educational focus</td>
                <td>• Limited to predefined routes<br/>• No real-time traffic data<br/>• Basic UI compared to competitors<br/>• Limited geographic coverage</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner
