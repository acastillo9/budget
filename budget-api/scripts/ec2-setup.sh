#!/bin/bash
set -euo pipefail

# =============================================================================
# EC2 One-Time Bootstrap Script
# =============================================================================
# Prerequisites:
#   1. Launch EC2: Ubuntu 22.04 LTS, t3.small (or t3.micro), 20GB EBS
#   2. Security Group: allow inbound SSH (22), HTTP (80), HTTPS (443)
#   3. SSH into the instance and run this script:
#      chmod +x ec2-setup.sh && ./ec2-setup.sh
# =============================================================================

echo "==> Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

echo "==> Installing Docker..."
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Adding current user to docker group..."
sudo usermod -aG docker "$USER"

echo "==> Configuring firewall (UFW)..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "==> Creating app directory..."
mkdir -p ~/budget-api/nginx
mkdir -p ~/budget-api/scripts

echo "==> Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Log out and back in (for docker group to take effect)"
echo "  2. Copy docker-compose.yml, nginx/, and scripts/ to ~/budget-api/"
echo "  3. Create .env from .env.example with production values"
echo "  4. Whitelist this EC2 IP in MongoDB Atlas"
echo "  5. Point your domain DNS A record to this EC2 public IP"
echo "  6. Run scripts/ssl-init.sh to obtain SSL certificate"
echo "  7. Run: docker compose up -d"
echo "  8. Add cron for SSL renewal: 0 3 * * * ~/budget-api/scripts/ssl-renew.sh"
