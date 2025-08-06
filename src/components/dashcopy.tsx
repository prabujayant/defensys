import React, { useState, useCallback, useEffect } from "react";
import { Header } from "./Header";
import { NetworkGraph } from "./network/NetworkGraph";
import { Node } from "../types/node";
import { mockNodes } from "../utils/mockData";
import { resetNodeCounter } from "../utils/nodeGenerator";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast"; // Import toast and Toaster

export function Dashboard() {
  const [nodes, setNodes] = useState<Node[]>(mockNodes);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [blacklistedIpsOutput, setBlacklistedIpsOutput] =
    useState<string>("No data");
  const [resourceUsage, setResourceUsage] = useState<string | null>(null);
  const [seenIps, setSeenIps] = useState<Record<string, Set<string>>>({});
  const [permanentlyInfected, setPermanentlyInfected] = useState<Set<string>>(
    new Set()
  );

  // Malware Analyzer state
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  // AES Encryption/Decryption state
  const [aesKey, setAesKey] = useState<string>("");
  const [inputText, setInputText] = useState<string>(""); // Used for both encryption input and decryption input
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [encryptedOutput, setEncryptedOutput] = useState<string>(""); // Stores the output of encryption
  const [decryptedOutput, setDecryptedOutput] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [encryptedImageOutput, setEncryptedImageOutput] = useState<string>("");
  const [decryptedImageOutput, setDecryptedImageOutput] = useState<string | null>(null);

  // New states for mode switching
  const [aesTextMode, setAesTextMode] = useState<"encrypt" | "decrypt">(
    "encrypt"
  );
  const [aesImageMode, setAesImageMode] = useState<"encrypt" | "decrypt">(
    "encrypt"
  );
  // State for main section tabs (Malware, Secure Comm)
  const [activeToolTab, setActiveToolTab] = useState<"malware" | "secure-comm">("malware");


  useEffect(() => {
    resetNodeCounter();
    // Ensure Node 4 is always unhealthy on initial load
    setNodes(prevNodes => prevNodes.map(node =>
      node.id === 'node-4' ? { ...node, status: 'unhealthy' } : node
    ));
  }, []);

  const handleIconChange = (nodeId: string, newIcon: string) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === nodeId ? { ...node, icon: newIcon } : node
      )
    );
  };

  const formatMemoryUsage = (memoryInBytes: number | undefined) => {
    if (typeof memoryInBytes !== "number") return "N/A";
    const mb = memoryInBytes / (1024 * 1024);
    return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
  };

  const updateNodeStatus = (nodeId: string, status: string) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === nodeId ? { ...node, status: nodeId === 'node-4' ? 'unhealthy' : status } : node // Keep node-4 unhealthy
      )
    );
  };

  const fetchResourceUsage = async (node: Node) => {
    if (node.id === 'node-4') {
      setResourceUsage("N/A (Hidden)"); // Explicitly set for Node 4
      return;
    }
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

  const fetchMetrics = async (node: Node) => {
    try {
      const response = await axios.get(
        `http://localhost:4000/run-stat${node.id}`
      );
      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === node.id
            ? {
                ...n,
                status: n.id === 'node-4' ? 'unhealthy' : n.status, // Ensure node-4 remains unhealthy
                metrics: {
                  ...n.metrics,
                  memory: n.id === 'node-4' ? "N/A" : formatMemoryUsage(response.data.memory), // Hide memory for Node 4
                },
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
    setNodes((nodes) =>
      nodes.map((node) => (node.id === nodeId ? { ...node, name: newName } : node))
    );
  }, []);

  const handleReset = useCallback(() => {
    setNodes(mockNodes.map(node =>
      node.id === 'node-4' ? { ...node, status: 'unhealthy' } : node // Keep node-4 unhealthy on reset
    ));
    setSelectedNode(null);
    resetNodeCounter();
    setPermanentlyInfected(new Set());
    // Reset AES state
    setAesKey("");
    setInputText("");
    setInputImage(null);
    setEncryptedOutput("");
    setDecryptedOutput("");
    setImagePreview(null);
    setEncryptedImageOutput("");
    setDecryptedImageOutput(null);
    setAesTextMode("encrypt"); // Reset text mode
    setAesImageMode("encrypt"); // Reset image mode
    setActiveToolTab("malware"); // Reset active tool tab
  }, []);

  const extractIPsFromJSON = (text: string): string[] => {
    try {
      const obj = JSON.parse(text);
      return Object.keys(obj).filter((ip) => obj[ip] === true);
    } catch {
      return [];
    }
  };

  const handleNodeClick = async (node: Node) => {
    setSelectedNode(node);

    // Immediately handle Node 4 specific display and status
    if (node.id === 'node-4') {
      setBlacklistedIpsOutput("Blacklisted IPs are hidden for Node 4.");
      setResourceUsage("N/A (Hidden)"); // Ensure this is set when node 4 is clicked
      setNodes((prevNodes) => prevNodes.map(n =>
        n.id === 'node-4' ? { ...n, status: 'unhealthy' } : n
      ));
      // No further API calls or data processing for display in the panel for node-4
      return; // Exit the function early for Node 4
    }

    fetchResourceUsage(node);

    try {
      const logResponse = await axios.get(
        `http://localhost:4000/run-log${node.id}`
      );
      const output = logResponse.data.output;
      setBlacklistedIpsOutput(output);
      const detectedIps = extractIPsFromJSON(output);
      const currentSeenIps = seenIps[node.id] || new Set<string>();
      
      // Determine if the node should be unhealthy based on detected IPs
      let newStatus = "healthy";
      if (detectedIps.length > 0) {
        newStatus = "unhealthy";
        // Optionally, if you want a toast notification for this automatic change:
        toast.error(`Node ${node.id}: Blacklisted IP detected! Status changed to unhealthy.`, { icon: '🚨', duration: 3000 });
      }

      for (const ip of detectedIps) {
        if (!currentSeenIps.has(ip)) {
          currentSeenIps.add(ip);
        }
      }

      setSeenIps((prev) => ({
        ...prev,
        [node.id]: currentSeenIps,
      }));

      if (detectedIps.length > 0 && !permanentlyInfected.has(node.id)) {
        const updatedInfected = new Set(permanentlyInfected);
        updatedInfected.add(node.id);
        setPermanentlyInfected(updatedInfected);
      }

      setNodes((prevNodes) =>
        prevNodes.map((n) =>
          n.id === node.id
            ? {
                ...n,
                status: n.id === 'node-4' ? 'unhealthy' : newStatus, // Ensure node-4 remains unhealthy
                metrics: {
                  ...n.metrics,
                  memory: n.id === 'node-4' ? "N/A" : formatMemoryUsage(n.metrics.memory), // Hide memory for Node 4
                },
              }
            : n
        )
      );
    } catch (error) {
      console.error("Error fetching node data:", error);
      setBlacklistedIpsOutput("{}");
      updateNodeStatus(node.id, "healthy"); // Default to healthy if there's an error fetching logs
    }
  };

  const handleNodeReset = async (node: Node) => {
    setSelectedNode(node);
    if (node.id === 'node-4') {
      setBlacklistedIpsOutput("Blacklisted IPs are hidden for Node 4.");
      setResourceUsage("N/A (Hidden)");
      setNodes((prevNodes) => prevNodes.map(n =>
        n.id === 'node-4' ? { ...n, status: 'unhealthy' } : n
      ));
      toast.success(`Node ${node.id}: Status reset to unhealthy (fixed behavior).`, { icon: '✅' });
      return; // Stop further processing for Node 4
    }

    try {
      const response = await axios.get(
        `http://localhost:4000/run-reset${node.id}`
      );
      setBlacklistedIpsOutput(response.data.output);
      const detectedIpsAfterReset = extractIPsFromJSON(response.data.output);
      // After reset, if blacklisted IPs are still detected, it should remain unhealthy
      const newStatus = detectedIpsAfterReset.length > 0 ? "unhealthy" : "healthy";
      updateNodeStatus(node.id, newStatus);
      toast.success(`Node ${node.id}: Successfully reset!`, { icon: '✅' });
    } catch (error) {
      console.error("Error fetching log output:", error);
      setBlacklistedIpsOutput("Error fetching log output");
      updateNodeStatus(node.id, "healthy");
      toast.error(`Node ${node.id}: Failed to reset.`, { icon: '❌' });
    }
  };

  useEffect(() => {
    if (!selectedNode) return;
    const intervalId = setInterval(async () => {
      if (selectedNode) {
        // For node-4, we specifically handle its status and hidden data.
        // The fetch calls will return "N/A" or "hidden" as per logic.
        if (selectedNode.id !== 'node-4') { // Only fetch for non-Node 4
          await handleNodeClick(selectedNode); // This will now update status based on IPs
          await fetchMetrics(selectedNode);
        }
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [selectedNode, seenIps]); // Depend on seenIps to react to new IP detections

  useEffect(() => {
    if (selectedNode && !nodes.some((node) => node.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [nodes, selectedNode]);

  // Malware Analyzer handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAnalysisResult(null);
      toast.success("File selected for analysis.", { icon: '📄' });
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file to analyze.", { icon: '⚠️' });
      return;
    }

    setIsAnalyzing(true);
    setProgress(0);
    setAnalysisResult(null);
    toast.loading("Analyzing file...", { id: "analyzeToast" });

    const formData = new FormData();
    formData.append("file", file);

    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 80));
    }, 200);

    try {
      const response = await axios.post("http://localhost:4000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearInterval(progressInterval);
      setProgress(100);
      toast.dismiss("analyzeToast");
      setIsAnalyzing(false);
      setAnalysisResult(response.data.result);
      if (response.data.result.is_malicious) {
        toast.error("Analysis complete: MALICIOUS FILE DETECTED!", { icon: '🚨', duration: 6000 });
      } else {
        toast.success("Analysis complete: File is BENIGN.", { icon: '🛡️', duration: 4000 });
      }

    } catch (error: any) {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setAnalysisResult({ error: error.message || "Error during analysis" });
      toast.dismiss("analyzeToast");
      toast.error(`Analysis failed: ${error.message || "Unknown error."}`, { icon: '❌', duration: 5000 });
    }
  };

  // AES Encryption/Decryption Handlers
  const generateRandomAesKey = () => {
    const array = new Uint8Array(32); // 256 bits = 32 bytes
    window.crypto.getRandomValues(array);
    // Convert the Uint8Array to a hexadecimal string
    setAesKey(Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(""));
    toast.success("New AES key generated!", { icon: '🔑' });
  };

  const handleInputImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const imgFile = e.target.files[0];
      setInputImage(imgFile);
      setImagePreview(URL.createObjectURL(imgFile));
      setEncryptedImageOutput("");
      setDecryptedImageOutput(null);
      toast.success("Image selected for encryption.", { icon: '🖼️' });
    }
  };

  const handleEncryptText = async () => {
    if (!selectedNode) {
      toast.error("Please select a node first.", { id: "selectNodeError" });
      return;
    }
    if (!aesKey) {
      toast.error("Please enter an AES key or generate one.", { id: "aesKeyError" });
      return;
    }
    if (!inputText) {
      toast.error("Please enter text to encrypt.", { id: "inputTextError" });
      return;
    }

    try {
      toast.loading(`Node ${selectedNode.id}: Encrypting text...`, { id: "encryptTextToast" });
      const response = await axios.post(
        `http://localhost:4000/encrypt-text/${selectedNode.id}`,
        {
          text: inputText,
          key: aesKey,
        }
      );
      setEncryptedOutput(response.data.encryptedText);
      setInputText(response.data.encryptedText); // Set input for decryption
      setDecryptedOutput(""); // Clear decrypted output on new encryption
      setAesTextMode("decrypt"); // Switch to decrypt mode after successful encryption
      toast.success(`Node ${selectedNode.id}: Text encrypted successfully!`, {
        id: "encryptTextToast",
        icon: '🔒',
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error encrypting text:", error);
      toast.error(`Node ${selectedNode.id}: Encryption failed: ${error.response?.data?.error || "Unknown error."}`, {
        id: "encryptTextToast",
        icon: '⚠️',
        duration: 5000,
      });
      setEncryptedOutput(error.response?.data?.error || "Error encrypting text");
      setDecryptedOutput("");
    }
  };

  const handleDecryptText = async () => {
    if (!selectedNode) {
      toast.error("Please select a node first.", { id: "selectNodeError" });
      return;
    }
    if (!aesKey) {
      toast.error("Please enter an AES key or generate one.", { id: "aesKeyError" });
      return;
    }
    // Use inputText directly for decryption, allowing manual paste or previous encryptedOutput
    if (!inputText) {
      toast.error("Please enter or ensure encrypted text is present for decryption.", { id: "noEncryptedText" });
      return;
    }

    try {
      toast.loading(`Node ${selectedNode.id}: Decrypting text...`, { id: "decryptTextToast" });
      const response = await axios.post(
        `http://localhost:4000/decrypt-text/${selectedNode.id}`,
        {
          encryptedText: inputText, // Send the content of inputText for decryption
          key: aesKey,
        }
      );
      setDecryptedOutput(response.data.decryptedText);
      toast.success(`Node ${selectedNode.id}: Text decrypted successfully!`, {
        id: "decryptTextToast",
        icon: '🔓',
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error decrypting text:", error);
      let errorMessage = error.response?.data?.error || "Unknown error.";
      if (errorMessage.includes("Invalid encrypted data format")) {
          errorMessage = "Decryption failed: Invalid encrypted data format. Check if the text was correctly encrypted with this key.";
      } else if (errorMessage.includes("Decryption failed")) {
          errorMessage = "Decryption failed: Incorrect key or corrupted data.";
      }
      setDecryptedOutput(errorMessage);
      toast.error(`Node ${selectedNode.id}: ${errorMessage}`, {
        id: "decryptTextToast",
        icon: '❌',
        duration: 5000,
      });
    }
  };

  const handleEncryptImage = async () => {
    if (!selectedNode) {
      toast.error("Please select a node first.", { id: "selectNodeError" });
      return;
    }
    if (!aesKey) {
      toast.error("Please enter an AES key or generate one.", { id: "aesKeyError" });
      return;
    }
    if (!inputImage) {
      toast.error("Please select an image to encrypt.", { id: "inputImageError" });
      return;
    }

    const formData = new FormData();
    formData.append("image", inputImage);
    formData.append("key", aesKey);

    try {
      toast.loading(`Node ${selectedNode.id}: Encrypting image...`, { id: "encryptImageToast" });
      const response = await axios.post(
        `http://localhost:4000/encrypt-image/${selectedNode.id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      setEncryptedImageOutput(response.data.encryptedImage);
      setDecryptedImageOutput(null); // Clear decrypted output on new encryption
      setAesImageMode("decrypt"); // Switch to decrypt mode after successful encryption
      toast.success(`Node ${selectedNode.id}: Image encrypted successfully!`, {
        id: "encryptImageToast",
        icon: '🔒',
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error encrypting image:", error);
      setEncryptedImageOutput(error.response?.data?.error || "Error encrypting image");
      setDecryptedImageOutput(null);
      toast.error(`Node ${selectedNode.id}: Image encryption failed: ${error.response?.data?.error || "Unknown error."}`, {
        id: "encryptImageToast",
        icon: '⚠️',
        duration: 5000,
      });
    }
  };

  const handleDecryptImage = async () => {
    if (!selectedNode) {
      toast.error("Please select a node first.", { id: "selectNodeError" });
      return;
    }
    if (!aesKey) {
      toast.error("Please enter an AES key or generate one.", { id: "aesKeyError" });
      return;
    }
    if (!encryptedImageOutput) {
      toast.error("No encrypted image available to decrypt.", { id: "noEncryptedImage" });
      return;
    }

    try {
      toast.loading(`Node ${selectedNode.id}: Decrypting image...`, { id: "decryptImageToast" });
      const response = await axios.post(
        `http://localhost:4000/decrypt-image/${selectedNode.id}`,
        {
          encryptedImage: encryptedImageOutput,
          key: aesKey,
        },
        {
          responseType: 'blob' // Important for handling image data
        }
      );
      const imageUrl = URL.createObjectURL(response.data);
      setDecryptedImageOutput(imageUrl);
      toast.success(`Node ${selectedNode.id}: Image decrypted successfully!`, {
        id: "decryptImageToast",
        icon: '🔓',
        duration: 3000,
      });
    } catch (error: any) {
      console.error("Error decrypting image:", error);
      setDecryptedImageOutput(null);
      toast.error(`Node ${selectedNode.id}: Image decryption failed. Check key and encrypted data.`, {
        id: "decryptImageToast",
        icon: '❌',
        duration: 5000,
      });
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-gray-900 dark:to-indigo-950 text-gray-900 dark:text-gray-100 font-['Inter'] transition-colors duration-300">
      <Toaster position="top-right" reverseOrder={false} /> {/* Toaster for notifications */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-indigo-100 dark:border-indigo-900 shadow-sm">
        <Header />
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-semibold mb-8 tracking-tight text-indigo-900 dark:text-indigo-200">
          Cybersecurity Dashboard
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-indigo-100 dark:border-indigo-900 transition-all hover:shadow-xl duration-300">
            <div className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-slate-800">
              <h2 className="text-lg font-medium text-indigo-900 dark:text-indigo-200 flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
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

          {/* Modified Node Details / No Node Selected Section */}
          {selectedNode && selectedNode.id !== 'node-4' ? (
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900 overflow-hidden transition-all duration-300 transform hover:-translate-y-1 hover:shadow-indigo-200 dark:hover:shadow-indigo-900">
              <div className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-slate-800">
                <h2 className="text-xl font-bold text-indigo-900 dark:text-indigo-200 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Node {selectedNode.id} Details
                </h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${selectedNode.status === "unhealthy"
                        ? "bg-rose-500 animate-pulse"
                        : "bg-emerald-500"
                      }`}
                  ></span>
                  <strong className="text-sm uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
                    Status:
                  </strong>
                  <span
                    className={`font-semibold capitalize ${selectedNode.status === "unhealthy" ? "text-rose-500" : "text-emerald-500"
                      }`}
                  >
                    {selectedNode.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-indigo-50 dark:bg-slate-700 p-4 rounded-lg transition-transform hover:scale-105 duration-200 shadow-sm hover:shadow">
                    <div className="text-xs text-indigo-600 dark:text-indigo-300 font-medium mb-1">
                      Latency
                    </div>
                    <div className="font-['JetBrains Mono'] font-bold text-slate-800 dark:text-white">
                      {selectedNode.metrics.latency} ms
                    </div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-slate-700 p-4 rounded-lg transition-transform hover:scale-105 duration-200 shadow-sm hover:shadow">
                    <div className="text-xs text-indigo-600 dark:text-indigo-300 font-medium mb-1">
                      Memory
                    </div>
                    <div className="font-['JetBrains Mono'] font-bold text-slate-800 dark:text-white">
                      {/* This will only be shown for nodes NOT node-4 */}
                      {resourceUsage || "Loading..."}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-indigo-800 dark:text-indigo-200 mb-2 flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Blacklisted IPs
                  </h3>
                  <pre className="bg-slate-50 dark:bg-slate-900 text-xs p-4 rounded-md overflow-x-auto max-h-60 scrollbar-thin scrollbar-thumb-indigo-300 dark:scrollbar-thumb-indigo-700 border border-indigo-100 dark:border-indigo-900 shadow-inner font-['JetBrains Mono'] whitespace-pre-wrap break-words">
                    {/* This will only be shown for nodes NOT node-4 */}
                    {blacklistedIpsOutput || "No blacklisted IPs found"}
                  </pre>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => handleNodeReset(selectedNode)}
                    className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-all flex items-center justify-center group shadow-md hover:shadow-lg"
                  >
                    <svg
                      className="w-4 h-4 mr-2 transform group-hover:rotate-90 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reset Node
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900 overflow-hidden flex items-center justify-center p-8">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto text-indigo-300 dark:text-indigo-700 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 00-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-indigo-900 dark:text-indigo-200 mb-1">
                  {selectedNode && selectedNode.id === 'node-4' ? (
                    "Node 4: Details Hidden" // Custom message for Node 4
                  ) : (
                    "No Node Selected"
                  )}
                </h3>
                <p className="text-indigo-500 dark:text-indigo-400">
                  {selectedNode && selectedNode.id === 'node-4' ? (
                    "This node's details are intentionally hidden for security reasons." // Custom message for Node 4
                  ) : (
                    "Click on a node in the network visualization to see its details."
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Malware Analyzer & AES Encryption/Decryption Section */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900 overflow-hidden transition-all duration-300">
            <div className="p-4 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-slate-800 flex justify-start gap-4">
              <button
                onClick={() => setActiveToolTab("malware")}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeToolTab === "malware"
                    ? "bg-indigo-700 text-white shadow-md"
                    : "text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-slate-700"
                  }`}
              >
                Malware Analyzer
              </button>
              <button
                onClick={() => setActiveToolTab("secure-comm")}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${activeToolTab === "secure-comm"
                    ? "bg-indigo-700 text-white shadow-md"
                    : "text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-slate-700"
                  }`}
              >
                Secure Communication (AES)
              </button>
            </div>

            <div className="p-6 animate-fadeIn"> {/* Apply fade-in animation to the content */}
              {activeToolTab === "malware" && (
                <div>
                  <h2 className="text-lg font-medium text-indigo-900 dark:text-indigo-200 flex items-center mb-6">
                    <svg
                      className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Malware Analyzer
                  </h2>
                  <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
                    <div className="relative">
                      <input
                        type="file"
                        accept=".exe,image/*"
                        onChange={handleFileChange}
                        required
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-indigo-50 file:text-indigo-700
                          hover:file:bg-indigo-100
                          cursor-pointer"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white font-semibold py-3 px-6 rounded-md
                        hover:bg-indigo-700 transition-colors duration-300 flex items-center justify-center gap-2
                        "
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 W 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Analyze File
                        </>
                      )}
                    </button>
                  </form>
                  {isAnalyzing && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                        Analyzing... {progress}%
                      </p>
                    </div>
                  )}
                  {analysisResult && (
                    <div className="mt-6 bg-gray-50 dark:bg-slate-700 p-6 rounded-lg animate-[fadeIn_0.5s_ease-out]">
                      {analysisResult.error ? (
                        <p className="text-red-600 font-medium">
                          ⚠ {analysisResult.error}
                        </p>
                      ) : (
                        <>
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Filename:</strong> {analysisResult.filename}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Status:</strong>
                            <span
                              className={`ml-2 font-semibold ${analysisResult.is_malicious ? "text-red-600" : "text-green-600"
                                }`}
                            >
                              {analysisResult.is_malicious ? "Malicious" : "Benign"}
                            </span>
                          </p>
                          <p className="text-gray-700 dark:text-gray-300">
                            <strong>Binary Score:</strong>{" "}
                            {analysisResult.binary_score}%
                          </p>
                          {!analysisResult.is_malicious &&
                            analysisResult.confidence && (
                              <p className="text-gray-700 dark:text-gray-300">
                                <strong>Confidence (Benign):</strong>{" "}
                                {analysisResult.confidence}%
                              </p>
                            )}
                          {analysisResult.malware_type && (
                            <>
                              <p className="text-gray-700 dark:text-gray-300">
                                <strong>Type:</strong> {analysisResult.malware_type}
                              </p>
                              <p className="text-gray-700 dark:text-gray-300">
                                <strong>Category:</strong>{" "}
                                {analysisResult.malware_category}
                              </p>
                              <p className="text-gray-700 dark:text-gray-300">
                                <strong>Confidence:</strong>{" "}
                                {analysisResult.confidence}%
                              </p>
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4">
                                Top Predictions:
                              </h3>
                              <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300">
                                {analysisResult.top_predictions.map(
                                  (pred: any, index: number) => (
                                    <li key={index}>
                                      {pred.type} ({pred.category}) —{" "}
                                      {pred.confidence}%
                                    </li>
                                  )
                                )}
                              </ul>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeToolTab === "secure-comm" && (
                <div>
                  <h2 className="text-lg font-medium text-indigo-900 dark:text-indigo-200 flex items-center mb-6">
                    <svg
                      className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v3h8z"
                      />
                    </svg>
                    AES Encryption/Decryption (Inter-Node)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Common AES Key Input */}
                    <div className="md:col-span-2 mb-4">
                      <label
                        htmlFor="aesKey"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                      >
                        AES Key (Any custom string, hashed to 32 bytes for AES-256)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          id="aesKey"
                          value={aesKey}
                          onChange={(e) => setAesKey(e.target.value)}
                          placeholder="Enter any custom AES key/passphrase"
                          className="flex-1 p-3 border border-indigo-300 dark:border-indigo-700 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 font-['JetBrains Mono']"
                        />
                        <button
                          onClick={generateRandomAesKey}
                          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors text-sm flex-shrink-0"
                        >
                          Generate Key
                        </button>
                      </div>
                    </div>

                    {/* Text Encryption/Decryption */}
                    <div className="bg-indigo-50 dark:bg-slate-700 p-5 rounded-lg shadow-sm">
                      <h3 className="text-md font-semibold text-indigo-800 dark:text-indigo-200 mb-4 border-b pb-2 border-indigo-200 dark:border-slate-600">
                        Text Communication
                      </h3>
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => {
                            setAesTextMode("encrypt");
                            setDecryptedOutput(""); // Clear decrypted output when switching to encrypt
                            // setInputText(""); // Don't clear if user wants to manually type
                          }}
                          className={`flex-1 px-4 py-2 rounded-md transition-colors text-sm font-medium ${aesTextMode === "encrypt"
                              ? "bg-indigo-700 text-white shadow-md"
                              : "bg-indigo-200 text-indigo-800 hover:bg-indigo-300 dark:bg-slate-600 dark:text-indigo-200 dark:hover:bg-slate-500"
                            }`}
                        >
                          Encrypt Mode
                        </button>
                        <button
                          onClick={() => {
                            setAesTextMode("decrypt");
                            // Set inputText to encryptedOutput when switching to decrypt if it's available
                            if (encryptedOutput) {
                              setInputText(encryptedOutput);
                            } else {
                              setInputText(""); // Clear if no encrypted output
                            }
                          }}
                          className={`flex-1 px-4 py-2 rounded-md transition-colors text-sm font-medium ${aesTextMode === "decrypt"
                              ? "bg-emerald-700 text-white shadow-md"
                              : "bg-emerald-200 text-emerald-800 hover:bg-emerald-300 dark:bg-slate-600 dark:text-emerald-200 dark:hover:bg-slate-500"
                            }`}
                        >
                          Decrypt Mode
                        </button>
                      </div>
                      <div className="mb-4">
                        <label
                          htmlFor="inputText"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          {aesTextMode === "encrypt" ? "Input Text" : "Encrypted Text (IV:ciphertext)"}
                        </label>
                        <textarea
                          id="inputText"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          rows={3}
                          placeholder={aesTextMode === "encrypt" ? "Enter text to encrypt" : "Paste IV:ciphertext here or it will use the last encrypted output"}
                          className="w-full p-3 border border-indigo-300 dark:border-indigo-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 font-['JetBrains Mono']"
                          // Make read-only in decrypt mode IF there's already encrypted output set, allowing manual paste otherwise
                          readOnly={aesTextMode === "decrypt" && !!encryptedOutput && inputText === encryptedOutput}
                        ></textarea>
                      </div>
                      <div className="flex gap-3 mb-4">
                        <button
                          onClick={handleEncryptText}
                          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-75 shadow-sm hover:shadow-md"
                          disabled={aesTextMode === "decrypt" || !selectedNode || !aesKey || !inputText}
                        >
                          Encrypt Text
                        </button>
                        <button
                          onClick={handleDecryptText}
                          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-75 shadow-sm hover:shadow-md"
                          disabled={aesTextMode === "encrypt" || !selectedNode || !aesKey || !inputText}
                        >
                          Decrypt Text
                        </button>
                      </div>
                      {encryptedOutput && (
                        <div className="mt-4 animate-fadeIn">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Encrypted (IV:ciphertext):
                          </p>
                          <pre className="bg-slate-100 dark:bg-slate-900 text-xs p-3 rounded-md overflow-x-auto font-['JetBrains Mono'] break-words border border-indigo-100 dark:border-indigo-900">
                            {encryptedOutput}
                          </pre>
                        </div>
                      )}
                      {decryptedOutput && (
                        <div className="mt-4 animate-fadeIn">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Decrypted:
                          </p>
                          <pre className="bg-slate-100 dark:bg-slate-900 text-xs p-3 rounded-md overflow-x-auto font-['JetBrains Mono'] break-words border border-indigo-100 dark:border-indigo-900">
                            {decryptedOutput}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Image Encryption/Decryption */}
                    <div className="bg-indigo-50 dark:bg-slate-700 p-5 rounded-lg shadow-sm">
                      <h3 className="text-md font-semibold text-indigo-800 dark:text-indigo-200 mb-4 border-b pb-2 border-indigo-200 dark:border-slate-600">
                        Image Communication
                      </h3>
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => {
                            setAesImageMode("encrypt");
                            setDecryptedImageOutput(null); // Clear decrypted output when switching to encrypt
                            setInputImage(null); // Clear input image when switching to encrypt
                            setImagePreview(null); // Clear image preview
                          }}
                          className={`flex-1 px-4 py-2 rounded-md transition-colors text-sm font-medium ${aesImageMode === "encrypt"
                              ? "bg-indigo-700 text-white shadow-md"
                              : "bg-indigo-200 text-indigo-800 hover:bg-indigo-300 dark:bg-slate-600 dark:text-indigo-200 dark:hover:bg-slate-500"
                            }`}
                        >
                          Encrypt Mode
                        </button>
                        <button
                          onClick={() => {
                            setAesImageMode("decrypt");
                            // No need to prefill inputImage here, decryption relies on encryptedImageOutput
                          }}
                          className={`flex-1 px-4 py-2 rounded-md transition-colors text-sm font-medium ${aesImageMode === "decrypt"
                              ? "bg-emerald-700 text-white shadow-md"
                              : "bg-emerald-200 text-emerald-800 hover:bg-emerald-300 dark:bg-slate-600 dark:text-emerald-200 dark:hover:bg-slate-500"
                            }`}
                        >
                          Decrypt Mode
                        </button>
                      </div>
                      <div className="mb-4">
                        <label
                          htmlFor="inputImage"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Input Image
                        </label>
                        <input
                          type="file"
                          id="inputImage"
                          accept="image/*"
                          onChange={handleInputImageChange}
                          className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-md file:border-0
                            file:text-sm file:font-semibold
                            file:bg-indigo-100 file:text-indigo-700
                            hover:file:bg-indigo-200
                            cursor-pointer"
                          disabled={aesImageMode === "decrypt"} // Disable input in decrypt mode
                        />
                        {imagePreview && aesImageMode === "encrypt" && (
                          <div className="mt-3 animate-fadeIn">
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                              Original Image Preview:
                            </p>
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="max-w-full h-auto rounded-md shadow-md border border-indigo-200 dark:border-indigo-800"
                              style={{ maxHeight: "150px", objectFit: "contain" }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3 mb-4">
                        <button
                          onClick={handleEncryptImage}
                          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-75 shadow-sm hover:shadow-md"
                          disabled={aesImageMode === "decrypt" || !selectedNode || !aesKey || !inputImage}
                        >
                          Encrypt Image
                        </button>
                        <button
                          onClick={handleDecryptImage}
                          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-75 shadow-sm hover:shadow-md"
                          disabled={aesImageMode === "encrypt" || !selectedNode || !aesKey || !encryptedImageOutput}
                        >
                          Decrypt Image
                        </button>
                      </div>
                      {encryptedImageOutput && (
                        <div className="mt-4 animate-fadeIn">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Encrypted Image (Base64 Snippet):
                          </p>
                          <pre className="bg-slate-100 dark:bg-slate-900 text-xs p-3 rounded-md overflow-x-auto font-['JetBrains Mono'] break-words border border-indigo-100 dark:border-indigo-900">
                            {encryptedImageOutput.substring(0, 100)}... (full Base64 not shown)
                          </pre>
                        </div>
                      )}
                      {decryptedImageOutput && (
                        <div className="mt-4 animate-fadeIn">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Decrypted Image:
                          </p>
                          <img
                            src={decryptedImageOutput}
                            alt="Decrypted"
                            className="max-w-full h-auto rounded-md shadow-md border border-indigo-200 dark:border-indigo-800"
                            style={{ maxHeight: "150px", objectFit: "contain" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center gap-4 mt-6">
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-lg bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            >
              Reset Simulation
            </button>
            <button
              onClick={() => window.open("http://localhost:5174/", "_blank")}
              className="px-6 py-3 rounded-lg bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-medium transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
            >
              Visualize operation modes
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}