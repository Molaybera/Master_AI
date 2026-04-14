# Master AI

> **An offline-first AI chat application** — run a full AI assistant on your own machine, no internet required, with a clean web interface and the ability to manage files, write code, and even send emails, all through natural conversation.

---

## Table of Contents

1. [What Is This?](#what-is-this)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [Usage](#usage)
7. [Project Structure](#project-structure)
8. [AI Model & Customization](#ai-model--customization)
9. [API Reference](#api-reference)
10. [Security Notes](#security-notes)
11. [License](#license)

---

## What Is This?

**Master AI** is a locally-hosted, offline AI chat application. You download the AI model once, and after that it runs completely on your own computer — no internet connection needed to chat, generate code, or manage your files. Your conversations and data never leave your machine.

You interact with it through a **web-based chat interface** served at `http://localhost:5000`. Everything is driven by plain natural language — just describe what you want and the model figures out what to do.

### What Can It Do?

| Capability | Internet Required? | Example Command |
|---|:---:|---|
| Answer questions (cybersecurity, programming, general) | ❌ No | *"Explain what a buffer overflow is"* |
| Generate code (Python, JavaScript, Bash, and more) | ❌ No | *"Write a port scanner in Python"* |
| Create files and folders | ❌ No | *"Create a folder called MyProject"* |
| Read files and list directories | ❌ No | *"Show me the contents of MyProject"* |
| Rename, move, copy, or delete files | ❌ No | *"Rename hello.py to main.py"* |
| Open files and folders | ❌ No | *"Open hello.py"* |
| Run / execute files | ❌ No | *"Run hello.py"* |
| Write and send emails (Gmail) | ✅ Yes | *"Send an email to alice@example.com about the report"* |

All actions happen **directly inside the chat window** — no separate terminal, no clicking through menus.

> **Privacy:** The AI model runs 100% locally via Ollama. The only outbound network request the app ever makes is when you explicitly ask it to send an email.

---

## Features

- **Offline AI Chat** — Conversational assistant powered by a local LLM (`qwen2.5-coder:7b`) running through Ollama under the custom `Master` persona.
- **Cybersecurity & Programming Focus** — Designed to assist with security audits, code generation, vulnerability analysis, and technical programming questions.
- **File System Agent** — Create, read, rename, move, copy, delete, open, and run files and folders in your workspace using plain English.
- **Mail Agent** — Compose and send emails through Gmail directly from the chat interface (requires a Google App Password).
- **User Authentication** — Secure registration and login using a username, email address, and a unique **Vault Key**.
- **Persistent Chat History** — All conversations are stored in MongoDB and linked to each user's account.
- **Session Management** — Server-side sessions stored in MongoDB with 24-hour expiry.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js v5 |
| **Database** | MongoDB (local instance), Mongoose |
| **AI Runtime** | [Ollama](https://ollama.com/) — runs the LLM locally |
| **AI Model** | `qwen2.5-coder:7b` (served as the `Master` persona) |
| **File Agent** | Python 3 (`terminal_agent.py`) |
| **Email** | Nodemailer (Gmail SMTP) |
| **Auth** | express-session, bcryptjs, connect-mongo |
| **Frontend** | Vanilla HTML, CSS, JavaScript |

---

## Prerequisites

Make sure the following are installed and running before you start:

| Requirement | Version | Notes |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18 or later | |
| [MongoDB](https://www.mongodb.com/try/download/community) | Any recent version | Must be running locally |
| [Ollama](https://ollama.com/) | Latest | Must be running locally |
| [Python 3](https://www.python.org/) | v3.8 or later | Used by the file system agent |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Molaybera/Master_AI.git
cd Master_AI
```

### 2. Install Node.js dependencies

```bash
npm install
```

### 3. Set up the AI model

Pull the base model, then build the custom `Master` persona with Ollama:

```bash
ollama pull qwen2.5-coder:7b
ollama create Master -f ./Modelfile
```

Verify it is working:

```bash
ollama list       # Master should appear in the list
ollama run Master # Quick test — type a message and press Ctrl+D to exit
```

> See the [AI Model & Customization](#ai-model--customization) section for details on the Modelfile, swapping the base model, and tuning inference parameters.

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://127.0.0.1:27017/cyber_assistant
SESSION_SECRET=your_super_secret_key_here
PORT=5000
NODE_ENV=development
```

> **Never commit `.env` to version control.** It is already listed in `.gitignore`.

### 5. Start MongoDB

Make sure your local MongoDB instance is running. You can start it with `mongod` or use MongoDB Compass.

### 6. Start the server

```bash
npm start
```

The application will be available at **[http://localhost:5000](http://localhost:5000)**.

---

## Usage

### Getting Started

1. **Register** — Go to `http://localhost:5000/register` and create an account. A unique **Vault Key** will be generated and shown to you — save it.
2. **Log in** — Go to `http://localhost:5000/login` and sign in with your credentials.
3. **Chat** — The chat interface is at `http://localhost:5000/chat`. Type naturally — the model understands both questions and action requests.

### Example Commands

| What you type | What happens |
|---|---|
| `Explain XSS attacks` | Returns an explanation with risk level and prevention tips |
| `Write a Python script that pings a host` | Generates and displays the code |
| `Create a folder called MyProject` | Creates the folder in your workspace |
| `Create a file hello.py with a hello world program` | Generates and saves the file |
| `List all files in my workspace` | Shows your workspace directory contents |
| `Open hello.py` | Opens the file |
| `Rename hello.py to main.py` | Renames the file in your workspace |
| `Delete old_script.py` | Removes the file permanently |
| `Send an email to alice@example.com — subject: Report, body: Please find the report attached` | Drafts and sends the email via Gmail |

---

## Project Structure

```
Master_AI/
├── config/
│   └── db.js                    # MongoDB connection setup
├── controllers/
│   ├── auth/                    # Register, login, logout, profile controllers
│   └── modelService/
│       ├── chatController.js    # AI chat request handler
│       ├── mailController.js    # Email dispatch via Nodemailer
│       ├── systemController.js  # File system command handler
│       └── terminal_agent.py   # Python bridge for file operations
├── middleware/
│   └── authMiddleware.js        # Session protection & redirect guards
├── models/
│   ├── User.js                  # User schema (username, email, vaultKey, etc.)
│   └── Chat.js                  # Chat history schema
├── public/                      # Frontend assets (HTML, CSS, JS)
│   ├── index.html               # Landing page
│   ├── login.html               # Login page
│   ├── register.html            # Registration page
│   └── chat.html                # Main chat interface
├── routes/
│   ├── auth/                    # Authentication routes
│   ├── chat/                    # Chat API routes
│   ├── system/                  # File system agent routes
│   └── views/                   # HTML page serving routes
├── services/
│   └── aiService.js             # Ollama API integration & system prompt
├── .env                         # Environment variables (not committed)
├── Modelfile                    # Ollama model definition for the Master persona
├── package.json
└── server.js                    # Application entry point
```

---

## AI Model & Customization

### The Default Model — `qwen2.5-coder:7b`

Master AI uses **[qwen2.5-coder:7b](https://ollama.com/library/qwen2.5-coder)**, a code-focused open-weight LLM from the Qwen team. It runs locally through **Ollama** under a custom persona named `Master`.

**Why this model:**
- Strong code generation across Python, JavaScript, Bash, and more
- Reliable instruction-following — important for the strict JSON output format the app requires
- Solid cybersecurity and programming knowledge from pre-training
- Runs on consumer hardware (8 GB VRAM or CPU-only mode)

**Inference parameters** (configured in `services/aiService.js`):

| Parameter | Value | What It Does |
|---|---|---|
| `num_ctx` | `4096` | Context window size in tokens (includes full chat history) |
| `num_predict` | `2048` | Maximum tokens the model can output per response |
| `temperature` | `0.4` | Lower = more focused/deterministic; higher = more creative |
| `top_p` | `0.9` | Nucleus sampling — filters low-probability tokens |
| `repeat_penalty` | `1.1` | Discourages the model from repeating itself |

### The Modelfile

The `Modelfile` is a plain-text recipe that Ollama uses to build the `Master` model. It wraps the base model with a system prompt, a persona, and default parameters.

```
FROM qwen2.5-coder:7b

PARAMETER temperature 0.4
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
PARAMETER num_ctx 4096
PARAMETER num_predict 2048

SYSTEM """
You are MASTER — a Neural Intelligence specialist in Cyber Security and Programming.

CRITICAL: Your ENTIRE response must be ONE valid JSON object. No markdown. No explanation outside JSON. No code fences.

Respond using only this schema:
{"type":"...","topic":"...","content":"...","code":"","items":[],"risk_level":"None","prevention":"N/A","recipient":"","subject":"","action":"","path":"","dest":""}

Type values:
- "general"  — for explanations, questions, definitions
- "coding"   — when returning code (populate "code" field)
- "security" — for vulnerability/threat analysis (populate "risk_level" and "prevention")
- "list"     — for numbered or bulleted breakdowns (populate "items" array)
- "system"   — for file/folder operations (populate "action", "path", "dest")
- "email"    — for email drafts (populate "recipient", "subject", "content")
"""
```

After editing the Modelfile, rebuild the model:

```bash
ollama create Master -f ./Modelfile
```

### Changing the Base Model

You can swap `qwen2.5-coder:7b` for any Ollama-compatible model:

| Model | Pull Command | Notes |
|---|---|---|
| `qwen2.5-coder:14b` | `ollama pull qwen2.5-coder:14b` | More capable; requires ~16 GB VRAM |
| `qwen2.5-coder:3b` | `ollama pull qwen2.5-coder:3b` | Faster; lower VRAM; slightly less capable |
| `llama3.1:8b` | `ollama pull llama3.1:8b` | General-purpose alternative |
| `deepseek-coder-v2` | `ollama pull deepseek-coder-v2` | Strong coding alternative |
| `mistral:7b` | `ollama pull mistral:7b` | Lightweight general model |

To switch models:

1. Update the `FROM` line in `Modelfile`:
   ```
   FROM llama3.1:8b
   ```
2. Rebuild:
   ```bash
   ollama create Master -f ./Modelfile
   ```
3. No code changes needed — the app always calls a model named `Master`.

### Tuning Inference Parameters

To adjust parameters without touching the Modelfile, edit the `options` block in `services/aiService.js`:

```js
options: {
    num_ctx:        4096,   // increase for longer conversations (uses more VRAM)
    num_predict:    2048,   // increase for longer code outputs
    temperature:    0.4,    // 0.0 = fully deterministic, 1.0 = most creative
    top_p:          0.9,
    repeat_penalty: 1.1,
}
```

Restart the server after changes: `npm start`

### Verifying Your Ollama Setup

```bash
# List available models (Master should appear here)
ollama list

# Test the Master model directly in the terminal
ollama run Master

# Confirm the Ollama API is reachable (used by aiService.js)
curl http://127.0.0.1:11434/api/tags
```

The app connects to Ollama at `http://127.0.0.1:11434` by default. To change the host or port, update this line in `services/aiService.js`:

```js
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
```

---

## API Reference

### Authentication

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |

### Chat

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/chat` | Send a message to the AI and receive a response |

### File System Agent

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/system/execute` | Execute a file system command (create, rename, delete, etc.) |
| `GET` | `/api/system/cwd` | Get the current working directory |
| `POST` | `/api/system/reset-cwd` | Reset the working directory to the default workspace |

> All routes except `/api/auth/register` and `/api/auth/login` require an active session.

---

## Security Notes

- All protected routes are guarded by the `protect` middleware which validates the session.
- Passwords are hashed using **bcryptjs** before being stored.
- Sessions are stored server-side in MongoDB and expire after **24 hours**.
- The file system agent enforces workspace boundaries — users cannot access paths outside their assigned workspace.
- The `SESSION_SECRET` and `MONGO_URI` must always be set via environment variables and never hardcoded.

---

## License

This project is licensed under the **ISC License**.
