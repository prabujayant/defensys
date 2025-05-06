import React, { useState, useCallback, useEffect } from "react";
import { Header } from "./Header";
import { NetworkGraph } from "./network/NetworkGraph";
import { Node } from "../types/node";
import { mockNodes } from "../utils/mockData";
import { resetNodeCounter } from "../utils/nodeGenerator";
import axios from "axios";

export function Dashboard() {
  const [nodes, setNodes] = useState<Node[]>(mockNodes);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [logOutput, setLogOutput] = useState<string | null>(null);
  const [resourceUsage, setResourceUsage] = useState<string | null>(null);

  // Store seen MAC addresses per node for real-time detection
  const [seenMacs, setSeenMacs] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    resetNodeCounter();
  }, []);

  const handleIconChange = (nodeId: string, newIcon: string) => {
    setNodes(nodes =>
      nodes.map(node => (node.id === nodeId ? { ...node, icon: newIcon } : node))
    );
  };

  const fetchResourceUsage = async (node: Node) => {
    try {
      const resourceResponse = await axios.get(
        `http://localhost:4000/run-stat${node.id}`
      );
      setResourceUsage(resourceResponse.data.output);
    } catch (error) {
      console.error("Error fetching resource usage:", error);
      setResourceUsage("Error fetching resource usage");
      updateNodeStatus(node.id, "healthy");
    }
  };

  const formatMemoryUsage = (memoryInBytes: number | undefined) => {
    if (typeof memoryInBytes !== 'number') return 'N/A';
    const mb = memoryInBytes / (1024 * 1024);
    return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
  };

  const updateNodeStatus = (nodeId: string, status: string) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? { ...node, status } : node
      )
    );
  };

  const fetchMetrics = async (node: Node) => {
    try {
      const response = await axios.get(`http://localhost:4000/run-stat${node.id}`);
      setNodes((prevNodes) =>
        prevNodes.map(n =>
          n.id === node.id
            ? {
                ...n,
                metrics: {
                  ...response.data,
                  memory: formatMemoryUsage(response.data.memory)
                }
              }
            : n
        )
      );
    } catch (error) {
      console.error("Error fetching metrics:", error);
      updateNodeStatus(node.id, "healthy");
    }
  };

  const handleRename = useCallback((nodeId: string, newName: string) => {
    setNodes(nodes =>
      nodes.map(node => (node.id === nodeId ? { ...node, name: newName } : node))
    );
  }, []);

  const handleReset = useCallback(() => {
    setNodes(mockNodes);
    setSelectedNode(null);
    resetNodeCounter();
  }, []);

  const extractMacAddresses = (text: string): string[] => {
    const macRegex = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/g;
    return text.match(macRegex) || [];
  };

  const handleNodeClick = async (node: Node) => {
    setSelectedNode(node);
    fetchResourceUsage(node);

    try {
      const logResponse = await axios.get(`http://localhost:4000/run-log${node.id}`);
      const output = logResponse.data.output;
      setLogOutput(output);

      const detectedMacs = extractMacAddresses(output);
      const currentSeenMacs = seenMacs[node.id] || new Set<string>();
      let isInfected = false;

      for (const mac of detectedMacs) {
        const normalizedMac = mac.toUpperCase();
        if (!currentSeenMacs.has(normalizedMac)) {
          isInfected = true;
          currentSeenMacs.add(normalizedMac);
        }
      }

      setSeenMacs(prev => ({
        ...prev,
        [node.id]: currentSeenMacs
      }));

      const newStatus = isInfected ? "infected" : "healthy";

      setNodes((prevNodes) =>
        prevNodes.map(n =>
          n.id === node.id
            ? {
                ...n,
                status: newStatus,
                metrics: {
                  ...n.metrics,
                  memory: formatMemoryUsage(n.metrics.memory)
                }
              }
            : n
        )
      );

    } catch (error) {
      console.error("Error fetching node data:", error);
      setLogOutput("Error fetching log output");
      updateNodeStatus(node.id, "healthy");
    }
  };

  const handleNodeReset = async (node: Node) => {
    setSelectedNode(node);

    try {
      const response = await axios.get(`http://localhost:4000/run-reset${node.id}`);
      setLogOutput(response.data.output);
      const newStatus = ["No output available", "Error fetching log output"].includes(
        response.data.output
      )
        ? "healthy"
        : "unhealthy";
      updateNodeStatus(node.id, newStatus);

      // Clear seen MACs after reset
      setSeenMacs(prev => {
        const copy = { ...prev };
        delete copy[node.id];
        return copy;
      });

    } catch (error) {
      console.error("Error fetching log output:", error);
      setLogOutput("Error fetching log output");
      updateNodeStatus(node.id, "healthy");
    }
  };

  useEffect(() => {
    if (!selectedNode) return;

    const intervalId = setInterval(async () => {
      if (selectedNode) {
        await handleNodeClick(selectedNode);
        await fetchMetrics(selectedNode);
      }
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [selectedNode]);

  useEffect(() => {
    if (selectedNode && !nodes.some(node => node.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [nodes, selectedNode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-gray-900 dark:to-indigo-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-indigo-100 dark:border-indigo-900 shadow-sm">
        <Header />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title */}
        <h1 className="text-3xl font-semibold mb-8 tracking-tight text-indigo-900 dark:text-indigo-200">
          Network Monitoring Dashboard
        </h1>

        {/* Layout Grid - 60/40 ratio with 5 column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Network Graph Section - 60% (3/5 columns) */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-indigo-100 dark:border-indigo-900 transition-all hover:shadow-xl duration-300">
            <div className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-slate-800">
              <h2 className="text-lg font-medium text-indigo-900 dark:text-indigo-200 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Network Visualization
              </h2>
            </div>
            <div className="h-[60vh] w-full p-4 bg-indigo-50 dark:bg-slate-900">
              <NetworkGraph
                nodes={nodes}
                onNodeClick={handleNodeClick}
                onRename={handleRename}
                onChangeIcon={handleIconChange}
                onAddNode={() => {}}
              />
            </div>
          </div>

          {/* Node Details Section - 40% (2/5 columns) */}
          {selectedNode ? (
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900 overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-indigo-200 dark:hover:shadow-indigo-900">
              <div className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-slate-800">
                <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-200 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Node {selectedNode.id} Details
                </h2>
              </div>

              <div className="p-6 space-y-6">
                {/* Status Indicator */}
                <div className="flex items-center gap-3">
                  <span className={`inline-block w-3 h-3 rounded-full ${
                    selectedNode.status === 'infected' 
                      ? 'bg-rose-500 animate-pulse' 
                      : 'bg-emerald-500'
                  }`}></span>
                  <strong className="text-sm uppercase tracking-wide text-indigo-600 dark:text-indigo-400">Status:</strong>
                  <span className={`font-semibold capitalize ${
                    selectedNode.status === 'infected' 
                      ? 'text-rose-500' 
                      : 'text-emerald-500'
                  }`}>
                    {selectedNode.status}
                  </span>
                </div>

                {/* Metrics Grid - Removed CPU usage and anomaly score */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-indigo-50 dark:bg-slate-700 p-4 rounded-lg transition-transform hover:scale-105 duration-200 shadow-sm hover:shadow">
                    <div className="text-xs text-indigo-600 dark:text-indigo-300 font-medium mb-1">Latency</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-white">{selectedNode.metrics.latency} ms</div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-slate-700 p-4 rounded-lg transition-transform hover:scale-105 duration-200 shadow-sm hover:shadow">
                    <div className="text-xs text-indigo-600 dark:text-indigo-300 font-medium mb-1">Memory</div>
                    <div className="font-mono font-bold text-slate-800 dark:text-white">{resourceUsage || "Loading..."}</div>
                  </div>
                </div>

                {/* Detected MAC Addresses Section */}
                {seenMacs[selectedNode.id] && seenMacs[selectedNode.id].size > 0 && (
                  <div>
                    <h3 className="font-medium text-indigo-800 dark:text-indigo-200 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Detected MAC Addresses
                    </h3>
                    <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-md border border-rose-200 dark:border-rose-800 shadow-inner">
                      <ul className="space-y-1 text-sm text-rose-900 dark:text-rose-300 font-mono">
                        {Array.from(seenMacs[selectedNode.id]).map((mac, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-2 h-2 bg-rose-500 rounded-full mr-2"></span>
                            {mac}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Log Output */}
                <div>
                  <h3 className="font-medium text-indigo-800 dark:text-indigo-200 mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Command Outputs
                  </h3>
                  <pre className="bg-slate-50 dark:bg-slate-900 text-xs p-4 rounded-md overflow-x-auto max-h-60 scrollbar-thin scrollbar-thumb-indigo-300 dark:scrollbar-thumb-indigo-700 border border-indigo-100 dark:border-indigo-900 shadow-inner">
                    {logOutput || "No output available"}
                  </pre>
                </div>

                {/* Reset Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleNodeReset(selectedNode)}
                    className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-all flex items-center justify-center group shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4 mr-2 transform group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reset Node
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // Empty state when no node is selected
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900 overflow-hidden flex items-center justify-center p-8">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-indigo-300 dark:text-indigo-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-indigo-900 dark:text-indigo-200 mb-1">No Node Selected</h3>
                <p className="text-indigo-500 dark:text-indigo-400">Click on a node in the network visualization to see its details.</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="lg:col-span-5 flex justify-center mt-6">
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-lg bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            >
              Reset Simulation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}