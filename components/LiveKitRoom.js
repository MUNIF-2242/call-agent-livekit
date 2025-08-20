"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useParticipants,
  useTracks,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track, Room, RoomEvent } from "livekit-client";

function MyVideoConference() {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [micEnabled, setMicEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Get audio tracks from all participants
  const audioTracks = useTracks([Track.Source.Microphone], {
    onlySubscribed: true,
  });

  const toggleMicrophone = () => {
    localParticipant.setMicrophoneEnabled(!micEnabled);
    setMicEnabled(!micEnabled);
  };

  const toggleAudio = () => {
    audioTracks.forEach(({ participant, publication }) => {
      if (publication.track) {
        publication.track.setEnabled(!audioEnabled);
      }
    });
    setAudioEnabled(!audioEnabled);
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2>Connected to Room</h2>
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
          }}
        >
          {micEnabled ? "Mute Mic" : "Unmute Mic"}
        </button>

        <button
          onClick={toggleAudio}
          style={{
            padding: "10px 15px",
            backgroundColor: audioEnabled ? "#28a745" : "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {audioEnabled ? "Mute Audio" : "Unmute Audio"}
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h3>Participants:</h3>
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

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
        }}
      >
        <h4>Audio Status:</h4>
        <p>Microphone: {micEnabled ? "✅ Enabled" : "❌ Disabled"}</p>
        <p>Audio Output: {audioEnabled ? "✅ Enabled" : "❌ Disabled"}</p>
        <p>Active Tracks: {audioTracks.length}</p>
      </div>

      {/* This component handles audio rendering */}
      <RoomAudioRenderer />
    </div>
  );
}

export default function LiveKitRoomWrapper({
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
        <h2>Room: {roomName}</h2>
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
        <MyVideoConference />
        <StartAudio label="Click to enable audio" />
      </LiveKitRoom>
    </div>
  );
}
