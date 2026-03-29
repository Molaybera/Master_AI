"""
voice_server.py — Offline speech-to-text WebSocket server
==========================================================
Uses the 'speech_recognition' library to capture your
microphone and stream recognised text back to the chat UI.

INSTALL (once):
    pip install speechrecognition websockets pyaudio

    # If pyaudio fails on Linux:
    sudo apt install portaudio19-dev python3-pyaudio
    pip install pyaudio

    # If pyaudio fails on Windows:
    pip install pipwin
    pipwin install pyaudio

RUN:
    python voice_server.py

Then click the mic button in the chat UI.
The server runs on ws://localhost:8765
"""

import asyncio
import json
import threading
import queue
import sys

try:
    import speech_recognition as sr
except ImportError:
    print("ERROR: speechrecognition not installed.")
    print("Run:  pip install speechrecognition")
    sys.exit(1)

try:
    import websockets
except ImportError:
    print("ERROR: websockets not installed.")
    print("Run:  pip install websockets")
    sys.exit(1)

# ── Config ────────────────────────────────────────────────
HOST        = "localhost"
PORT        = 8765
LANGUAGE    = "en-US"          # recognition language
ENERGY_THR  = 300              # mic sensitivity (lower = more sensitive)
PAUSE_SEC   = 0.8              # seconds of silence before phrase ends
PHRASE_LIMIT = 8               # max seconds per phrase
# ─────────────────────────────────────────────────────────

recognizer = sr.Recognizer()
recognizer.energy_threshold        = ENERGY_THR
recognizer.dynamic_energy_threshold = True
recognizer.pause_threshold         = PAUSE_SEC

print(f"[voice_server] Starting on ws://{HOST}:{PORT}")
print(f"[voice_server] Language: {LANGUAGE}")
print(f"[voice_server] Adjusting for ambient noise...")

# Calibrate once at startup
try:
    with sr.Microphone() as src:
        recognizer.adjust_for_ambient_noise(src, duration=1)
    print("[voice_server] Microphone ready.")
except Exception as e:
    print(f"[voice_server] WARNING: Could not open mic: {e}")
    print("[voice_server] Will try again when recording starts.")


class VoiceSession:
    """Manages one active recording session per WebSocket client."""

    def __init__(self, send_fn: callable, loop):
        self.send     = send_fn   # async send coroutine
        self.loop     = loop      # the event loop to schedule sends
        self.active   = False
        self.stop_fn  = None      # callable returned by listen_in_background
        self._phrase_q = queue.Queue()

    # ── Called by speech_recognition in a background thread ──
    def _callback(self, rec, audio):
        """Receives a completed audio phrase from the recogniser."""
        if not self.active:
            return
        try:
            # Use Google's free tier for online, or change to:
            #   rec.recognize_sphinx(audio)          — offline CMU Sphinx
            #   rec.recognize_vosk(audio, ...)       — offline Vosk
            text = rec.recognize_google(audio, language=LANGUAGE)
            text = text.strip()
            if text:
                self._phrase_q.put(("final", text))
        except sr.UnknownValueError:
            pass  # silence / unintelligible — skip
        except sr.RequestError as e:
            self._phrase_q.put(("error", f"Recognition service error: {e}"))

    def start(self):
        self.active = True
        try:
            mic = sr.Microphone()
            self.stop_fn = recognizer.listen_in_background(
                mic,
                self._callback,
                phrase_time_limit=PHRASE_LIMIT,
            )
            # Start the drain loop
            asyncio.run_coroutine_threadsafe(self._drain_loop(), self.loop)
        except Exception as e:
            asyncio.run_coroutine_threadsafe(
                self.send(json.dumps({"type": "error", "text": str(e)})),
                self.loop
            )

    def stop(self):
        self.active = False
        if self.stop_fn:
            try:
                self.stop_fn(wait_for_stop=False)
            except Exception:
                pass
            self.stop_fn = None
        # Signal drain loop to send 'done'
        self._phrase_q.put(("done", ""))

    async def _drain_loop(self):
        """Pulls results from the queue and sends them to the browser."""
        while True:
            try:
                kind, text = self._phrase_q.get(timeout=0.1)
            except queue.Empty:
                await asyncio.sleep(0.05)
                if not self.active and self._phrase_q.empty():
                    break
                continue

            if kind == "final":
                await self.send(json.dumps({"type": "final", "text": text}))
                print(f"[voice_server] Recognised: {text}")
            elif kind == "error":
                await self.send(json.dumps({"type": "error", "text": text}))
            elif kind == "done":
                await self.send(json.dumps({"type": "done"}))
                break

            if not self.active and self._phrase_q.empty():
                await self.send(json.dumps({"type": "done"}))
                break


# ── WebSocket handler ─────────────────────────────────────
async def handle(websocket):
    client = websocket.remote_address
    print(f"[voice_server] Client connected: {client}")

    loop    = asyncio.get_event_loop()
    session = VoiceSession(websocket.send, loop)

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            cmd = msg.get("cmd", "")

            if cmd == "start":
                if session.active:
                    continue
                print(f"[voice_server] Recording started for {client}")
                session.start()

            elif cmd == "stop":
                print(f"[voice_server] Recording stopped for {client}")
                session.stop()

    except websockets.exceptions.ConnectionClosedOK:
        pass
    except websockets.exceptions.ConnectionClosedError:
        pass
    finally:
        session.stop()
        print(f"[voice_server] Client disconnected: {client}")


# ── Entry point ───────────────────────────────────────────
async def main():
    print(f"[voice_server] Listening on ws://{HOST}:{PORT}")
    print("[voice_server] Open the chat UI and click the mic button.")
    print("[voice_server] Press Ctrl+C to stop.\n")

    async with websockets.serve(handle, HOST, PORT):
        await asyncio.Future()   # run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[voice_server] Stopped.")