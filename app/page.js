"use client";

import { useState } from "react";
import LiveKitRoom from "../components/LiveKitRoom";
import AILiveKitRoom from "../components/AILiveKitRoom";

export default function Home() {
  const [token, setToken] = useState("");
  const [wsUrl, setWsUrl] = useState(process.env.NEXT_PUBLIC_LIVEKIT_URL);
  const [roomName, setRoomName] = useState("test-room");
  const [participantName, setParticipantName] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [useAI, setUseAI] = useState(true);

  const connectToRoom = async () => {
    if (!participantName.trim()) {
      alert("Please enter your name");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomName,
          participantName,
        }),
      });

      const data = await response.json();
      if (data.token) {
        setToken(data.token);
        setConnected(true);
      } else {
        alert("Failed to get access token");
      }
    } catch (error) {
      console.error("Error connecting:", error);
      alert("Failed to connect to room");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setToken("");
    setConnected(false);
  };

  if (connected && token) {
    const RoomComponent = useAI ? AILiveKitRoom : LiveKitRoom;
    return (
      <RoomComponent
        token={token}
        wsUrl={wsUrl}
        onDisconnect={disconnect}
        participantName={participantName}
        roomName={roomName}
      />
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "50px auto" }}>
      <h1>LiveKit Speech-to-Speech Test</h1>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Your Name:
        </label>
        <input
          type="text"
          value={participantName}
          onChange={(e) => setParticipantName(e.target.value)}
          placeholder="Enter your name"
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          Room Name:
        </label>
        <input
          type="text"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          placeholder="Enter room name"
          style={{
            width: "100%",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            style={{ marginRight: "8px" }}
          />
          Enable AI Assistant
        </label>
      </div>

      <button
        onClick={connectToRoom}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          backgroundColor: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Connecting..." : "Join Room"}
      </button>

      <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
        <p>
          <strong>Instructions:</strong>
        </p>
        <ul>
          <li>Enter your name and room name</li>
          <li>Click "Join Room" to connect</li>
          <li>Allow microphone permissions</li>
          <li>Start speaking to test the audio</li>
        </ul>
      </div>
    </div>
  );
}
