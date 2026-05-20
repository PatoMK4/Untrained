package com.untrained.app.data.remote

import com.google.gson.annotations.SerializedName
import retrofit2.http.Body
import retrofit2.http.POST

// ─────────────────────────────────────────────────────────────────
// Retrofit interface — Anthropic Claude Messages API
// Base URL: https://api.anthropic.com/
// ─────────────────────────────────────────────────────────────────

interface AnthropicApi {

    /**
     * Send a message to Claude (Haiku or other model).
     * Required headers (set in OkHttpClient interceptor):
     *   x-api-key: <ANTHROPIC_KEY>
     *   anthropic-version: 2023-06-01
     *   content-type: application/json
     */
    @POST("v1/messages")
    suspend fun sendMessage(@Body request: AnthropicRequest): AnthropicResponse
}

// ─────────────────────────────────────────────────────────────────
// Request / Response models
// ─────────────────────────────────────────────────────────────────

data class AnthropicRequest(
    /** e.g. "claude-haiku-4-5" */
    val model: String,

    /** Maximum tokens to generate in the response */
    @SerializedName("max_tokens")
    val max_tokens: Int,

    /** Optional system prompt */
    val system: String,

    /** Conversation turns */
    val messages: List<AnthropicMessage>
)

data class AnthropicMessage(
    /** "user" or "assistant" */
    val role: String,

    /** Plain text or structured content; we use plain text for chat */
    val content: String
)

data class AnthropicResponse(
    /** Always a list; for text responses the first element has type "text" */
    val content: List<AnthropicContent>,

    /** The stop reason: "end_turn", "max_tokens", "stop_sequence" */
    @SerializedName("stop_reason")
    val stopReason: String? = null,

    /** Which model actually served the request */
    val model: String? = null,

    /** Token usage statistics */
    val usage: AnthropicUsage? = null
)

data class AnthropicContent(
    /** Content block type: "text" or "tool_use" */
    val type: String = "text",

    /** The generated text (populated when type == "text") */
    val text: String
)

data class AnthropicUsage(
    @SerializedName("input_tokens")
    val inputTokens: Int = 0,

    @SerializedName("output_tokens")
    val outputTokens: Int = 0
)
