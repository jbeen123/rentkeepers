from app import app

# Vercel serverless handler
# This file must expose an 'app' variable that WSGI can use

# For Vercel, we need to use app as the handler
handler = app
