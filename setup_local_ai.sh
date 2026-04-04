#!/usr/bin/env bash
set -e

echo "============================================"
echo "  Mechela - Local AI Setup (Mac/Linux)"
echo "============================================"
echo ""

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "[OK] Ollama is already installed."
else
    echo "[..] Ollama not found. Installing..."
    if curl -fsSL https://ollama.com/install.sh | sh; then
        echo "[OK] Ollama installed successfully."
    else
        echo ""
        echo "[ERROR] Automatic installation failed."
        echo "Please install Ollama manually from:"
        echo "  https://ollama.com/download"
        echo ""
        echo "After installing, run this script again."
        exit 1
    fi
fi

# Start Ollama service if not running
echo "[..] Ensuring Ollama service is running..."
if ! pgrep -x "ollama" > /dev/null 2>&1; then
    ollama serve &> /dev/null &
    sleep 3
fi

# Pull chat model
echo ""
echo "[..] Pulling gemma3:4b chat model (~3.3 GB)..."
echo "    This may take a few minutes on first run."
if ollama pull gemma3:4b; then
    echo "[OK] gemma3:4b ready."
else
    echo "[ERROR] Failed to pull gemma3:4b. Is Ollama running?"
    echo "  Try: ollama serve   (in another terminal)"
    exit 1
fi

# Pull embedding model
echo ""
echo "[..] Pulling nomic-embed-text embedding model (~270 MB)..."
if ollama pull nomic-embed-text; then
    echo "[OK] nomic-embed-text ready."
else
    echo "[ERROR] Failed to pull nomic-embed-text."
    exit 1
fi

# Done
echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Open Mechela and select \"Local AI\" in"
echo "  Settings to start using local models."
echo "============================================"
