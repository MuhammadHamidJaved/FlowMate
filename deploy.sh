#!/bin/bash

# Deployment script for FlowMate on Vercel

echo "🚀 Deploying FlowMate to Vercel..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Deploy to production
echo "📦 Deploying to production..."
vercel --prod

echo "✅ Deployment complete!"
echo "🔗 Don't forget to update Firebase authorized domains with your new Vercel URL"
echo "📋 Firebase Console: https://console.firebase.google.com/project/flowmate-4a79c/authentication/settings"
