"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Terminal, Minimize2, AlertCircle } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface CryptoTerminalChatbotProps {
  className?: string
  defaultMinimized?: boolean
}

export function CryptoTerminalChatbot({ className = "", defaultMinimized = false }: CryptoTerminalChatbotProps) {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Test connection on first load
  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log("🔍 [SIMPLE] Testing connection...")

        const healthResponse = await fetch("/api/health")
        if (healthResponse.ok) {
          const healthData = await healthResponse.json()
          console.log("✅ [SIMPLE] Health check:", healthData)

          // Test direct Gemini
          const geminiTest = await fetch("/api/test-gemini")
          const geminiData = await geminiTest.json()
          console.log("🤖 [SIMPLE] Gemini test:", geminiData)

          if (geminiTest.ok) {
            setConnectionStatus("connected")
          } else {
            console.error("❌ [SIMPLE] Gemini failed:", geminiData)
            setConnectionStatus("error")
          }
        } else {
          setConnectionStatus("error")
        }
      } catch (err) {
        console.error("❌ [SIMPLE] Connection error:", err)
        setConnectionStatus("error")
      }
    }

    testConnection()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || connectionStatus !== "connected") return

    const userMessage: Message = { role: "user", content: input.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    console.log("📤 [SIMPLE] Sending:", userMessage.content)

    try {
      const startTime = Date.now()

      const response = await fetch("/api/crypto-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      })

      const endTime = Date.now()
      console.log(`⏱️ [SIMPLE] Request took ${endTime - startTime}ms`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ [SIMPLE] Got response:", data.content.substring(0, 50) + "...")

      setMessages((prev) => [...prev, { role: "assistant", content: data.content }])
    } catch (err) {
      console.error("❌ [SIMPLE] Chat error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-lime-400 to-green-400 hover:from-lime-300 hover:to-green-300 text-black font-mono font-bold shadow-lg transition-all duration-300 border border-lime-300 relative px-4 py-2 rounded-lg"
          style={{
            boxShadow: "0 0 20px rgba(0, 255, 0, 0.6), 0 0 40px rgba(0, 255, 0, 0.4), 0 0 60px rgba(0, 255, 0, 0.2)",
          }}
        >
          <Terminal className="w-4 h-4 mr-2 inline" />
          Crypto Terminal
          {connectionStatus === "error" && <AlertCircle className="w-3 h-3 absolute -top-1 -right-1 text-red-500" />}
        </button>
      </div>
    )
  }

  return (
    <div
      className={`fixed bottom-4 right-4 w-96 h-[500px] bg-black border-2 rounded-lg shadow-2xl z-50 font-mono ${className}`}
      style={{
        borderColor: connectionStatus === "error" ? "#ef4444" : "#00ff00",
        boxShadow:
          connectionStatus === "error"
            ? "0 0 30px rgba(239, 68, 68, 0.4), 0 0 60px rgba(239, 68, 68, 0.2)"
            : "0 0 30px rgba(0, 255, 0, 0.5), 0 0 60px rgba(0, 255, 0, 0.3), inset 0 0 20px rgba(0, 255, 0, 0.1)",
      }}
    >
      {/* Terminal Header */}
      <div
        className="px-4 py-2 rounded-t-md flex items-center justify-between text-black font-bold"
        style={{
          background:
            connectionStatus === "error"
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #00ff00, #32cd32)",
          boxShadow: "0 0 15px rgba(0, 255, 0, 0.7), inset 0 0 15px rgba(255, 255, 255, 0.2)",
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          <span style={{ textShadow: "0 0 10px rgba(0, 0, 0, 0.5)" }}>CRYPTO_TERMINAL</span>
          <div className="flex items-center gap-1 text-xs">
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-300"
                  : connectionStatus === "error"
                    ? "bg-red-300"
                    : "bg-yellow-300"
              }`}
            />
            <span className="text-xs">
              {connectionStatus === "connected" ? "ONLINE" : connectionStatus === "error" ? "ERROR" : "CONNECTING"}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="h-6 w-6 p-0 hover:bg-emerald-600/30 text-black rounded flex items-center justify-center"
        >
          <Minimize2 className="w-3 h-3" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 h-[400px]">
        {connectionStatus === "connected" ? (
          <>
            <div
              className="text-sm animate-pulse"
              style={{
                color: "#00ff00",
                textShadow: "0 0 10px rgba(0, 255, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.4)",
              }}
            >
              {">"} READY TO ANSWER
            </div>
            <div
              className="text-sm"
              style={{
                color: "#39ff14",
                textShadow: "0 0 8px rgba(57, 255, 20, 0.6)",
              }}
            >
              {">"} powered by Google Gemini
            </div>
          </>
        ) : connectionStatus === "error" ? (
          <div
            className="text-sm p-2 rounded border"
            style={{
              color: "#ef4444",
              borderColor: "#dc2626",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              textShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
            }}
          >
            {">"} CONNECTION ERROR
            <br />
            {">"} Check /api/test-gemini in browser
            <br />
            {">"} Verify API key in .env
          </div>
        ) : (
          <div
            className="text-sm animate-pulse"
            style={{
              color: "#fbbf24",
              textShadow: "0 0 8px rgba(251, 191, 36, 0.6)",
            }}
          >
            {">"} TESTING DIRECT GEMINI API...
          </div>
        )}

        <div
          className="border-b my-2"
          style={{
            borderColor: "#006400",
            boxShadow: "0 0 5px rgba(0, 255, 0, 0.3)",
          }}
        ></div>

        {messages.map((message, index) => (
          <div key={index} className="space-y-1">
            <div
              className="text-sm font-semibold"
              style={{
                color: message.role === "user" ? "#00ff41" : "#00ff00",
                textShadow: message.role === "user" ? "0 0 8px rgba(0, 255, 65, 0.6)" : "0 0 10px rgba(0, 255, 0, 0.8)",
              }}
            >
              {message.role === "user" ? "> USER:" : "> CRYPTO_AI:"}
            </div>
            <div
              className="text-sm whitespace-pre-wrap ml-2 leading-relaxed"
              style={{
                color: message.role === "user" ? "#7fff00" : "#00ff41",
                textShadow:
                  message.role === "user" ? "0 0 5px rgba(127, 255, 0, 0.4)" : "0 0 6px rgba(0, 255, 65, 0.5)",
              }}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div
            className="text-sm animate-pulse"
            style={{
              color: "#00ff00",
              textShadow: "0 0 10px rgba(0, 255, 0, 0.8)",
            }}
          >
            {">"} CRYPTO_TERMINAL: Processing (no AI SDK)...
          </div>
        )}

        {error && (
          <div
            className="text-sm p-2 rounded border"
            style={{
              color: "#ef4444",
              borderColor: "#dc2626",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              textShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
            }}
          >
            {">"} ERROR: {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div
        className="border-t p-4"
        style={{
          borderColor: "#006400",
          boxShadow: "0 -2px 10px rgba(0, 255, 0, 0.2)",
        }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <span
              className="absolute left-2 top-1/2 transform -translate-y-1/2 text-sm font-bold"
              style={{
                color: "#00ff00",
                textShadow: "0 0 8px rgba(0, 255, 0, 0.8)",
              }}
            >
              {">"}
            </span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={connectionStatus === "connected" ? "Enter text here..." : "Connection required..."}
              className="w-full bg-black font-mono pl-6 pr-3 py-2 border-2 rounded focus:outline-none"
              style={{
                borderColor: "#006400",
                color: "#00ff41",
                textShadow: "0 0 5px rgba(0, 255, 65, 0.5)",
                boxShadow: "inset 0 0 10px rgba(0, 255, 0, 0.1)",
              }}
              disabled={isLoading || connectionStatus !== "connected"}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim() || connectionStatus !== "connected"}
            className="font-mono font-bold border-2 transition-all duration-300 px-3 py-2 rounded disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #00ff00, #32cd32)",
              borderColor: "#39ff14",
              color: "#000",
              boxShadow: "0 0 15px rgba(0, 255, 0, 0.6), 0 0 25px rgba(0, 255, 0, 0.4)",
              textShadow: "0 0 5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
