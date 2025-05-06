import { useState } from "react";
import { NetworkGraph } from "../components/NetworkGraph";
import { Node } from "../types/node";
import { PlusCircle } from "lucide-react";

const ParentComponent = () => {
  const [nodes, setNodes] = useState<Node[]>([
    { id: 1, name: "Node 1", icon: 0, status: "healthy" },
    { id: 2, name: "Node 2", icon: 1, status: "compromised" },
    { id: 3, name: "Node 3", icon: 2, status: "isolated" },
    { id: 4, name: "Node 4", icon: 0, status: "restored" }
  ]);

  // Handle clicking a node
  const handleNodeClick = (node: Node) => {
    console.log("🔍 Node clicked:", node);
    // Add logic to view node details or trigger actions like renaming or resetting.
  };

  // Handle adding a new node
  const handleAddNode = () => {
    const nextId = Math.max(...nodes.map(n => n.id)) + 1;
    const newNode: Node = {
      id: nextId,
      name: `Node ${nextId}`,
      icon: 0,
      status: "healthy"
    };
    setNodes(prev => [...prev, newNode]);
  };

  // Handle renaming a node
  const handleRename = (nodeId: string, newName: string) => {
    setNodes(prev =>
      prev.map(node =>
        node.id.toString() === nodeId ? { ...node, name: newName } : node
      )
    );
  };

  // Handle icon change for a node
  const onChangeIcon = (nodeId: string, newIcon: number) => {
    setNodes(prev =>
      prev.map(node =>
        node.id.toString() === nodeId ? { ...node, icon: newIcon } : node
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">DEFENsys Node Network</h2>
        <button
          onClick={handleAddNode}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          Add Node
        </button>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-indigo-500/20">
        <NetworkGraph
          nodes={nodes}
          onNodeClick={handleNodeClick}
          onRename={handleRename}
          onChangeIcon={onChangeIcon}
          onAddNode={handleAddNode}
        />
      </div>
    </div>
  );
};

export default ParentComponent;
