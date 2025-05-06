import React from 'react';
import { SimulationSettings } from '../../types/simulation';
import { SettingsSlider } from './SettingsSlider';

interface SimulationControlsProps {
  settings: SimulationSettings;
  onSettingsChange: (settings: SimulationSettings) => void;
}

export function SimulationControls({ settings, onSettingsChange }: SimulationControlsProps) {
  const handleChange = (name: string, value: number) => {
    onSettingsChange({
      ...settings,
      [name]: value,
    });
  };

  return (
    <div className="space-y-4">
      <SettingsSlider
        label="Node Threshold"
        name="nodeThreshold"
        value={settings.nodeThreshold}
        min={0}
        max={1}
        step={0.1}
        onChange={handleChange}
      />
      
      <SettingsSlider
        label="Recovery Timeout"
        name="recoveryTimeout"
        value={settings.recoveryTimeout}
        min={1000}
        max={10000}
        step={1000}
        unit="ms"
        onChange={handleChange}
      />
      
      <SettingsSlider
        label="Fault Injection Rate"
        name="faultInjectionRate"
        value={settings.faultInjectionRate}
        min={0}
        max={1}
        step={0.1}
        onChange={handleChange}
      />
    </div>
  );
}