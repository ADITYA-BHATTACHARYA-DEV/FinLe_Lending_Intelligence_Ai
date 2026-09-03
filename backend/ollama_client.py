# """
# Thin wrapper around a local Ollama server running llama3.1.

# Requires Ollama installed and running locally (https://ollama.com):
#     ollama pull llama3.1
#     ollama serve            # usually already running as a background service

# No API key needed - everything runs on http://localhost:11434.
# """
# import os
# import json
# import urllib.request
# import urllib.error

# OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")
# OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1")
# TIMEOUT_SECONDS = 60


# def is_ollama_available():
#     try:
#         req = urllib.request.Request(f"{OLLAMA_HOST}/api/tags")
#         with urllib.request.urlopen(req, timeout=3) as resp:
#             return resp.status == 200
#     except Exception:
#         return False


# def chat(messages, temperature=0.4, max_tokens=400):
#     """
#     messages: list of {"role": "system"|"user"|"assistant", "content": str}
#     Returns the assistant's text reply, or a clear error string if Ollama is unreachable.
#     """
#     payload = {
#         "model": OLLAMA_MODEL,
#         "messages": messages,
#         "stream": False,
#         "options": {"temperature": temperature, "num_predict": max_tokens},
#     }
#     data = json.dumps(payload).encode("utf-8")
#     req = urllib.request.Request(
#         f"{OLLAMA_HOST}/api/chat",
#         data=data,
#         headers={"Content-Type": "application/json"},
#         method="POST",
#     )
#     try:
#         with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
#             body = json.loads(resp.read().decode("utf-8"))
#             return body.get("message", {}).get("content", "").strip()
#     except urllib.error.URLError as e:
#         return (
#             "[Ollama unreachable] Could not reach a local Ollama server at "
#             f"{OLLAMA_HOST}. Make sure Ollama is installed and running "
#             f"(`ollama serve`) and that the model is pulled (`ollama pull {OLLAMA_MODEL}`). "
#             f"Details: {e}"
#         )
#     except Exception as e:
#         return f"[Ollama error] {e}"










"""
Local Ollama client for the EPIC Credit Intelligence dashboard.

Requires:
    ollama pull llama3.1

Ollama normally runs at:
    http://localhost:11434
"""

import os
import json
import urllib.request
import urllib.error


OLLAMA_HOST = os.environ.get(
    "OLLAMA_HOST",
    "http://localhost:11434"
).rstrip("/")

OLLAMA_MODEL = os.environ.get(
    "OLLAMA_MODEL",
    "llama3.1"
)

TIMEOUT_SECONDS = 60


def is_ollama_available():
    """Return True when the local Ollama server is reachable."""

    try:
        req = urllib.request.Request(
            f"{OLLAMA_HOST}/api/tags",
            method="GET"
        )

        with urllib.request.urlopen(req, timeout=3) as resp:
            return resp.status == 200

    except Exception:
        return False


def chat(messages, temperature=0.4, max_tokens=400):
    """
    Send chat messages to Ollama.

    messages:
        [
            {"role": "system", "content": "..."},
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ]

    Returns:
        Assistant response string.
    """

    if not messages:
        return "[Ollama error] No messages were provided."

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens
        }
    }

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        f"{OLLAMA_HOST}/api/chat",
        data=data,
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=TIMEOUT_SECONDS
        ) as response:

            raw = response.read().decode("utf-8")
            body = json.loads(raw)

            reply = (
                body
                .get("message", {})
                .get("content", "")
                .strip()
            )

            if not reply:
                return "[Ollama error] Ollama returned an empty response."

            return reply

    except urllib.error.HTTPError as e:
        try:
            details = e.read().decode("utf-8")
        except Exception:
            details = str(e)

        return (
            f"[Ollama HTTP error {e.code}] {details}"
        )

    except urllib.error.URLError as e:
        return (
            "[Ollama unreachable] Could not reach "
            f"{OLLAMA_HOST}. "
            "Make sure Ollama is running with "
            "`ollama serve` and that the model exists with "
            f"`ollama pull {OLLAMA_MODEL}`. "
            f"Details: {e}"
        )

    except TimeoutError:
        return (
            "[Ollama timeout] The model took too long to respond."
        )

    except Exception as e:
        return f"[Ollama error] {e}"