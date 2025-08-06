"use client"

import { useState } from "react"
import LandingPage from "./components/LandingPage"
import DescriptionPage from "./components/DescriptionPage"
import VisualizationPage from "./components/VisualizationPage"
import { CryptoTerminalChatbot } from "./components/crypto-terminal-chatbot"

type View = "landing" | "description" | "visualization"

function App() {
  const [currentView, setCurrentView] = useState<View>("landing")
  const [selectedMode, setSelectedMode] = useState<string>("")

  const handleModeSelect = (mode: string) => {
    setSelectedMode(mode)
    setCurrentView("description")
  }

  const handleBackToModes = () => {
    setCurrentView("landing")
    setSelectedMode("")
  }

  const handleVisualize = () => {
    setCurrentView("visualization")
  }

  const handleBackToDescription = () => {
    setCurrentView("description")
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case "landing":
        return <LandingPage onModeSelect={handleModeSelect} />
      case "description":
        return <DescriptionPage mode={selectedMode} onBack={handleBackToModes} onVisualize={handleVisualize} />
      case "visualization":
        return <VisualizationPage mode={selectedMode} onBack={handleBackToDescription} />
      default:
        return <LandingPage onModeSelect={handleModeSelect} />
    }
  }

  return (
    <>
      {/* Your existing conditional content */}
      {renderCurrentView()}

      {/* Crypto terminal - will appear on ALL views */}
      <CryptoTerminalChatbot defaultMinimized={true} />
    </>
  )
}

export default App

