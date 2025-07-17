"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface OfferPayload { 
  target: string;
  caller: string; 
  sdp: RTCSessionDescriptionInit; 
}
interface AnswerPayload { 
  target: string; 
  caller: string; 
  sdp: RTCSessionDescriptionInit; 
}
interface IceCandidatePayload { 
  target: string; 
  candidate: RTCIceCandidate; 
}

const Notification = ({ message, type }: { message: string; type: 'info' | 'error' }) => {
  const bgColor = type === 'info' ? 'bg-blue-500' : 'bg-red-500';
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white shadow-lg z-50 animate-fade-in-down ${bgColor}`}>
      {message}
    </div>
  );
};

export default function Home() {
  const [roomId, setRoomId] = useState<string>("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [otherUser, setOtherUser] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'error' } | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL!);

    setSocket(newSocket);

    return () => { newSocket.disconnect(); };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  const createPeerConnection = useCallback((peerId: string) => {
    const peerConnection = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit("ice-candidate", { target: peerId, candidate: event.candidate });
      }
    };

    peerConnection.ontrack = (event) => {
      setIsConnecting(false);
      setRemoteStream(event.streams[0]);
    };

    if (localStream) {
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    pc.current = peerConnection;

    return pc.current;
  }, [socket, localStream]);
  
  useEffect(() => {
    if (!socket) return;

    socket.on("initiate-call", async ({ peerId }) => {
      setNotification({ message: 'A user has joined!', type: 'info' });
      setOtherUser(peerId);
      setIsConnecting(true);
      const peerConnection = createPeerConnection(peerId);

      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("offer", { target: peerId, caller: socket.id, sdp: peerConnection.localDescription });
      } catch (error) { 
        console.error("Error creating offer:", error); 
      }
    });

    socket.on("peer-present", ({ peerId }) => { setOtherUser(peerId); setIsConnecting(true); });

    socket.on("offer", async (payload: OfferPayload) => {
      const peerConnection = createPeerConnection(payload.caller);

      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("answer", { target: payload.caller, caller: socket.id, sdp: peerConnection.localDescription });
      } catch (error) { 
        console.error("Error handling offer:", error); 
      }
    });

    socket.on("answer", async (payload: AnswerPayload) => {
      if (pc.current && pc.current.signalingState === "have-local-offer") {
        await pc.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      }
    });

    socket.on("ice-candidate", async (payload: IceCandidatePayload) => {
      if (pc.current && pc.current.remoteDescription) {
        await pc.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    socket.on("user-disconnected", () => {
      setNotification({ message: 'The other user has left.', type: 'error' });
      setOtherUser(null);
      setRemoteStream(null);
      setIsConnecting(false);
      if (pc.current) { 
        pc.current.close(); 
        pc.current = null; 
      }
    });

    return () => {
      socket.off("initiate-call");
      socket.off("peer-present");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("user-disconnected");
    };
  }, [socket, createPeerConnection]);

  const joinRoomById = async (id: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      socket?.emit("join-room", id);
    } catch (error) { 
      console.error("Could not get media stream:", error); 
    }
  };
  
  const handleCreateAndJoin = () => {
    const newRoomId = Math.floor(Math.random() * 0xFFFF).toString(16).padStart(4, '0');
    setRoomId(newRoomId);
    joinRoomById(newRoomId);
  };
  
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 flex flex-col items-center justify-center p-4 overflow-hidden">
      {notification && <Notification message={notification.message} type={notification.type} />}
      <main className="w-full max-w-7xl mx-auto flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white tracking-wider">TensorGo Assignment</h1>
        
        {!localStream ? (
          <div className="flex flex-col items-center gap-4 bg-gray-900 p-8 rounded-xl shadow-2xl mt-8">
            <div className="flex w-full max-w-sm items-center space-x-2">
              <input type="text" value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter Room ID" className="px-4 py-3 w-full border rounded-lg bg-gray-800 text-white border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              <button onClick={() => joinRoomById(roomId)} disabled={!roomId} className="px-6 py-3 font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-all duration-200 whitespace-nowrap disabled:bg-gray-600 disabled:cursor-not-allowed">Join</button>
            </div>
            <p className="text-gray-500">or</p>
            <button onClick={handleCreateAndJoin} className="px-8 py-3 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all duration-200">Create a New Room</button>
          </div>
        ) : (
          <div className="w-full">
            <div className="text-center mb-4 h-12">
              <p className="text-gray-400">Room ID: <span className="font-bold text-yellow-400">{roomId}</span></p>
              {!otherUser && !remoteStream && <p className="text-gray-400 mt-2 animate-pulse">Waiting for another user to join...</p>}
              {isConnecting && <p className="text-blue-400 mt-2 text-lg animate-pulse">User found. Connecting...</p>}
            </div>
            
            <div className="relative w-full max-w-5xl mx-auto mt-4 bg-gray-900 rounded-lg aspect-video shadow-2xl border-4 border-gray-800">
              {remoteStream ? (
                <>
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover rounded-lg transform scale-x-[-1]" />
                  <div className="absolute bottom-5 right-5 w-40 md:w-48 h-auto aspect-video z-10">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover rounded-lg border-2 border-purple-500 shadow-md transform scale-x-[-1]" />
                    {isVideoOff && <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-lg"><p className="text-white">You</p></div>}
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="relative max-w-3xl h-full">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-auto h-full object-contain rounded-lg transform scale-x-[-1]" />
                    {isVideoOff && <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-lg"><p className="text-white text-2xl">Camera Off</p></div>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4 mt-8">
              <button onClick={toggleMic} className={`px-6 py-3 rounded-full font-semibold transition-all ${isMicMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}>{isMicMuted ? 'Unmute' : 'Mute'}</button>
              <button onClick={toggleVideo} className={`px-6 py-3 rounded-full font-semibold transition-all ${isVideoOff ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}>{isVideoOff ? 'Start Camera' : 'Stop Camera'}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}