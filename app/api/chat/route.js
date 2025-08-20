import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { message, audioBuffer } = await request.json();

    let transcribedText = message;

    // If audio buffer is provided, transcribe it first
    if (audioBuffer && !message) {
      transcribedText = await transcribeAudio(audioBuffer);
    }

    if (!transcribedText) {
      return NextResponse.json(
        { error: "No text to process" },
        { status: 400 }
      );
    }

    // Send to LLM (OpenAI example)
    const llmResponse = await callLLM(transcribedText);

    // Convert LLM response to speech
    const audioResponse = await textToSpeech(llmResponse);

    return NextResponse.json({
      transcribedText,
      llmResponse,
      audioUrl: audioResponse.url,
      audioBuffer: audioResponse.buffer,
    });
  } catch (error) {
    console.error("Error in LLM integration:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

async function transcribeAudio(audioBuffer) {
  try {
    // Using OpenAI Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([Buffer.from(audioBuffer, "base64")], {
      type: "audio/wav",
    });
    formData.append("file", audioBlob, "audio.wav");
    formData.append("model", "whisper-1");

    const response = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    const result = await response.json();
    return result.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

async function callLLM(text) {
  try {
    // Using OpenAI GPT
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful voice assistant. Keep responses conversational and concise since they will be spoken aloud.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const result = await response.json();
    return result.choices[0].message.content;
  } catch (error) {
    console.error("LLM error:", error);
    throw error;
  }
}

async function textToSpeech(text) {
  try {
    // Using OpenAI TTS
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text,
        voice: "alloy",
        response_format: "mp3",
      }),
    });

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return {
      buffer: base64Audio,
      url: `data:audio/mp3;base64,${base64Audio}`,
    };
  } catch (error) {
    console.error("TTS error:", error);
    throw error;
  }
}
