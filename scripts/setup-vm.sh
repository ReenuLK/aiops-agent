#!/bin/bash

set -e

echo "========================================"
echo "Updating Ubuntu"
echo "========================================"

sudo apt update
sudo apt upgrade -y

echo "========================================"
echo "Installing Docker"
echo "========================================"

sudo apt install -y docker.io docker-compose-plugin

sudo systemctl enable docker
sudo systemctl start docker

sudo usermod -aG docker $USER

echo "========================================"
echo "Installing Python"
echo "========================================"

sudo apt install -y \
python3-pip \
python3-venv \
git \
curl \
tmux

echo "========================================"
echo "Installing NodeJS"
echo "========================================"

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

sudo apt install -y nodejs

echo "========================================"
echo "Installing Ollama"
echo "========================================"

curl -fsSL https://ollama.com/install.sh | sh

echo "========================================"
echo "Downloading Model"
echo "========================================"

ollama pull llama3.1:8b

echo ""
echo "========================================"
echo "VM setup completed."
echo ""
echo "Please logout and SSH again"
echo "before using Docker."
echo "========================================"