# Master AI

**Master AI** is a locally-hosted, AI-powered assistant specializing in **Cybersecurity and Programming**. It runs entirely on your machine using [Ollama](https://ollama.com/) and a custom-trained model, giving you a private, offline-capable neural intelligence interface with built-in file management and email capabilities.

---

## Features

- **AI Chat Interface** — Conversational assistant powered by a local LLM (`qwen2.5-coder`) configured as the `Master` persona via Ollama.
- **Cybersecurity & Programming Focus** — Designed to assist with security audits, code generation, vulnerability analysis, and technical programming questions.
- **File System Agent** — Issue natural-language commands to create, read, rename, move, copy, delete, and run files and folders inside your personal workspace.
- **Mail Agent** — Compose and send emails through Gmail directly from the chat interface (requires a Google App Password).
- **User Authentication** — Secure registration and login system using a username, email, and a unique **Vault Key** for offline-style authentication.
- **Persistent Chat History** — All conversations are stored in MongoDB, linked to each user's account.
- **Session Management** — Server-side sessions stored in MongoDB with 24-hour expiry.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js, Express.js v5 |
| **Database** | MongoDB (local), Mongoose |
| **AI Runtime** | [Ollama](https://ollama.com/) (local LLM) |
| **AI Model** | `qwen2.5-coder:7b` (served as `Master`) |
| **File Agent** | Python 3 (`terminal_agent.py`) |
| **Email** | Nodemailer (Gmail) |
| **Auth** | express-session, bcryptjs, connect-mongo |
| **Frontend** | Vanilla HTML, CSS, JavaScript |

---

## Prerequisites

Before running the project, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or later)
- [MongoDB](https://www.mongodb.com/try/download/community) (running locally)
- [Ollama](https://ollama.com/) (running locally)
- [Python 3](https://www.python.org/) (for the file system agent)

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

Pull the base model and create the `Master` model with Ollama:

```bash
ollama pull qwen2.5-coder:7b
ollama create Master -f ./Modelfile
```

Verify the model is running:

```bash
ollama list
ollama run Master
```

> See the [AI Model & Customization](#ai-model--customization) section below for full details on the Modelfile, changing the model, and tuning parameters.

### 4. Configure environment variables

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://127.0.0.1:27017/cyber_assistant
SESSION_SECRET=your_super_secret_key_here
PORT=5000
NODE_ENV=development
```

### 5. Start MongoDB

Make sure your local MongoDB instance is running (via MongoDB Compass or the `mongod` command).

### 6. Start the server

```bash
npm start
```

The application will be available at **http://localhost:5000**.

---

## Usage

1. **Register** — Navigate to `/register` and create an account. A unique **Vault Key** will be generated for your account.
2. **Login** — Sign in at `/login` with your credentials.
3. **Chat** — Use the chat interface to talk to MASTER. You can ask cybersecurity questions, request code, and issue file/folder commands in plain English.

### Example AI Commands

| What you type | What happens |
|---|---|
| `Create a folder called MyProject` | Creates a folder in your workspace |
| `Create a file hello.py with a hello world program` | Generates and saves a Python file |
| `List all files in my workspace` | Shows your workspace contents |
| `Delete the file old_script.py` | Removes the specified file |
| `Send an email to alice@example.com about the security report` | Drafts and sends an email via your Gmail account |

---

## Project Structure

```
Master_AI/
├── config/
│   └── db.js                  # MongoDB connection
├── controllers/
│   ├── auth/                  # Register, login, logout, profile controllers
│   └── modelService/
│       ├── chatController.js  # AI chat logic
│       ├── mailController.js  # Email dispatch via Nodemailer
│       ├── systemController.js # File system command handler
│       └── terminal_agent.py  # Python bridge for file operations
├── middleware/
│   └── authMiddleware.js      # Session protection & redirect guards
├── models/
│   ├── User.js                # User schema (username, email, vaultKey, etc.)
│   └── Chat.js                # Chat history schema
├── public/                    # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   └── chat.html
├── routes/
│   ├── auth/                  # Authentication routes
│   ├── chat/                  # Chat API routes
│   ├── system/                # File system agent routes
│   └── views/                 # HTML page routes
├── services/
│   └── aiService.js           # Ollama API integration & system prompt
├── .env                       # Environment variables (not committed)
├── package.json
└── server.js                  # Application entry point
```

---

## AI Model & Customization

### The Default Model — `qwen2.5-coder:7b`

Master AI is built around **[qwen2.5-coder:7b](https://ollama.com/library/qwen2.5-coder)**, a code-focused open-weight LLM from Alibaba's Qwen team. It is served locally through **Ollama** under a custom persona named `Master`.

Why this model:
- Excellent code generation across Python, JavaScript, Bash, and more
- Strong instruction-following — critical for the JSON-only response format the system requires
- Cybersecurity knowledge baked in from pre-training
- Runs well on consumer hardware (8 GB VRAM or CPU)

The model is invoked in `services/aiService.js` with the following inference parameters:

| Parameter | Value | Effect |
|---|---|---|
| `num_ctx` | `4096` | Context window (tokens) — includes full chat history |
| `num_predict` | `2048` | Maximum tokens per response |
| `temperature` | `0.4` | Lower = more deterministic/focused answers |
| `top_p` | `0.9` | Nucleus sampling threshold |
| `repeat_penalty` | `1.1` | Discourages repetitive output |

---

### The Modelfile — Custom Identity & Instructions

A `Modelfile` is a plain-text recipe that Ollama uses to build a named model. It wraps a base model with a custom system prompt, temperature, and identity — similar to a "character card" for an LLM.

Create a file named `Modelfile` in the project root with this content:

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

Then build and register the model with Ollama:

```bash
ollama create Master -f ./Modelfile
```

Every time you edit the Modelfile, re-run `ollama create Master -f ./Modelfile` to apply the changes.

---

### Changing the Model

You can swap `qwen2.5-coder:7b` for any Ollama-compatible model. Recommended alternatives:

| Model | Pull command | Notes |
|---|---|---|
| `qwen2.5-coder:14b` | `ollama pull qwen2.5-coder:14b` | More capable, needs ~16 GB VRAM |
| `qwen2.5-coder:3b` | `ollama pull qwen2.5-coder:3b` | Faster, lower VRAM, slightly weaker |
| `llama3.1:8b` | `ollama pull llama3.1:8b` | General-purpose alternative |
| `deepseek-coder-v2` | `ollama pull deepseek-coder-v2` | Strong coding alternative |
| `mistral:7b` | `ollama pull mistral:7b` | Lightweight general model |

**Step 1** — Update your `Modelfile` to point to the new base model:

```
FROM llama3.1:8b   ← change this line
```

**Step 2** — Rebuild the `Master` model:

```bash
ollama create Master -f ./Modelfile
```

**Step 3** — No code changes needed. The app always calls the model named `Master`, so swapping the base model is transparent.

> Alternatively, if you want to skip the Modelfile entirely and call a raw Ollama model directly, open `services/aiService.js` and change this line:
> ```js
> const MODEL_NAME = 'Master';
> // change to:
> const MODEL_NAME = 'qwen2.5-coder:7b';
> ```
> Note: without a Modelfile the system prompt is still injected at runtime by `aiService.js`, so behaviour should remain consistent.

---

### Tuning Model Parameters

To adjust inference behaviour without changing the Modelfile, edit the `options` block in `services/aiService.js`:

```js
options: {
    num_ctx:        4096,   // increase for longer conversations (uses more VRAM)
    num_predict:    2048,   // increase for longer code outputs
    temperature:    0.4,    // 0.0 = fully deterministic, 1.0 = creative
    top_p:          0.9,
    repeat_penalty: 1.1,
}
```

Restart the server after changes: `npm start`

---

### Verifying Your Ollama Setup

```bash
# Check Ollama is running
ollama list

# Test the Master model directly
ollama run Master

# Check Ollama API is reachable (used by aiService.js)
curl http://127.0.0.1:11434/api/tags
```

The app connects to Ollama at `http://127.0.0.1:11434` by default. If you are running Ollama on a different host or port, update this line in `services/aiService.js`:

```js
const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
```

---

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/logout` | Log out |
| `POST` | `/api/chat` | Send a message to the AI |
| `POST` | `/api/system/execute` | Execute a file system command |
| `GET` | `/api/system/cwd` | Get the current working directory |
| `POST` | `/api/system/reset-cwd` | Reset the working directory |

---

## Security Notes

- All routes that require authentication are protected by the `protect` middleware.
- Passwords are hashed using **bcryptjs**.
- Sessions are stored server-side in MongoDB and expire after **24 hours**.
- The file system agent enforces workspace boundaries — users cannot traverse outside their assigned workspace path.
- The `SESSION_SECRET` and database URI should always be set via environment variables and never hardcoded in production.

---

## License

This project is licensed under the **ISC License**.
