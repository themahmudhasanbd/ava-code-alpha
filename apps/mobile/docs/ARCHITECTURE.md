# AvA Code Alpha — Mobile Application Architecture Specification

## 1. Overview & Architectural Principles

**AvA Code Alpha Mobile** is built using **Clean Layered Architecture** with strict separation of concerns, single-responsibility layers, and reactive state management.

```
┌──────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                          │
│  • UI Screens (Login, Chat, Threads, Providers, Terminal)        │
│  • Shadcn Design System (Buttons, Cards, Inputs, Badges, Diffs)   │
│  • Reactive State Controllers (ChangeNotifier / ValueNotifier)  │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────┐
│                        Domain Layer                              │
│  • Business Entities (UserSession, ThreadEntity, TurnEntity)     │
│  • Repository Interfaces (IAuthRepository, IThreadRepository)    │
│  • Use Cases / Interactors                                       │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────┐
│                         Data Layer                               │
│  • Repository Implementations (AuthRepoImpl, ThreadRepoImpl)     │
│  • Models & JSON Serialization (ThreadModel, TurnModel)          │
│  • Data Sources (Remote App-Server JSON-RPC, Local Storage)      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
┌─────────────────────────────────▼────────────────────────────────┐
│                         Core Layer                               │
│  • Shadcn Theme Tokens, Colors (Zinc-950), Typography, Curves    │
│  • Networking (JSON-RPC v2 Protocol, WebSocket, SSE Client)      │
│  • Secure Storage Service (Encrypted Tokens, Preferences)        │
│  • Diff Parser & Syntax Utilities                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
apps/mobile/lib/
├── core/
│   ├── constants/               # API endpoints, app constants, asset paths
│   ├── network/                 # JSON-RPC 2.0 client, WebSocket, SSE Streamer
│   ├── storage/                 # SecureStorageService (credentials & sessions)
│   ├── theme/                   # Shadcn theme tokens, Zinc colors, typography, motion
│   └── utils/                   # Diff parser, loggers, formatters
├── data/
│   ├── datasources/             # RemoteAppServerDataSource, LocalAuthDataSource
│   ├── models/                  # Data Transfer Objects with fromJson / toJson
│   └── repositories/            # Repository implementations
├── domain/
│   ├── entities/                # Core business domain entities
│   ├── repositories/            # Abstract repository interfaces
│   └── usecases/                # Encapsulated business actions
├── presentation/
│   ├── components/              # Shadcn-inspired reusable UI primitives
│   ├── navigation/              # Route definitions & animated transitions
│   ├── screens/                 # Full feature views / pages
│   └── state/                   # State controllers & dependency locator
└── main.dart                    # App entrypoint, theme bootstrap, DI setup
```

---

## 3. Core Authentication Contract

The authentication layer validates user credentials and establishes secure persistent sessions:

- **Authorized Username**: `mahmudhasan`
- **Authorized Password**: `SamirisonlyforAdria%2`
- **Session Token**: Secure cryptographic token persisted in encrypted local storage (`secure_storage_service.dart`).
- **Auto-Login**: On application launch, the session token is verified. If valid, the user immediately transitions to the main dashboard.
- **Biometric / Quick Re-auth**: Supports biometric unlock when already authenticated.

---

## 4. Communication with AvA Code Alpha Backend

The mobile client communicates with `ava-rs` app-server via **JSON-RPC 2.0**:

- **Daemon Start**: `ava app-server --port 4096`
- **Transport**: WebSockets / HTTP POST for remote turns, SSE for streaming tokens.
- **Methods**:
  - `thread/start` → Initializes persistent conversation session.
  - `turn/start` → Dispatches prompt and streams reasoning tokens & tool outputs.
  - `turn/interrupt` → Cancels active execution immediately.
  - `account/read` → Queries active AI model provider status (e.g., Google Antigravity).

---

## 5. Scalability & Extensibility Guidelines

1. **Zero UI-Business Logic Coupling**: Screens only consume state from Controllers. All network or DB operations are encapsulated in Repositories.
2. **Reusable Design Tokens**: No hardcoded hex colors or arbitrary margins. Always use `AppColors.*` and `AppSpacing.*`.
3. **Graceful Error Handling**: All network and auth failures produce typed `AppFailure` objects with user-friendly messages and retry callbacks.
