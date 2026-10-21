"""Opt-in synthetic local media peer. No hardware capture and no real CRM data.

Requires the disposable chat_preview.py + fixtures/livekit-local.yaml, and the
optional `livekit` RTC SDK (not a production backend dependency).
Run CHAT_PREVIEW=1 <temporary-venv>/bin/python tests/local_media_probe.py
Start a video call from the preview browser within 120 seconds.
"""
import asyncio
import os
import time

if os.getenv("CHAT_PREVIEW") != "1":
    raise SystemExit("This synthetic probe requires CHAT_PREVIEW=1")

import httpx
from livekit import rtc


async def main():
    room = rtc.Room()
    async with httpx.AsyncClient(base_url="http://127.0.0.1:8137/api/chat", headers={"Authorization": "Bearer preview-bob"}, timeout=15) as client:
        cid = call_id = None
        for _ in range(120):
            response = await client.get("/conversations")
            response.raise_for_status()
            for conversation in response.json()["data"]:
                if conversation.get("activeCallId"):
                    cid, call_id = conversation["id"], conversation["activeCallId"]
                    break
            if call_id:
                break
            await asyncio.sleep(1)
        if not call_id:
            raise RuntimeError("No local preview call started within 120 seconds")
        response = await client.post(f"/conversations/{cid}/calls/{call_id}/join")
        response.raise_for_status()
        session = response.json()["data"]
        if session["serverUrl"] != "ws://127.0.0.1:17880":
            raise RuntimeError("Probe refuses any non-loopback media server")
        await room.connect(session["serverUrl"], session["token"])
        audio = rtc.AudioSource(48000, 1)
        video = rtc.VideoSource(320, 180)
        await room.local_participant.publish_track(rtc.LocalAudioTrack.create_audio_track("synthetic-silence", audio), rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))
        if session["call"]["kind"] == "video":
            await room.local_participant.publish_track(rtc.LocalVideoTrack.create_video_track("synthetic-test-pattern", video), rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_CAMERA))
        result = await client.post(f"/conversations/{cid}/calls/{call_id}/connected")
        result.raise_for_status()
        print("LOCAL_MEDIA_CONNECTED", result.json()["data"]["status"], "participants", len(result.json()["data"]["participants"]), flush=True)
        try:
            for index in range(2400):  # At most two minutes. Ctrl-C is also safe.
                if not room.isconnected():
                    break
                if index % 10 == 0:
                    # Generated RGB pixels only; no camera, screen or microphone input.
                    pixels = bytes((20 + (index // 10) % 80, 160, 180)) * (320 * 180)
                    video.capture_frame(rtc.VideoFrame(320, 180, rtc.VideoBufferType.RGB24, pixels), timestamp_us=int(time.monotonic() * 1_000_000))
                await audio.capture_frame(rtc.AudioFrame(bytes(4800), 48000, 1, 2400))
                await asyncio.sleep(0.05)
        finally:
            await room.disconnect()
            await audio.aclose()
            await video.aclose()
        print("LOCAL_MEDIA_DISCONNECTED", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
