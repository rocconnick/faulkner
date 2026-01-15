# Journal Notes Frontend

React + TypeScript frontend for the Journal Notes application.

## Setup

Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Testing

Run tests once:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

Run tests with UI:
```bash
npm run test:ui
```

## Building

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Linting

Run ESLint:
```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx          # Main application component
│   ├── App.test.tsx     # App tests
│   ├── main.tsx         # Application entry point
│   └── test/
│       └── setup.ts     # Test configuration
├── public/              # Static assets
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── vitest.config.ts     # Vitest test configuration
```

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Vitest** - Testing framework
- **React Testing Library** - Component testing
- **fast-check** - Property-based testing
