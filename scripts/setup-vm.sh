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

# Remove old/conflicting Docker packages
sudo apt remove -y docker docker-engine docker.io containerd runc docker-compose docker-compose-plugin || true

# Install prerequisites
sudo apt install -y \
ca-certificates \
curl \
gnupg \
lsb-release

# Add Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker official repository
echo \
"deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
sudo apt update

sudo apt install -y \
docker-ce \
docker-ce-cli \
containerd.io \
docker-buildx-plugin \
docker-compose-plugin


# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add current user to docker group
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