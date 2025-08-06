import express from "express"
import cors from "cors"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// SUPER SIMPLE TEST VERSION - No AI SDK, direct fetch to Gemini
app.post("/api/crypto-chat", async (req, res) => {
  try {
    console.log("🔄 [SIMPLE] Received request")

    // Validate environment variable
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("❌ Missing API key")
      return res.status(500).json({ error: "API key not configured" })
    }

    const { messages } = req.body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array required" })
    }

    const lastMessage = messages[messages.length - 1]
    console.log("📝 [SIMPLE] User asked:", lastMessage.content)

    // BYPASS AI SDK - Direct fetch to Gemini REST API
    console.log("🤖 [SIMPLE] Calling Gemini directly...")

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are CRYPTO_AI. Answer this cryptography question briefly: ${lastMessage.content}`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0.7,
          },
        }),
      },
    )

    console.log("📡 [SIMPLE] Gemini response status:", geminiResponse.status)

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("❌ [SIMPLE] Gemini error:", errorText)
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`)
    }

    const geminiData = await geminiResponse.json()
    console.log("✅ [SIMPLE] Gemini data received:", JSON.stringify(geminiData, null, 2))

    // Extract the response text
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini"

    console.log("✅ [SIMPLE] Extracted response:", responseText.substring(0, 100) + "...")

    // Return simple JSON
    return res.json({
      role: "assistant",
      content: responseText,
    })
  } catch (error) {
    console.error("❌ [SIMPLE] Error:", error.message)
    return res.status(500).json({
      error: "Request failed",
      details: error.message,
    })
  }
})

app.get("/api/health", (req, res) => {
  console.log("🏥 [SIMPLE] Health check")
  res.json({
    status: "OK",
    message: "Simple backend running!",
    hasApiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  })
})

// Direct Gemini test
app.get("/api/test-gemini", async (req, res) => {
  try {
    console.log("🧪 [SIMPLE] Testing Gemini directly...")

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return res.status(500).json({ error: "No API key" })
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say 'Hello from direct Gemini!'" }] }],
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response"

    console.log("✅ [SIMPLE] Direct Gemini test successful:", text)

    res.json({
      status: "success",
      response: text,
      fullData: data,
    })
  } catch (error) {
    console.error("❌ [SIMPLE] Direct Gemini test failed:", error)
    res.status(500).json({
      error: "Direct Gemini test failed",
      details: error.message,
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 [SIMPLE] Backend running on http://localhost:${PORT}`)
  console.log(`🔑 [SIMPLE] API Key: ${process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "SET" : "MISSING"}`)
})
