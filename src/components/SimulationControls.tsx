'use client';

import { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Settings,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Users,
  Clock,
  Layers,
  Zap,
  Activity,
  TrendingUp,
  MessageSquare,
  Brain,
} from 'lucide-react';

interface LogEntry {
  timestamp: number;
  level: 'error' | 'warning' | 'info';
  message: string;
  data?: any;
}

type LogLevel = 'error' | 'warning' | 'info';

interface SimulationPhase {
  name: string;
  status: 'pending' | 'active' | 'completed';
  icon: any;
}

export default function SimulationControls({ onDataRefresh }: { onDataRefresh: () => void }) {
  const [loading, setLoading] = useState<boolean>(false);
  const [simulationStatus, setSimulationStatus] = useState<string>('STOPPED');
  const [simulationLogs, setSimulationLogs] = useState<LogEntry[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<boolean>(false);
  const [expandedSettings, setExpandedSettings] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [currentPhase, setCurrentPhase] = useState<string>('');
  const [phases, setPhases] = useState<SimulationPhase[]>([]);

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

  const phaseIcons: Record<string, any> = {
    'MARKET_ANALYSIS': TrendingUp,
    'SOCIAL': MessageSquare,
    'DECISION': Brain,
    'EXECUTION': Activity,
  };

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

  const handleConfigChange = (field: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePersonalityChange = (personality: string, value: number) => {
    setConfig((prev) => ({
      ...prev,
      personalityDistribution: {
        ...prev.personalityDistribution,
        [personality]: value,
      },
    }));
  };

  const getNormalizedDistribution = () => {
    const distribution = config.personalityDistribution;
    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(distribution)) {
      normalized[key] = value / total;
    }

    return normalized;
  };

  useEffect(() => {
    checkSimulationStatus();
    const interval = setInterval(() => {
      checkSimulationStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const checkSimulationStatus = async () => {
    try {
      const response = await fetch('/api/simulation');
      if (response.ok) {
        const data = await response.json();
        setSimulationStatus(data.status || 'UNKNOWN');
        setSimulationSpeed(data.simulationSpeed || 1);
        setCurrentPhase(data.currentPhase || '');
        
        // Set phases with status
        if (data.phases && Array.isArray(data.phases)) {
          setPhases(data.phases);
        }

        if (data.logs && Array.isArray(data.logs)) {
          setSimulationLogs(data.logs);
        }
      }
    } catch (error) {
      console.error('Error checking simulation status:', error);
      addLog('error', 'Failed to check simulation status', error);
    }
  };

  const addLog = (level: LogLevel, message: string, data: any = null) => {
    setSimulationLogs((prev) => [
      {
        timestamp: Date.now(),
        level,
        message,
        data,
      },
      ...prev.slice(0, 99),
    ]);
  };

  const controlSimulation = async (action: 'start' | 'stop' | 'pause' | 'resume' | 'setSpeed') => {
    try {
      setLoading(true);
      addLog('info', `Attempting to ${action} simulation`);

      let requestBody: any = { action };

      if (action === 'start') {
        requestBody.config = {
          agentCount: config.agentCount,
          maxAgentsPerPhase: config.maxAgentsPerPhase,
          phaseDuration: config.phaseDuration * 1000,
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

  const applySpeedChange = async () => {
    await controlSimulation('setSpeed');
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatPhaseName = (name: string) => {
    return name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusConfig = () => {
    switch (simulationStatus) {
      case 'RUNNING':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          icon: CheckCircle2,
        };
      case 'PAUSED':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          icon: AlertCircle,
        };
      case 'STOPPED':
      case 'ERROR':
        return {
          bg: 'bg-rose-500/10',
          border: 'border-rose-500/30',
          text: 'text-rose-400',
          icon: XCircle,
        };
      default:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/30',
          text: 'text-gray-400',
          icon: AlertCircle,
        };
    }
  };

  const getLogLevelConfig = (level: string): { bg: string; text: string; border: string } => {
    const levelLower = level.toLowerCase() as LogLevel;
    const configs: Record<LogLevel, { bg: string; text: string; border: string }> = {
      error: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
      warning: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
      info: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' }
    };
    
    return configs[levelLower] || configs.info;
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      {/* Header Section */}
      <div className="p-5 border-b border-neutral-800">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          {/* Status Badge */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${statusConfig.bg} border ${statusConfig.border}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.text}`} />
              <span className={`text-xs font-semibold ${statusConfig.text} uppercase tracking-wider`}>
                {simulationStatus}
              </span>
            </div>

            {/* Current Phase */}
            {currentPhase && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400">
                  {formatPhaseName(currentPhase)}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {simulationStatus === 'RUNNING' && (
              <>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => controlSimulation('pause')}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Pause className="w-3.5 h-3.5" />
                  )}
                  Pause
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => controlSimulation('stop')}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  Stop
                </button>
              </>
            )}

            {simulationStatus === 'PAUSED' && (
              <>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => controlSimulation('resume')}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  Resume
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => controlSimulation('stop')}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  Stop
                </button>
              </>
            )}

            {(simulationStatus === 'STOPPED' || simulationStatus === 'ERROR') && (
              <button
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-white text-black hover:bg-gray-200 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => controlSimulation('start')}
                disabled={loading}
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                Start Simulation
              </button>
            )}
          </div>
        </div>

        {/* Phase Progress Indicators */}
        {phases.length > 0 && (
          <div className="flex items-center gap-2">
            {phases.map((phase, index) => {
              const PhaseIcon = phaseIcons[phase.name] || Activity;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    phase.status === 'completed'
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                      : phase.status === 'active'
                      ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                      : 'bg-neutral-800 border border-neutral-700 text-gray-500'
                  }`}
                >
                  <PhaseIcon className="w-3 h-3" />
                  <span>{formatPhaseName(phase.name)}</span>
                  {phase.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Speed Control Section */}
      <div className="p-5 bg-neutral-900/50 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm text-gray-300 font-medium">Speed</h3>
          </div>
          <div className="px-3 py-1 bg-neutral-800 rounded-lg border border-neutral-700">
            <span className="text-lg font-bold text-white">{simulationSpeed}</span>
            <span className="text-sm text-gray-400 ml-0.5">x</span>
          </div>
        </div>
        
        <div className="relative">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(parseInt(e.target.value))}
            onMouseUp={applySpeedChange}
            onTouchEnd={applySpeedChange}
            className="w-full h-2 bg-neutral-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neutral-700 [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-neutral-700 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:active:cursor-grabbing"
          />
          
          <div className="relative mt-3">
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4, 5].map((speed) => (
                <div key={speed} className="flex flex-col items-center">
                  <div className={`w-1.5 h-1.5 rounded-full mb-1.5 transition-all ${simulationSpeed === speed ? 'bg-white scale-125' : 'bg-gray-600'}`}></div>
                  <span className={`text-xs font-medium transition-colors ${simulationSpeed === speed ? 'text-white' : 'text-gray-500'}`}>
                    {speed}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          Drag slider to adjust simulation speed (1x - 5x)<br/>
        
        </p>
      </div>

      {/* Settings Toggle */}
      <button
        onClick={() => setExpandedSettings(!expandedSettings)}
        className="w-full p-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors border-b border-neutral-800"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Advanced Settings</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedSettings ? 'rotate-180' : ''}`} />
      </button>

      {/* Configuration Settings */}
      {expandedSettings && (
        <div className="p-5 bg-black/20 space-y-6 border-b border-neutral-800">
          <div>
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Simulation Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: 'Total Agents', field: 'agentCount', min: 10, max: 5000, icon: Users },
                { label: 'Active/Phase', field: 'maxAgentsPerPhase', min: 10, max: 1000, icon: Layers },
                { label: 'Phase Time', field: 'phaseDuration', min: 5, max: 120, icon: Clock, suffix: 's' }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.field} className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-3.5 h-3.5 text-gray-400" />
                      <label className="text-xs text-gray-300 font-medium">{item.label}</label>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={config[item.field as keyof typeof config] as number || item.min}
                        onChange={(e) => handleConfigChange(item.field, parseInt(e.target.value) || item.min)}
                        min={item.min}
                        max={item.max}
                        disabled={simulationStatus === 'RUNNING' || simulationStatus === 'PAUSED'}
                        className="w-full p-2 pr-8 bg-black/50 border border-neutral-700 rounded text-white text-base font-semibold disabled:opacity-50 focus:outline-none focus:border-neutral-500 transition-colors"
                      />
                      {item.suffix && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                          {item.suffix}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">{item.min}-{item.max}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Agent Personalities</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(config.personalityDistribution).map(([personality, value]) => (
                <div key={personality} className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs text-gray-300 font-medium capitalize">
                      {personality.toLowerCase().replace('_', ' ')}
                    </span>
                    <span className="text-base font-bold text-white">{value}<span className="text-xs text-gray-400">%</span></span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handlePersonalityChange(personality, parseInt(e.target.value))}
                    disabled={simulationStatus === 'RUNNING' || simulationStatus === 'PAUSED'}
                    className="w-full h-1.5 bg-neutral-700 rounded-full appearance-none cursor-pointer disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logs Toggle */}
      <button
        onClick={() => setExpandedLogs(!expandedLogs)}
        className="w-full p-4 flex items-center justify-between hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
          <span className="text-sm font-medium text-gray-300">System Logs</span>
          <span className="text-xs text-gray-500">({simulationLogs.length})</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedLogs ? 'rotate-180' : ''}`} />
      </button>

      {/* Logs Section */}
      {expandedLogs && (
        <div className="max-h-72 overflow-y-auto border-t border-neutral-800">
          {simulationLogs.length === 0 ? (
            <div className="p-10 text-center">
              <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No logs available</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {simulationLogs.map((log, index) => {
                const levelConfig = getLogLevelConfig(log.level);

                return (
                  <div key={index} className="p-3 hover:bg-neutral-800/30 transition-colors">
                    <div className="flex items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${levelConfig.bg} ${levelConfig.text} border ${levelConfig.border} shrink-0`}>
                        {log.level.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-300">{log.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(log.timestamp)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
