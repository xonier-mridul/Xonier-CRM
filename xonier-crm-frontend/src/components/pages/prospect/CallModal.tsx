"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, Mic, MicOff, Volume2, VolumeX, PhoneOff } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  phone: string;
  onClose: () => void;
}

export default function Calling({ phone, onClose }: Props) {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        streamRef.current = stream;

        if (audioRef.current) {
          audioRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Microphone permission denied", err);
      }
    };

    initAudio();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleMute = () => {
    if (!streamRef.current) return;

    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = isMuted;
    });

    setIsMuted(!isMuted);
  };

  const toggleSpeaker = () => {
    if (audioRef.current) {
      audioRef.current.muted = isSpeakerOn;
    }

    setIsSpeakerOn(!isSpeakerOn);
  };

  const handleEndCall = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    onClose();
  };

  return (
    <div className="w-full p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 text-blue-600 p-4 rounded-full">
            <Phone size={28} />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          {t("calling_2")}
        </h2>

        <p className="text-gray-500 mt-1">{phone}</p>

        <div className="text-blue-600 text-xl font-semibold mt-3">
          {formatTime()}
        </div>

        <div className="flex justify-center gap-6 mt-6">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full ${
              isMuted ? "bg-red-500 text-white" : "bg-blue-100 text-blue-600"
            }`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <button
            onClick={toggleSpeaker}
            className={`p-3 rounded-full ${
              isSpeakerOn
                ? "bg-blue-600 text-white"
                : "bg-blue-100 text-blue-600"
            }`}
          >
            {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>

          <button
            onClick={handleEndCall}
            className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700"
          >
            <PhoneOff size={20} />
          </button>
        </div>

        <audio ref={audioRef} autoPlay hidden />
      </div>
    </div>
  );
}