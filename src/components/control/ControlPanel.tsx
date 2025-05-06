import React from 'react';
import { Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react';
import { SimulationControls } from './SimulationControls';
import { SimulationButton } from './SimulationButton';
import { SimulationSettings } from '../../types/simulation';
import { Node } from '../../types/node';

interface ControlPanelProps {
  settings: SimulationSettings;
  onSettingsChange: (settings: SimulationSettings) => void;
  isRunning: boolean;
  onToggleSimulation: () => void;
  onReset: () => void;
  onInjectFault: () => void;
  selectedNode: Node | null;
}

export function ControlPanel({
  settings,
  onSettingsChange,
  isRunning,
  onToggleSimulation,
  onReset,
  onInjectFault,
  selectedNode,
}: ControlPanelProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Simulation Controls
      </h2>
      
      <div className="flex space-x-2 mb-6">
        <SimulationButton
          onClick={onToggleSimulation}
          icon={isRunning ? Pause : Play}
          label={isRunning ? 'Pause' : 'Start'}
          variant="primary"
        />
        
        <SimulationButton
          onClick={onReset}
          icon={RotateCcw}
          label="Reset"
          variant="secondary"
        />
        
        <SimulationButton
          onClick={onInjectFault}
          icon={AlertTriangle}
          label="Inject Fault"
          variant="danger"
          disabled={!selectedNode}
          title={!selectedNode ? 'Select a node to inject fault' : undefined}
        />
      </div>

      {selectedNode && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Selected: Node {selectedNode.id} ({selectedNode.status})
          </p>
        </div>
      )}

      <SimulationControls
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
    </div>
  );
}