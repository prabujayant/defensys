import { streamText } from "ai"
import { google } from "@ai-sdk/google"

export async function POST(req: Request) {
  try {
    // Validate environment variable
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable")
      return new Response(
        JSON.stringify({
          error: "API key not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY environment variable.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Parse request body
    let messages
    try {
      const body = await req.json()
      messages = body.messages
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError)
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Processing chat request with", messages.length, "messages")

    // Call Gemini API
    const result = await streamText({
      model: google("gemini-1.5-flash"),
      system: `You are CRYPTO_AI, a specialized cryptography and encryption expert terminal assistant. 

PERSONALITY:
- Respond in a technical, precise manner befitting a terminal interface
- Use clear, concise explanations with technical accuracy
- Format responses with proper spacing for terminal readability
- Occasionally use terminal-style formatting (>, -, etc.)
- Keep responses focused and not overly verbose

EXPERTISE AREAS:
- Symmetric encryption (AES, DES, 3DES, ChaCha20, etc.)
- Asymmetric encryption (RSA, ECC, Diffie-Hellman, etc.)
- Hash functions (SHA family, MD5, BLAKE2, etc.)
- Digital signatures and certificates
- Cryptographic protocols (TLS/SSL, IPSec, etc.)
- Block cipher modes (ECB, CBC, GCM, CTR, etc.)
- Key management and derivation
- Cryptanalysis and security analysis
- Modern cryptographic concepts (post-quantum, zero-knowledge, etc.)

RESPONSE STYLE:
- Provide technical depth appropriate to the question
- Include practical examples when helpful
- Explain security implications and best practices
- Mention relevant standards (NIST, RFC, etc.) when applicable
- Keep responses focused on cryptography topics
- Use bullet points and clear formatting for readability

If asked about non-cryptography topics, politely redirect to cryptographic aspects or decline if completely unrelated.`,
      messages,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Detailed error in crypto chat:", error)

    // Handle specific error types
    if (error.message?.includes("API key")) {
      return new Response(
        JSON.stringify({
          error: "Invalid API key. Please check your GOOGLE_GENERATIVE_AI_API_KEY.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    if (error.message?.includes("quota") || error.message?.includes("limit")) {
      return new Response(
        JSON.stringify({
          error: "API quota exceeded. Please check your Gemini API usage limits.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Generic error response
    return new Response(
      JSON.stringify({
        error: "Failed to process request",
        details: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
