#!/bin/bash

# Development startup script for Journal Notes application

echo "Starting Journal Notes Development Environment..."
echo ""

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed."
    echo "Please install uv: https://docs.astral.sh/uv/getting-started/installation/"
    exit 1
fi

# Check if backend dependencies are installed
if [ ! -d "backend/.venv" ]; then
    echo "Backend dependencies not found. Installing with uv..."
    cd backend
    uv sync
    cd ..
    echo "Backend setup complete!"
    echo ""
fi

# Check if frontend node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "Frontend dependencies not found. Installing..."
    cd frontend
    npm install
    cd ..
    echo "Frontend setup complete!"
    echo ""
fi

# Start backend in background
echo "Starting backend server on http://localhost:8000..."
cd backend
uv run uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 2

# Start frontend in background
echo "Starting frontend server on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✓ Backend running on http://localhost:8000"
echo "✓ Frontend running on http://localhost:5173"
echo "✓ API docs available at http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
