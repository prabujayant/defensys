import React from 'react';
import { Plus, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { NetworkButton } from './NetworkButton';

interface NetworkControlsProps {
  onAddNode: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export function NetworkControls({
  onAddNode,
  onZoomIn,
  onZoomOut,
  onFitView,
}: NetworkControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      <NetworkButton
        onClick={onAddNode}
        icon={Plus}
        label="Add Node"
        className="bg-green-600 hover:bg-green-700 text-white"
      />
      <NetworkButton
        onClick={onZoomIn}
        icon={ZoomIn}
        label="Zoom In"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      />
      <NetworkButton
        onClick={onZoomOut}
        icon={ZoomOut}
        label="Zoom Out"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      />
      <NetworkButton
        onClick={onFitView}
        icon={Maximize}
        label="Fit View"
        className="bg-blue-500 hover:bg-blue-600 text-white"
      />
    </div>
  );
}
