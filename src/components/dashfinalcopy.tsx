import React, { useState, useCallback, useEffect } from "react";
import { Header } from "./Header";
import { NetworkGraph } from "./network/NetworkGraph";
import { NotificationCenter } from "./notifications/NotificationCenter";
import { Node } from "../types/node";
import { mockNodes } from "../utils/mockData";
import { useNotifications } from "../hooks/useNotifications";
import { resetNodeCounter } from "../utils/nodeGenerator";

import axios from "axios";

export function Dashboard() {
  const [nodes, setNodes] = useState<Node[]>(mockNodes);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [logOutput, setLogOutput] = useState<string | null>(null);
  const { notifications, addNotification } = useNotifications();
  const [resourceUsage, setResourceUsage] = useState<string | null>(null); // Resource usage as string


  useEffect(() => {
    resetNodeCounter();
  }, []);

  const handleIconChange = (nodeId: string, newIcon: string) => {
    setNodes(nodes => nodes.map(node => 
      node.id === nodeId ? { ...node, icon: newIcon } : node
    ));
    addNotification("Node Icon Updated", `Node ${nodeId} icon changed to ${newIcon}`, "info");
  };

  // Function to fetch resource usage from the backend
  const fetchResourceUsage = async (node: Node) => {
    try {
      console.log("Fetching resource usage for Node:", node.id); // Debug log
      const resourceResponse = await axios.get(
        `http://localhost:4000/run-stat${node.id}`
      );
      console.log("Resource usage response:", resourceResponse.data); // Debug log

      // Update the state with the resource usage
      setResourceUsage(resourceResponse.data.output);
    } catch (error) {
      console.error("Error fetching resource usage:", error);
      setResourceUsage("Error fetching resource usage");
    }
  };

  const formatMemoryUsage = (memoryInBytes: number | undefined) => {
    if (typeof memoryInBytes !== 'number') return 'N/A';
    
    const mb = memoryInBytes / (1024 * 1024);
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`;
    }
    const gb = mb / 1024;
    return `${gb.toFixed(2)} GB`;
  };

  const fetchMetrics = async (node: Node) => {
    try {
      const response = await axios.get(
        `http://localhost:4000/run-stat${node.id}`
      );
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === node.id ? {
            ...n,
            metrics: {
              ...response.data,
              memory: formatMemoryUsage(response.data.memory)
            }
          } : n
        )
      );
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  const handleRename = useCallback((nodeId: string, newName: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId ? { ...node, name: newName } : node
      )
    );
    addNotification("Node Updated", `Node ${nodeId} renamed to ${newName}`, "success");
  }, [addNotification]);

  const handleReset = useCallback(() => {
    setNodes(mockNodes);
    setSelectedNode(null);
    resetNodeCounter();
    addNotification("Simulation Reset", "All nodes restored to initial state");
  }, [addNotification]);

  const handleNodeClick = async (node: Node) => {
    setSelectedNode(node);
    fetchResourceUsage(node);
    try {
      const [logResponse, metricsResponse] = await Promise.all([
        axios.get(`http://localhost:4000/run-log${node.id}`),
        axios.get(`http://localhost:4000/run-stat${node.id}`),
      ]);

      setLogOutput(logResponse.data.output);
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === node.id ? {
            ...n,
            metrics: {
              ...metricsResponse.data,
              memory: formatMemoryUsage(metricsResponse.data.memory)
            }
          } : n
        )
      );
    } catch (error) {
      console.error("Error fetching node data:", error);
      setLogOutput("Error fetching log output");
    }
  };

  const handleNodeReset = async (node: Node) => {
    setSelectedNode(node);
    addNotification("Node Reset", `Node ${node.id} has been reset.`);

    try {
      const response = await axios.get(`http://localhost:4000/run-reset${node.id}`);
      setLogOutput(response.data.output);
    } catch (error) {
      console.error("Error fetching log output:", error);
      setLogOutput("Error fetching log output");
    }
  };

  useEffect(() => {
    if (!selectedNode) return;

    const intervalId = setInterval(() => fetchMetrics(selectedNode), 5000);
    return () => clearInterval(intervalId);
  }, [selectedNode]);

  useEffect(() => {
    if (selectedNode && !nodes.some((node) => node.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [nodes, selectedNode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <NotificationCenter notifications={notifications} />
      <Header />
      <main className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-4 flex-col">
        <div className="flex gap-4 mb-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Reset Simulation
          </button>
          {selectedNode && (
            <button
              onClick={() => handleNodeReset(selectedNode)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Reset Node
            </button>
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex-grow flex items-center justify-center w-2/3 h-[60vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden text-white">
            <NetworkGraph
              nodes={nodes}
              onNodeClick={handleNodeClick}
              onRename={handleRename}
              onChangeIcon={handleIconChange}
              onAddNode={() => {}}
            />
          </div>

          {selectedNode && (
            <div className="w-1/3 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg overflow-y-auto max-h-[calc(100vh-100px)] text-white">
              <h2 className="text-xl font-bold mb-4">
                Node {selectedNode.id} Details
              </h2>
              <p>
                <strong>Status:</strong> {selectedNode.status}
              </p>
              <p>
                <strong>Container Metrics:</strong>
              </p>
              <ul className="list-disc list-inside">
                
                <li>Memory Usage: {resourceUsage || "Loading..."}</li>
                
              </ul>
              <hr className="my-4" />
              <h3 className="text-lg font-bold mb-2">Command Outputs</h3>
              <pre className="bg-gray-700 p-2 rounded text-sm overflow-x-auto">
                {logOutput || "No output available"}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}