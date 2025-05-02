'use client';

import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Pause,
  CircleStop,
  RefreshCw,
  Settings,
  FastForward,
  Expand,
  ArrowBigDown,
  AlertCircle,
} from 'lucide-react';

/**
 * SimulationControls - UI for controlling the autonomous agent simulation
 *
 * Features:
 * - Start/pause/stop simulation
 * - Configure simulation parameters
 * - View simulation logs
 * - Monitor performance metrics
 * - Control simulation speed
 */
export default function SimulationControls({ onDataRefresh }: { onDataRefresh: () => void }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [simulationStatus, setSimulationStatus] = useState<string>('STOPPED');
  const [simulationLogs, setSimulationLogs] = useState<any[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<boolean>(false);
  const [expandedSettings, setExpandedSettings] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);

  // Configuration state
  const [config, setConfig] = useState<{
    agentCount: number;
    maxAgentsPerPhase: number;
    phaseDuration: number;
    personalityDistribution: Record<string, number>;
  }>({
    agentCount: 50,
    maxAgentsPerPhase: 20,
    phaseDuration: 60,
    personalityDistribution: {
      CONSERVATIVE: 20,
      MODERATE: 30,
      AGGRESSIVE: 20,
      TREND_FOLLOWER: 15,
      CONTRARIAN: 15,
    },
  });

  // Ensure all config values have defaults to prevent NaN errors
  useEffect(() => {
    setConfig((prev) => ({
      agentCount: prev.agentCount || 50,
      maxAgentsPerPhase: prev.maxAgentsPerPhase || 20,
      phaseDuration: prev.phaseDuration || 60,
      personalityDistribution: {
        CONSERVATIVE: prev.personalityDistribution?.CONSERVATIVE || 20,
        MODERATE: prev.personalityDistribution?.MODERATE || 30,
        AGGRESSIVE: prev.personalityDistribution?.AGGRESSIVE || 20,
        TREND_FOLLOWER: prev.personalityDistribution?.TREND_FOLLOWER || 15,
        CONTRARIAN: prev.personalityDistribution?.CONTRARIAN || 15,
      },
    }));
  }, []);

  // Update when config changes
  const handleConfigChange = (field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Update personality distribution
  const handlePersonalityChange = (personality: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      personalityDistribution: {
        ...prev.personalityDistribution,
        [personality]: value,
      },
    }));
  };

  // Normalize personality distribution to ensure it adds up to 100%
  const getNormalizedDistribution = () => {
    const distribution = config.personalityDistribution;
    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(distribution)) {
      normalized[key] = value / total;
    }

    return normalized;
  };

  // Get simulation status
  useEffect(() => {
    checkSimulationStatus();

    const interval = setInterval(() => {
      checkSimulationStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Check the current simulation status
  const checkSimulationStatus = async () => {
    try {
      const response = await fetch('/api/simulation');
      if (response.ok) {
        const data = await response.json();
        setSimulationStatus(data.status || 'UNKNOWN');
        setSimulationSpeed(data.simulationSpeed || 1);

        // Update logs if available
        if (data.logs && Array.isArray(data.logs)) {
          setSimulationLogs(data.logs);
        }
      }
    } catch (error) {
      console.error('Error checking simulation status:', error);
      addLog('error', 'Failed to check simulation status', error);
    }
  };

  // Add a log entry
  const addLog = (level: string, message: string, data: any = null) => {
    setSimulationLogs((prev) => [
      {
        timestamp: Date.now(),
        level,
        message,
        data,
      },
      ...prev.slice(0, 99), // Keep only the most recent 100 logs
    ]);
  };

  // Control the simulation (start, stop, pause)
  const controlSimulation = async (action: 'start' | 'stop' | 'pause' | 'resume' | 'setSpeed') => {
    try {
      setLoading(true);
      addLog('info', `Attempting to ${action} simulation`);

      let requestBody: any = { action };

      // Add configuration for start action
      if (action === 'start') {
        requestBody.config = {
          agentCount: config.agentCount,
          maxAgentsPerPhase: config.maxAgentsPerPhase,
          phaseDuration: config.phaseDuration * 1000, // Convert to milliseconds
          personalityDistribution: getNormalizedDistribution(),
          speed: simulationSpeed,
        };
      } else if (action === 'setSpeed') {
        requestBody.config = { speed: simulationSpeed };
      }

      const response = await fetch('/api/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.message) {
          addLog('info', data.message);
        }

        // Refresh simulation status and data
        await checkSimulationStatus();
        if (onDataRefresh) onDataRefresh();
      } else {
        const errorData = await response.json();
        addLog('error', `Failed to ${action} simulation: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error during ${action} operation:`, error);
      addLog('error', `Error during ${action} operation`, error);
    } finally {
      setLoading(false);
    }
  };

  // Handle speed change
  const handleSpeedChange = (_event: any, newValue: number | number[]) => {
    const speed = newValue as number;
    setSimulationSpeed(speed);
  };

  // Apply speed change to simulation
  const applySpeedChange = () => {
    controlSimulation('setSpeed');
  };

  // Format log timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get color for log level
  const getLogLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-black';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Get the appropriate action button based on simulation status
  const renderActionButton = () => {
    switch (simulationStatus) {
      case 'RUNNING':
        return (
          <>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 flex items-center gap-2 mr-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => controlSimulation('pause')}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <Pause className="w-4 h-4" />
              )}
              Pause
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 flex items-center gap-2 mr-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => controlSimulation('stop')}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <CircleStop className="w-4 h-4" />
              )}
              Stop
            </button>
          </>
        );
      case 'PAUSED':
        return (
          <>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 flex items-center gap-2 mr-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => controlSimulation('resume')}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Resume
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 flex items-center gap-2 mr-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => controlSimulation('stop')}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <CircleStop className="w-4 h-4" />
              )}
              Stop
            </button>
          </>
        );
      case 'STOPPED':
      case 'ERROR':
      default:
        return (
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 flex items-center gap-2 mr-2 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => controlSimulation('start')}
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <FastForward className="w-4 h-4" />
            )}
            Start Simulation
          </button>
        );
    }
  };

  // Get status chip
  const getStatusChip = () => {
    let bgColor: string;
    switch (simulationStatus) {
      case 'RUNNING':
        bgColor = 'bg-green-600';
        break;
      case 'PAUSED':
        bgColor = 'bg-yellow-600';
        break;
      case 'STOPPED':
      case 'ERROR':
        bgColor = 'bg-red-600';
        break;
      default:
        bgColor = 'bg-gray-600';
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${bgColor}`}>
        {simulationStatus}
      </span>
    );
  };

  return (
    <div className="w-full bg-gray-800 rounded-lg p-6 mb-6 text-gray-100">
      {/* Main controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-white">Simulation Status:</h2>
          {getStatusChip()}
        </div>
        <div className="flex items-center gap-2">
          {renderActionButton()}
          <button
            className="p-2 rounded-full bg-purple-900/30 text-purple-400 hover:bg-purple-800/30 transition-all"
            onClick={() => setExpandedSettings(!expandedSettings)}
            title="Simulation settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-full bg-purple-900/30 text-purple-400 hover:bg-purple-800/30 transition-all"
            onClick={() => setExpandedLogs(!expandedLogs)}
            title="View logs"
          >
            {expandedLogs ? <ArrowBigDown className="w-5 h-5" /> : <Expand className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Speed control */}
      <div className="mt-4 mb-4">
        <h3 className="text-sm text-gray-400 mb-2">Simulation Speed: {simulationSpeed}x</h3>
        <div className="flex items-center gap-3">
          <FastForward className="w-5 h-5 text-purple-400" />
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={simulationSpeed}
            onChange={(e) => handleSpeedChange(e, parseFloat(e.target.value))}
            onMouseUp={applySpeedChange}
            onTouchEnd={applySpeedChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>
      </div>

      {/* Configuration settings */}
      {expandedSettings && (
        <div className="mt-4">
          <hr className="border-gray-700 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-4">Simulation Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-400">Number of Agents</label>
              <input
                type="number"
                value={config.agentCount || 10}
                onChange={(e) => handleConfigChange('agentCount', parseInt(e.target.value) || 10)}
                min={10}
                max={5000}
                disabled={simulationStatus === 'RUNNING' || simulationStatus === 'PAUSED'}
                className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">Total agents to create (10-5000)</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">Active Agents Per Phase</label>
              <input
                type="number"
                value={config.maxAgentsPerPhase || 10}
                onChange={(e) => handleConfigChange('maxAgentsPerPhase', parseInt(e.target.value) || 10)}
                min={10}
                max={1000}
                disabled={simulationStatus === 'RUNNING' || simulationStatus === 'PAUSED'}
                className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">Agents processed per phase (10-1000)</p>
            </div>
            <div>
              <label className="text-xs text-gray-400">Phase Duration (seconds)</label>
              <input
                type="number"
                value={config.phaseDuration || 60}
                onChange={(e) => handleConfigChange('phaseDuration', parseInt(e.target.value) || 60)}
                min={5}
                max={120}
                disabled={simulationStatus === 'RUNNING' || simulationStatus === 'PAUSED'}
                className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-white text-sm disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">Time per simulation phase (5-120 seconds)</p>
            </div>
          </div>
          <h3 className="text-sm text-gray-400 mb-2">Agent Personality Distribution</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(config.personalityDistribution).map(([personality, value]) => (
              <div key={personality}>
                <p className="text-sm text-white">
                  {personality.charAt(0) + personality.slice(1).toLowerCase()}: {value}%
                </p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => handlePersonalityChange(personality, parseInt(e.target.value))}
                  disabled={simulationStatus === 'RUNNING' || simulationStatus === 'PAUSED'}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600 disabled:opacity-50"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs */}
      {expandedLogs && (
        <div className="mt-4">
          <hr className="border-gray-700 mb-4" />
          <h2 className="text-lg font-semibold text-white mb-4">Simulation Logs</h2>
          <div className="max-h-72 overflow-y-auto rounded-md bg-gray-900/50">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-400">Time</th>
                  <th className="px-4 py-2 text-left text-gray-400">Level</th>
                  <th className="px-4 py-2 text-left text-gray-400">Message</th>
                </tr>
              </thead>
              <tbody>
                {simulationLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-center text-gray-500">
                      No logs available
                    </td>
                  </tr>
                ) : (
                  simulationLogs.map((log, index) => (
                    <tr key={index} className="border-t border-gray-700">
                      <td className="px-4 py-2">{formatTimestamp(log.timestamp)}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getLogLevelColor(
                            log.level
                          )}`}
                        >
                          {log.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}