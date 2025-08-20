"use client";

import { useEffect, useState, useRef } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useParticipants,
  useTracks,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track, Room, RoomEvent } from "livekit-client";

function AIVoiceConference() {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [micEnabled, setMicEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const audioTracks = useTracks([Track.Source.Microphone], {
    onlySubscribed: true,
  });

  // Initialize audio recording
  useEffect(() => {
    if (aiEnabled) {
      initializeRecording();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [aiEnabled]);

  const initializeRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        audioChunksRef.current = [];
        await processAudioWithAI(audioBlob);
      };
    } catch (error) {
      console.error("Error initializing recording:", error);
    }
  };

  const startRecording = () => {
    if (mediaRecorderRef.current && !isRecording) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioWithAI = async (audioBlob) => {
    setIsProcessing(true);
    try {
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioBuffer: base64Audio,
        }),
      });

      const result = await response.json();

      if (result.transcribedText && result.llmResponse) {
        // Add to conversation history
        setConversation((prev) => [
          ...prev,
          { type: "user", text: result.transcribedText, timestamp: new Date() },
          { type: "ai", text: result.llmResponse, timestamp: new Date() },
        ]);

        // Play AI response audio
        if (result.audioUrl) {
          const audio = new Audio(result.audioUrl);
          audio.play().catch(console.error);
        }
      }
    } catch (error) {
      console.error("Error processing audio with AI:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendTextToAI = async (text) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const result = await response.json();

      if (result.llmResponse) {
        setConversation((prev) => [
          ...prev,
          { type: "user", text: text, timestamp: new Date() },
          { type: "ai", text: result.llmResponse, timestamp: new Date() },
        ]);

        if (result.audioUrl) {
          const audio = new Audio(result.audioUrl);
          audio.play().catch(console.error);
        }
      }
    } catch (error) {
      console.error("Error sending text to AI:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMicrophone = () => {
    localParticipant.setMicrophoneEnabled(!micEnabled);
    setMicEnabled(!micEnabled);
  };

  const toggleAI = () => {
    setAiEnabled(!aiEnabled);
    if (isRecording) {
      stopRecording();
    }
  };

  return (
    <div style={{ padding: "20px", display: "flex", gap: "20px" }}>
      {/* Left Panel - Controls */}
      <div style={{ flex: "0 0 300px" }}>
        <div style={{ marginBottom: "20px" }}>
          <h3>Room Info</h3>
          <p>Participants: {participants.length}</p>
          <p>Your name: {localParticipant.identity}</p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={toggleMicrophone}
            style={{
              padding: "10px 15px",
              marginRight: "10px",
              backgroundColor: micEnabled ? "#28a745" : "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "block",
              width: "100%",
              marginBottom: "10px",
            }}
          >
            {micEnabled ? "Mute Mic" : "Unmute Mic"}
          </button>

          <button
            onClick={toggleAI}
            style={{
              padding: "10px 15px",
              backgroundColor: aiEnabled ? "#17a2b8" : "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "block",
              width: "100%",
              marginBottom: "10px",
            }}
          >
            {aiEnabled ? "AI Assistant ON" : "AI Assistant OFF"}
          </button>

          {aiEnabled && (
            <div>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                style={{
                  padding: "10px 15px",
                  backgroundColor: isRecording ? "#dc3545" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  display: "block",
                  width: "100%",
                  marginBottom: "10px",
                }}
              >
                {isProcessing
                  ? "Processing..."
                  : isRecording
                  ? "Stop Recording"
                  : "Start Recording"}
              </button>

              <TextInput onSend={sendTextToAI} disabled={isProcessing} />
            </div>
          )}
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4>Participants:</h4>
          <ul>
            {participants.map((participant) => (
              <li key={participant.sid} style={{ marginBottom: "5px" }}>
                {participant.identity}
                {participant.isSpeaking && " 🎤"}
                {participant === localParticipant && " (You)"}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel - Conversation */}
      <div style={{ flex: 1 }}>
        {aiEnabled && (
          <div>
            <h3>AI Conversation</h3>
            <div
              style={{
                height: "400px",
                overflowY: "auto",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "10px",
                backgroundColor: "#f8f9fa",
              }}
            >
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: "10px",
                    padding: "8px",
                    borderRadius: "4px",
                    backgroundColor:
                      msg.type === "user" ? "#e3f2fd" : "#f3e5f5",
                  }}
                >
                  <strong>{msg.type === "user" ? "You" : "AI"}:</strong>
                  <p style={{ margin: "5px 0 0 0" }}>{msg.text}</p>
                  <small style={{ color: "#666" }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </small>
                </div>
              ))}
              {isProcessing && (
                <div style={{ textAlign: "center", color: "#666" }}>
                  AI is thinking...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <RoomAudioRenderer />
    </div>
  );
}

function TextInput({ onSend, disabled }) {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text);
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: "5px" }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type message to AI..."
        disabled={disabled}
        style={{
          flex: 1,
          padding: "8px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        style={{
          padding: "8px 12px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        Send
      </button>
    </form>
  );
}

export default function AILiveKitRoomWrapper({
  token,
  wsUrl,
  onDisconnect,
  participantName,
  roomName,
}) {
  const [room, setRoom] = useState(null);

  useEffect(() => {
    const roomInstance = new Room();
    setRoom(roomInstance);

    roomInstance.on(RoomEvent.Disconnected, () => {
      console.log("Disconnected from room");
      onDisconnect();
    });

    roomInstance.on(RoomEvent.Connected, () => {
      console.log("Connected to room");
    });

    return () => {
      roomInstance.disconnect();
    };
  }, [onDisconnect]);

  const handleDisconnect = () => {
    if (room) {
      room.disconnect();
    }
    onDisconnect();
  };

  return (
    <div>
      <div
        style={{
          padding: "10px 20px",
          backgroundColor: "#007bff",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>AI-Enhanced Room: {roomName}</h2>
        <button
          onClick={handleDisconnect}
          style={{
            padding: "8px 15px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Leave Room
        </button>
      </div>

      <LiveKitRoom
        video={false}
        audio={true}
        token={token}
        serverUrl={wsUrl}
        data-lk-theme="default"
        style={{ height: "100vh" }}
        onDisconnected={onDisconnect}
      >
        <AIVoiceConference />
        <StartAudio label="Click to enable audio" />
      </LiveKitRoom>
    </div>
  );
}
