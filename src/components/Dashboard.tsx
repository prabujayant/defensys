// src/components/Dashboard.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Header } from "./Header";
import { NetworkGraph } from "./network/NetworkGraph";
import { Node } from "../types/node";
import { mockNodes } from "../utils/mockData";
import { resetNodeCounter } from "../utils/nodeGenerator";
import axios from "axios";
import { toast, Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

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
  const [inputText, setInputText] = useState<string>("");
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [encryptedOutput, setEncryptedOutput] = useState<string>("");
  const [decryptedOutput, setDecryptedOutput] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [encryptedImageOutput, setEncryptedImageOutput] = useState<string>("");
  const [decryptedImageOutput, setDecryptedImageOutput] = useState<string | null>(null);
  
  // New states for mode switching
  const [aesTextMode, setAesTextMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [aesImageMode, setAesImageMode] = useState<"encrypt" | "decrypt">("encrypt");
  
  // AES operation modes (including GCM)
  const [textOperationMode, setTextOperationMode] = useState<"GCM" | "ECB" | "CBC" | "CFB" | "OFB" | "CTR">("GCM");
  const [imageOperationMode, setImageOperationMode] = useState<"GCM" | "ECB" | "CBC" | "CFB" | "OFB" | "CTR">("GCM");
  
  // State for main section tabs (Malware, Secure Comm)
  const [activeToolTab, setActiveToolTab] = useState<"malware" | "secure-comm">("malware");

  // AEAD demonstration state
  const [aeadDemo, setAeadDemo] = useState<{
    originalText: string;
    gcmEncrypted: string;
    cbcEncrypted: string;
    gcmTamperedResult: string; // Will show decryption error
    cbcTamperedResult: string; // Will show garbled text or error
  } | null>(null);

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
        node.id === nodeId ? { ...node, status: nodeId === 'node-4' ? 'unhealthy' : status } : node
      )
    );
  };

  const fetchResourceUsage = async (node: Node) => {
    if (node.id === 'node-4') {
      setResourceUsage("N/A (Hidden)");
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
                status: n.id === 'node-4' ? 'unhealthy' : n.status,
                metrics: {
                  ...n.metrics,
                  memory: n.id === 'node-4' ? "N/A" : formatMemoryUsage(response.data.output), // Use .output for memory bytes
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
      node.id === 'node-4' ? { ...node, status: 'unhealthy' } : node
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
    setAesTextMode("encrypt");
    setAesImageMode("encrypt");
    setTextOperationMode("GCM");
    setImageOperationMode("GCM");
    setActiveToolTab("malware");
    setAeadDemo(null);
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
    if (node.id === 'node-4') {
      setBlacklistedIpsOutput("Blacklisted IPs are hidden for Node 4.");
      setResourceUsage("N/A (Hidden)");
      setNodes((prevNodes) => prevNodes.map(n =>
        n.id === 'node-4' ? { ...n, status: 'unhealthy' } : n
      ));
      return;
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
      
      let newStatus = "healthy";
      if (detectedIps.length > 0) {
        newStatus = "unhealthy";
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
                status: n.id === 'node-4' ? 'unhealthy' : newStatus,
                metrics: {
                  ...n.metrics,
                  memory: n.id === 'node-4' ? "N/A" : formatMemoryUsage(n.metrics.memory),
                },
              }
            : n
        )
      );
    } catch (error) {
      console.error("Error fetching node ", error);
      setBlacklistedIpsOutput("{}");
      updateNodeStatus(node.id, "healthy");
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
      return;
    }
    try {
      const response = await axios.get(
        `http://localhost:4000/run-reset${node.id}`
      );
      setBlacklistedIpsOutput(response.data.output);
      const detectedIpsAfterReset = extractIPsFromJSON(response.data.output);
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
      if (selectedNode && selectedNode.id !== 'node-4') {
        await handleNodeClick(selectedNode);
        await fetchMetrics(selectedNode);
      }
    }, 3000);
    return () => clearInterval(intervalId);
  }, [selectedNode, seenIps]);

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
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
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
          mode: textOperationMode
        }
      );
      setEncryptedOutput(response.data.encryptedText);
      setInputText(response.data.encryptedText);
      setDecryptedOutput("");
      setAesTextMode("decrypt");
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
    if (!inputText) {
      toast.error("Please enter or ensure encrypted text is present for decryption.", { id: "noEncryptedText" });
      return;
    }
    try {
      toast.loading(`Node ${selectedNode.id}: Decrypting text...`, { id: "decryptTextToast" });
      const response = await axios.post(
        `http://localhost:4000/decrypt-text/${selectedNode.id}`,
        {
          encryptedText: inputText,
          key: aesKey,
          mode: textOperationMode
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
      } else if (errorMessage.includes("Authentication failed")) {
          errorMessage = "Decryption failed: Data integrity check failed. The encrypted data may have been tampered with.";
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
    formData.append("mode", imageOperationMode);
    
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
      setDecryptedImageOutput(null);
      setAesImageMode("decrypt");
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
          mode: imageOperationMode
        },
        {
          responseType: 'blob' // Crucial for handling binary image data
        }
      );
      // Create a local URL for the blob object
      const imageUrl = URL.createObjectURL(response.data);
      setDecryptedImageOutput(imageUrl); // Store the URL for <img src=...>
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

  // AEAD demonstration
  const runAeadDemo = async () => {
    if (!selectedNode || !aesKey) {
      toast.error("Please select a node and enter an AES key first.");
      return;
    }

    const originalText = "Secret Message: Transfer $1000 to Account 12345";
    let gcmEncrypted = "";
    let cbcEncrypted = "";

    try {
      // 1. Encrypt with GCM
      const gcmResponse = await axios.post(
        `http://localhost:4000/encrypt-text/${selectedNode.id}`,
        { text: originalText, key: aesKey, mode: "GCM" }
      );
      gcmEncrypted = gcmResponse.data.encryptedText;

      // 2. Encrypt with CBC
      const cbcResponse = await axios.post(
        `http://localhost:4000/encrypt-text/${selectedNode.id}`,
        { text: originalText, key: aesKey, mode: "CBC" }
      );
      cbcEncrypted = cbcResponse.data.encryptedText;

      // 3. Create tampered versions (modify last character of ciphertext)
      const tamperCiphertext = (fullData: string, isGcm: boolean) => {
        const parts = fullData.split(':');
        let ciphertextIndex;
        if (isGcm) {
          // GCM format: IV:AUTH_TAG:CIPHERTEXT
          ciphertextIndex = 2;
        } else {
          // CBC format: IV:CIPHERTEXT
          ciphertextIndex = 1;
        }
        
        if (parts[ciphertextIndex]) {
          const originalCiphertext = parts[ciphertextIndex];
          // Modify the last character
          const tamperedCiphertext = originalCiphertext.slice(0, -1) + 
            (originalCiphertext.slice(-1) === '0' ? '1' : '0');
          parts[ciphertextIndex] = tamperedCiphertext;
        }
        return parts.join(':');
      };

      const gcmTampered = tamperCiphertext(gcmEncrypted, true);
      const cbcTampered = tamperCiphertext(cbcEncrypted, false);

      // 4. Try to decrypt tampered GCM (should fail with auth error)
      let gcmTamperedResult = "";
      try {
        await axios.post(
          `http://localhost:4000/decrypt-text/${selectedNode.id}`,
          { encryptedText: gcmTampered, key: aesKey, mode: "GCM" }
        );
        gcmTamperedResult = "ERROR: Decryption unexpectedly succeeded!";
      } catch (err: any) {
        // This is the expected path for GCM
        gcmTamperedResult = err.response?.data?.error || "Authentication failed - Data integrity check failed";
      }

      // 5. Try to decrypt tampered CBC (will likely succeed but produce garbage)
      let cbcTamperedResult = "";
      try {
        const cbcTamperedResponse = await axios.post(
          `http://localhost:4000/decrypt-text/${selectedNode.id}`,
          { encryptedText: cbcTampered, key: aesKey, mode: "CBC" }
        );
        cbcTamperedResult = cbcTamperedResponse.data.decryptedText;
      } catch (err: any) {
        // Decryption might still fail for CBC due to padding, but often produces garbage
        cbcTamperedResult = err.response?.data?.error || "Decryption produced garbage or failed";
      }

      // Update state with all results
      setAeadDemo({
        originalText,
        gcmEncrypted,
        cbcEncrypted,
        gcmTamperedResult,
        cbcTamperedResult
      });

      toast.success("AEAD Comparison Demo Completed!");
    } catch (error) {
      console.error("AEAD Demo Error:", error);
      toast.error("Failed to run AEAD demo. Check console for details.");
    }
  };

  // Operation mode options (including GCM)
  const operationModes = [
    { value: "GCM", label: "GCM (Galois/Counter Mode)" },
    { value: "ECB", label: "ECB (Electronic Codebook)" },
    { value: "CBC", label: "CBC (Cipher Block Chaining)" },
    { value: "CFB", label: "CFB (Cipher Feedback)" },
    { value: "OFB", label: "OFB (Output Feedback)" },
    { value: "CTR", label: "CTR (Counter)" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      <Toaster position="top-right" reverseOrder={false} />
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800">
        <Header />
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Defensys Cybersecurity Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Monitor Dockerized IoT nodes, analyze malware, and secure communications
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Network Visualization Card */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">IoT Network Visualization</h2>
            </div>
            <div className="h-[500px] w-full p-4 bg-gray-50 dark:bg-gray-900">
              <NetworkGraph
                nodes={nodes}
                onNodeClick={handleNodeClick}
                onRename={handleRename}
                onChangeIcon={handleIconChange}
                onAddNode={() => {}}
              />
            </div>
          </div>

          {/* Node Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedNode ? `Node ${selectedNode.id} Details` : "Node Details"}
              </h2>
            </div>
            <div className="p-5">
              {selectedNode ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span
                        className={`inline-block w-3 h-3 rounded-full mr-2 ${selectedNode.status === "unhealthy"
                            ? "bg-red-500 animate-pulse"
                            : "bg-green-500"
                          }`}
                      ></span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {selectedNode.status}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedNode.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Latency
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {selectedNode.metrics.latency} <span className="text-sm font-normal">ms</span>
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Memory
                      </p>
                      <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {resourceUsage || "Loading..."}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Blacklisted IPs</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-40 overflow-y-auto">
                      <pre className="text-xs text-gray-800 dark:text-gray-200 font-mono whitespace-pre-wrap break-words">
                        {blacklistedIpsOutput || "No blacklisted IPs found"}
                      </pre>
                    </div>
                  </div>

                  <button
                    onClick={() => handleNodeReset(selectedNode)}
                    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Reset Node
                  </button>
                </div>
              ) : (
                <div className="text-center py-10">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedNode && selectedNode.id === 'node-4' ? (
                      "Node 4: Details Hidden"
                    ) : (
                      "No Node Selected"
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {selectedNode && selectedNode.id === 'node-4' ? (
                      "This node's details are intentionally hidden for security reasons."
                    ) : (
                      "Select a node in the network visualization to see its details."
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveToolTab("malware")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeToolTab === "malware"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Malware Analyzer
              </button>
              <button
                onClick={() => setActiveToolTab("secure-comm")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeToolTab === "secure-comm"
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Secure Communication (AES)
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            <AnimatePresence mode="wait">
              {activeToolTab === "malware" && (
                <motion.div
                  key="malware"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="max-w-2xl">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Malware Analyzer</h2>
                    <form onSubmit={handleAnalyze} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Upload File for Analysis
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                          <div className="space-y-1 text-center">
                            <svg
                              className="mx-auto h-12 w-12 text-gray-400"
                              stroke="currentColor"
                              fill="none"
                              viewBox="0 0 48 48"
                              aria-hidden="true"
                            >
                              <path
                                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                              <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                              >
                                <span>Upload a file</span>
                                <input
                                  id="file-upload"
                                  name="file-upload"
                                  type="file"
                                  accept=".exe,image/*"
                                  onChange={handleFileChange}
                                  required
                                  className="sr-only"
                                />
                              </label>
                              <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              EXE or image files up to 10MB
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <button
                          type="submit"
                          disabled={isAnalyzing}
                          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                        >
                          {isAnalyzing ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Analyzing...
                            </>
                          ) : (
                            "Analyze File"
                          )}
                        </button>
                      </div>
                    </form>
                    
                    {isAnalyzing && (
                      <div className="mt-6">
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
                      <motion.div 
                        className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {analysisResult.error ? (
                          <p className="text-red-600 font-medium">
                            ⚠ {analysisResult.error}
                          </p>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Analysis Results</h3>
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                analysisResult.is_malicious 
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" 
                                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              }`}>
                                {analysisResult.is_malicious ? "Malicious" : "Benign"}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Filename</p>
                                <p className="font-medium text-gray-900 dark:text-white">{analysisResult.filename}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600 dark:text-gray-300">Binary Score</p>
                                <p className="font-medium text-gray-900 dark:text-white">{analysisResult.binary_score}%</p>
                              </div>
                            </div>
                            
                            {analysisResult.is_malicious && (
                              <div className="space-y-4">
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">Type</p>
                                  <p className="font-medium text-gray-900 dark:text-white">{analysisResult.malware_type}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">Category</p>
                                  <p className="font-medium text-gray-900 dark:text-white">{analysisResult.malware_category}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">Confidence</p>
                                  <p className="font-medium text-gray-900 dark:text-white">{analysisResult.confidence}%</p>
                                </div>
                                
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Top Predictions</h4>
                                  <ul className="space-y-2">
                                    {analysisResult.top_predictions.map(
                                      (pred: any, index: number) => (
                                        <li key={index} className="flex justify-between text-sm">
                                          <span className="text-gray-600 dark:text-gray-300">{pred.type} ({pred.category})</span>
                                          <span className="font-medium text-gray-900 dark:text-white">{pred.confidence}%</span>
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
              
              {activeToolTab === "secure-comm" && (
                <motion.div
                  key="secure-comm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">AES Encryption/Decryption</h2>
                    
                    <div className="space-y-8">
                      {/* AES Key Section */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Encryption Key</h3>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={aesKey}
                              onChange={(e) => setAesKey(e.target.value)}
                              placeholder="Enter encryption key or generate one"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <button
                            onClick={generateRandomAesKey}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors whitespace-nowrap"
                          >
                            Generate Key
                          </button>
                        </div>
                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                          <p className="flex items-center">
                            <svg className="w-4 h-4 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Using AES-GCM by default for authenticated encryption (confidentiality + integrity)
                          </p>
                        </div>
                      </div>
                      
                      {/* Text Encryption Section */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Text Encryption</h3>
                        
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            AES Operation Mode
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                            {operationModes.map((mode) => (
                              <button
                                key={mode.value}
                                onClick={() => setTextOperationMode(mode.value as any)}
                                className={`px-3 py-2 text-xs rounded-md transition-colors ${
                                  textOperationMode === mode.value
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500"
                                }`}
                                title={mode.label}
                              >
                                {mode.value}
                              </button>
                            ))}
                          </div>
                          {textOperationMode === "GCM" && (
                            <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Authenticated encryption with integrity protection
                            </div>
                          )}
                        </div>
                        
                        {/* AEAD Comparison Demo Section - Only show for GCM */}
                        {textOperationMode === "GCM" && (
                          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
                            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Data Integrity Protection Demo</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                              Compare how GCM (with integrity) and CBC (without integrity) handle data modification.
                            </p>
                            <button
                              onClick={runAeadDemo}
                              disabled={!selectedNode || !aesKey}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm disabled:opacity-50"
                            >
                              Run Comparison
                            </button>
                            
                            {/* Demo Results */}
                            {aeadDemo && (
                              <div className="mt-4 space-y-4">
                                <div>
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Original Message:</p>
                                  <p className="text-sm font-mono bg-white dark:bg-gray-800 p-2 rounded border">{aeadDemo.originalText}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* GCM Column */}
                                  <div className="border-l-4 border-green-500 pl-3">
                                    <h5 className="font-medium text-green-700 dark:text-green-400">GCM Mode (With Integrity)</h5>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Encrypted:</p>
                                    <p className="text-xs font-mono bg-white dark:bg-gray-800 p-2 rounded border break-all">{aeadDemo.gcmEncrypted.substring(0, 50)}...</p>
                                    
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-600 dark:text-gray-400">Decryption of Modified Data:</p>
                                      <p className="text-xs font-mono bg-red-100 dark:bg-red-900 p-2 rounded border text-red-800 dark:text-red-200">
                                        {aeadDemo.gcmTamperedResult}
                                      </p>
                                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                        ✅ GCM detected the modification and prevented decryption.
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* CBC Column */}
                                  <div className="border-l-4 border-yellow-500 pl-3">
                                    <h5 className="font-medium text-yellow-700 dark:text-yellow-400">CBC Mode (Without Integrity)</h5>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Encrypted:</p>
                                    <p className="text-xs font-mono bg-white dark:bg-gray-800 p-2 rounded border break-all">{aeadDemo.cbcEncrypted.substring(0, 50)}...</p>
                                    
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-600 dark:text-gray-400">Decryption of Modified Data:</p>
                                      <p className="text-xs font-mono bg-yellow-100 dark:bg-yellow-900 p-2 rounded border text-yellow-800 dark:text-yellow-200 break-all">
                                        {aeadDemo.cbcTamperedResult}
                                      </p>
                                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                                        ⚠ CBC does not detect modifications; data may be garbled or incorrect.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Standard Encryption/Decryption UI */}
                        <div className="flex space-x-3 mb-5">
                          <button
                            onClick={() => {
                              setAesTextMode("encrypt");
                              setDecryptedOutput("");
                            }}
                            className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                              aesTextMode === "encrypt"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                            }`}
                          >
                            Encrypt
                          </button>
                          <button
                            onClick={() => {
                              setAesTextMode("decrypt");
                              if (encryptedOutput) {
                                setInputText(encryptedOutput);
                              } else {
                                setInputText("");
                              }
                            }}
                            className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                              aesTextMode === "decrypt"
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                            }`}
                          >
                            Decrypt
                          </button>
                        </div>
                        
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {aesTextMode === "encrypt" ? "Input Text" : "Encrypted Text"}
                          </label>
                          <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            rows={4}
                            placeholder={aesTextMode === "encrypt" ? "Enter text to encrypt" : "Enter encrypted text"}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                          ></textarea>
                        </div>
                        
                        <div className="flex space-x-3">
                          <button
                            onClick={handleEncryptText}
                            disabled={aesTextMode === "decrypt" || !selectedNode || !aesKey || !inputText}
                            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            Encrypt Text
                          </button>
                          <button
                            onClick={handleDecryptText}
                            disabled={aesTextMode === "encrypt" || !selectedNode || !aesKey || !inputText}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            Decrypt Text
                          </button>
                        </div>
                        
                        {encryptedOutput && (
                          <motion.div 
                            className="mt-5"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Encrypted Output
                            </label>
                            <div className="bg-gray-800 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                              {encryptedOutput}
                            </div>
                          </motion.div>
                        )}
                        
                        {decryptedOutput && (
                          <motion.div 
                            className="mt-5"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Decrypted Output
                            </label>
                            <div className="bg-gray-800 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                              {decryptedOutput}
                            </div>
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Image Encryption Section */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Image Encryption</h3>
                        
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            AES Operation Mode
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                            {operationModes.map((mode) => (
                              <button
                                key={mode.value}
                                onClick={() => setImageOperationMode(mode.value as any)}
                                className={`px-3 py-2 text-xs rounded-md transition-colors ${
                                  imageOperationMode === mode.value
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500"
                                }`}
                                title={mode.label}
                              >
                                {mode.value}
                              </button>
                            ))}
                          </div>
                          {imageOperationMode === "GCM" && (
                            <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Authenticated encryption with integrity protection
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-3 mb-5">
                          <button
                            onClick={() => {
                              setAesImageMode("encrypt");
                              setDecryptedImageOutput(null);
                              setInputImage(null);
                              setImagePreview(null);
                            }}
                            className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                              aesImageMode === "encrypt"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                            }`}
                          >
                            Encrypt
                          </button>
                          <button
                            onClick={() => {
                              setAesImageMode("decrypt");
                            }}
                            className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                              aesImageMode === "decrypt"
                                ? "bg-green-600 text-white"
                                : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                            }`}
                          >
                            Decrypt
                          </button>
                        </div>
                        
                        <div className="mb-5">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Select Image
                          </label>
                          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                            <div className="space-y-1 text-center">
                              <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                stroke="currentColor"
                                fill="none"
                                viewBox="0 0 48 48"
                                aria-hidden="true"
                              >
                                <path
                                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                <label
                                  htmlFor="image-upload"
                                  className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                                >
                                  <span>Upload an image</span>
                                  <input
                                    id="image-upload"
                                    name="image-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleInputImageChange}
                                    disabled={aesImageMode === "decrypt"}
                                    className="sr-only"
                                  />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                PNG, JPG, GIF up to 10MB
                              </p>
                            </div>
                          </div>
                          
                          {imagePreview && aesImageMode === "encrypt" && (
                            <motion.div 
                              className="mt-4"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Image Preview</p>
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                                style={{ maxHeight: "200px", objectFit: "contain" }}
                              />
                            </motion.div>
                          )}
                        </div>
                        
                        <div className="flex space-x-3">
                          <button
                            onClick={handleEncryptImage}
                            disabled={aesImageMode === "decrypt" || !selectedNode || !aesKey || !inputImage}
                            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            Encrypt Image
                          </button>
                          <button
                            onClick={handleDecryptImage}
                            disabled={aesImageMode === "encrypt" || !selectedNode || !aesKey || !encryptedImageOutput}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            Decrypt Image
                          </button>
                        </div>
                        
                        {encryptedImageOutput && (
                          <motion.div 
                            className="mt-5"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Encrypted Image Data
                            </label>
                            <div className="bg-gray-800 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                              {encryptedImageOutput.substring(0, 100)}... (truncated)
                            </div>
                          </motion.div>
                        )}
                        
                        {decryptedImageOutput && (
                          <motion.div 
                            className="mt-5"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Decrypted Image
                            </label>
                            {/* Display the decrypted image using the URL created from the blob */}
                            <img
                              src={decryptedImageOutput}
                              alt="Decrypted"
                              className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-700"
                              style={{ maxHeight: "200px", objectFit: "contain" }}
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-8">
          <button
            onClick={handleReset}
            className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Reset Simulation
          </button>
          <button
            onClick={() => window.open("http://localhost:5174/", "_blank")}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
          >
            Visualize Operation Modes
          </button>
        </div>
      </main>
    </div>
  );
}