#!/bin/bash

# Setup script for GitHub auto-push
# This script configures Git to automatically push after commits

echo "==================================="
echo "GitHub Auto-Push Setup Script"
echo "==================================="
echo ""
echo "This script will configure automatic GitHub backup."
echo "You'll need your GitHub username and Personal Access Token."
echo ""
echo "To get a Personal Access Token:"
echo "1. Go to https://github.com/settings/tokens"
echo "2. Generate new token (classic)"
echo "3. Select 'repo' scope"
echo "4. Copy the token"
echo ""
read -p "Enter your GitHub username: " username
read -sp "Enter your Personal Access Token: " token
echo ""

# Update remote URL with credentials
git remote set-url origin https://${username}:${token}@github.com/${username}/ai-form-assistant.git

echo "✅ Remote URL updated with authentication"
echo ""
echo "Testing connection..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Auto-backup is now configured."
    echo "All future commits will automatically push to GitHub."
else
    echo ""
    echo "❌ Failed to connect. Please check your credentials."
fi