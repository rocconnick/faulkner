# Journal Notes Backend

FastAPI backend for the Journal Notes application.

## Setup

This project uses [uv](https://docs.astral.sh/uv/) for fast Python dependency management.

1. Install dependencies and create virtual environment:
```bash
uv sync
```

That's it! `uv` will automatically create a `.venv` directory and install all dependencies.

## Running the Server

Development mode with auto-reload:
```bash
uv run uvicorn main:app --reload
```

Or activate the virtual environment first:
```bash
source .venv/bin/activate  # On macOS/Linux
# or
.venv\Scripts\activate  # On Windows

uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

API documentation (Swagger UI): `http://localhost:8000/docs`

## Testing

Run all tests:
```bash
uv run pytest
```

Run tests with verbose output:
```bash
uv run pytest -v
```

Run tests with coverage:
```bash
uv run pytest --cov
```

### Full Backend Integration Verification

Run the complete integration verification script (tests + API endpoint checks):
```bash
./verify.sh
```
## Adding Dependencies

Add a new dependency:
```bash
uv add package-name
```

Add a development dependency:
```bash
uv add --dev package-name
```

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── pyproject.toml       # Project configuration and dependencies
├── uv.lock              # Locked dependency versions
├── tests/               # Test files
│   ├── __init__.py
│   └── test_main.py
└── .venv/               # Virtual environment (not in git)
```

## API Endpoints

- `GET /` - Root endpoint with API info
- `GET /health` - Health check endpoint

More endpoints will be added as features are implemented.
