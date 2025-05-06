import React, { useCallback, useEffect, useRef, useState } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import Cytoscape from "cytoscape";
import { Node } from "../../types/node";
import { networkStyles } from "./styles";
import icon1 from "../../assets/icons/icon-1.png";
import icon2 from "../../assets/icons/icon-2.png";
import icon3 from "../../assets/icons/icon-3.png";

const icons = [icon1, icon2, icon3];

interface NetworkGraphProps {
  nodes: Node[];
  onNodeClick: (node: Node) => void;
  onAddNode: () => void;
  onRename: (nodeId: string, newName: string) => void;
  onChangeIcon: (nodeId: string, newIcon: number) => void;
}

export function NetworkGraph({
  nodes,
  onNodeClick,
  onAddNode,
  onRename,
  onChangeIcon,
}: NetworkGraphProps) {
  const cyRef = useRef<Cytoscape.Core | null>(null);

  const elements = React.useMemo(() => {
    if (!nodes?.length) return [];

    const nodeElements = nodes.map((node) => {
      const iconIndex = typeof node.icon === "number" ? node.icon : 0;

      return {
        data: {
          id: node.id.toString(),
          label: node.name || `Node ${node.id}`,
          node,
          icon: icons[iconIndex] || icons[0],
        },
        position:
          node.id.toString() === "4"
            ? { x: 300, y: 300 }
            : node.id.toString() === "1"
            ? { x: 300, y: 150 }
            : node.id.toString() === "2"
            ? { x: 450, y: 375 }
            : { x: 150, y: 375 },
      };
    });

    const edges = [
      { source: "1", target: "4" },
      { source: "2", target: "4" },
      { source: "3", target: "4" },
      { source: "4", target: "1" },
      { source: "4", target: "2" },
      { source: "4", target: "3" },
    ].map(({ source, target }) => ({
      data: {
        id: `${source}-${target}`,
        source: source.toString(),
        target: target.toString(),
      },
    }));

    return [...nodeElements, ...edges];
  }, [nodes]);

  const handleNodeClick = useCallback(
    (event: Cytoscape.EventObject) => {
      const node = event.target.data("node");
      if (node) onNodeClick(node);
    },
    [onNodeClick]
  );

  const handleContextMenu = useCallback(
    (event: Cytoscape.EventObject) => {
      event.preventDefault();
      const node = event.target.data("node");
      if (node) {
        const newName = prompt("Enter new name:", node.name || `Node ${node.id}`);
        if (newName) onRename(node.id, newName);

        const newIcon = prompt("Enter new icon (0, 1, 2):", node.icon?.toString() || "0");
        const newIconIndex = parseInt(newIcon || "0", 10);
        if (!isNaN(newIconIndex)) onChangeIcon(node.id, newIconIndex);
      }
    },
    [onRename, onChangeIcon]
  );

  const fitWithPadding = (cy: Cytoscape.Core) => {
    const paddingX = cy.width() * 0.2;
    const paddingY = cy.height() * 0.2;
    const padding = Math.max(paddingX, paddingY);
    cy.fit(cy.nodes(), padding);
  };

  const initCytoscape = useCallback(
    (cy: Cytoscape.Core) => {
      if (!cy) return;
      cyRef.current = cy;
      cy.removeAllListeners();
      cy.on("tap", "node", handleNodeClick);
      cy.on("cxttap", "node", handleContextMenu);
      fitWithPadding(cy);
    },
    [handleNodeClick, handleContextMenu]
  );

  const handleZoomIn = () => {
    const cy = cyRef.current;
    if (cy) {
      const newZoom = Math.min(cy.zoom() * 1.2, 2);
      cy.zoom({
        level: newZoom,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
      });
    }
  };

  const handleZoomOut = () => {
    const cy = cyRef.current;
    if (cy) {
      const newZoom = Math.max(cy.zoom() * 0.8, 0.1);
      cy.zoom({
        level: newZoom,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
      });
    }
  };

  const handleFitView = () => {
    const cy = cyRef.current;
    if (cy) {
      fitWithPadding(cy);
    }
  };

  useEffect(() => {
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  if (!nodes?.length) {
    return (
      <div className="w-full h-[600px] bg-white dark:bg-gray-900 rounded-xl shadow-md flex items-center justify-center">
        <p className="text-gray-500">No nodes available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[580px] bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleZoomIn}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md shadow transition"
        >
          Zoom In
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md shadow transition"
        >
          Zoom Out
        </button>
        <button
          onClick={handleFitView}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md shadow transition"
        >
          Fit View
        </button>
        <button
          onClick={onAddNode}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md shadow transition"
        >
          + Add Node
        </button>
      </div>

      <CytoscapeComponent
        elements={elements}
        cy={initCytoscape}
        className="w-full h-full"
        stylesheet={[
          ...networkStyles,
          {
            selector: "node",
            style: {
              width: 40,
              height: 40,
              "background-color": "#3b82f6",
              label: "data(label)",
              color: "#fff",
              "font-size": 10,
              "text-valign": "center",
              "text-halign": "center",
              "background-fit": "cover",
              "background-image": "data(icon)",
              "border-color": "#fff",
              "border-width": 2,
            },
          },
          {
            selector: "node[id = '4']",
            style: {
              width: 48,
              height: 48,
              "background-color": "#1d4ed8",
              "border-width": 3,
              "border-color": "#fff",
            },
          },
          {
            selector: "edge",
            style: {
              width: 2.5,
              "line-color": "#60a5fa",
              "target-arrow-color": "#60a5fa",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "arrow-scale": 1.2,
            },
          },
        ]}
      />
    </div>
  );
}
