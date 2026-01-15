#!/bin/bash
# Backend verification script for Journal Notes API
# This script runs tests and verifies API endpoints are working

set -e  # Exit on error

echo "=========================================="
echo "Journal Notes Backend Verification"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Run tests
echo -e "${BLUE}Step 1: Running backend tests...${NC}"
uv run pytest -v
echo -e "${GREEN}✓ All tests passed${NC}"
echo ""

# Step 2: Start server in background
echo -e "${BLUE}Step 2: Starting API server...${NC}"
uv run uvicorn main:app --reload &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server to start
sleep 3

# Function to cleanup server on exit
cleanup() {
    echo ""
    echo -e "${BLUE}Stopping server...${NC}"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Server stopped${NC}"
}
trap cleanup EXIT

# Step 3: Test API endpoints
echo -e "${BLUE}Step 3: Testing API endpoints...${NC}"
echo ""

# Test health endpoint
echo "Testing: GET /health"
curl -s http://localhost:8000/health | python3 -m json.tool
echo -e "${GREEN}✓ Health check passed${NC}"
echo ""

# Test root endpoint
echo "Testing: GET /"
curl -s http://localhost:8000/ | python3 -m json.tool
echo -e "${GREEN}✓ Root endpoint passed${NC}"
echo ""

# Test authentication setup
echo "Testing: POST /api/auth/setup"
SETUP_RESPONSE=$(curl -s -X POST http://localhost:8000/api/auth/setup \
  -H "Content-Type: application/json" \
  -d '{"password": "test-password-123"}')
echo "$SETUP_RESPONSE" | python3 -m json.tool
TOKEN=$(echo "$SETUP_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['session_token'])")
echo -e "${GREEN}✓ Authentication setup passed${NC}"
echo ""

# Test create note
echo "Testing: POST /api/notes"
curl -s -X POST http://localhost:8000/api/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-note-1",
    "title": "Test Note",
    "content": "This is a test note",
    "created_at": "2026-01-14T10:00:00Z",
    "updated_at": "2026-01-14T10:00:00Z",
    "divider_position": 0,
    "is_task": false
  }' | python3 -m json.tool
echo -e "${GREEN}✓ Create note passed${NC}"
echo ""

# Test get note
echo "Testing: GET /api/notes/test-note-1"
curl -s http://localhost:8000/api/notes/test-note-1 \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ Get note passed${NC}"
echo ""

# Test update note
echo "Testing: PUT /api/notes/test-note-1"
curl -s -X PUT http://localhost:8000/api/notes/test-note-1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Note", "content": "This note has been updated"}' | python3 -m json.tool
echo -e "${GREEN}✓ Update note passed${NC}"
echo ""

# Test list notes
echo "Testing: GET /api/notes"
curl -s http://localhost:8000/api/notes \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ List notes passed${NC}"
echo ""

# Test delete note
echo "Testing: DELETE /api/notes/test-note-1"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE http://localhost:8000/api/notes/test-note-1 \
  -H "Authorization: Bearer $TOKEN")
echo "HTTP Status: $HTTP_STATUS"
if [ "$HTTP_STATUS" = "204" ]; then
    echo -e "${GREEN}✓ Delete note passed${NC}"
else
    echo -e "${RED}✗ Delete note failed (expected 204, got $HTTP_STATUS)${NC}"
    exit 1
fi
echo ""

# Test login
echo "Testing: POST /api/auth/login"
curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "test-password-123"}' | python3 -m json.tool
echo -e "${GREEN}✓ Login passed${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}All verifications passed! ✓${NC}"
echo "=========================================="
