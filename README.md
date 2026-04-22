🧠 MASTER OS

MASTER_AI is a powerful, privacy-first, locally-hosted AI assistant and chat interface. Built on top of Node.js and Ollama, it provides an offline AI experience capable of managing local files, reading documents, and drafting emails—all from a sleek, cyber-security-themed web terminal.

✨ Core Features

100% Offline AI Execution: Powered locally by Ollama (configured for qwen2.5-coder:7b). No data is sent to external AI APIs.

System Agent (File Manager): The AI can autonomously act on your local file system. Ask MASTER to create folders, write code files, read files, rename directories, or delete items.

Strict Security Sandbox: System tasks are strictly bound to a user-defined "Workspace Directory". Hard-coded protections prevent the AI from accessing the root C:\ drive or escaping the sandbox.

Offline Document Reader (RAG & OCR): Upload .txt, .py, .pdf, .docx, or even images (.png/.jpg). The application uses entirely local, in-browser processing (PDF.js, Mammoth, Tesseract.js) to extract text and feed it to the AI context.

Mail Agent: Draft and send emails directly from the chat interface using Nodemailer and Google App Passwords. (Note: This specific feature requires internet access).

Interactive Action Cards: AI system operations and email drafts don't happen silently in the background. They generate beautiful interactive UI cards requiring explicit user approval ([ Allow & Execute ]) before running.

Voice Input Engine: Speak directly to the AI using offline Python-based web socket transcription.

🛠️ Tech Stack

Frontend:

HTML5 / Vanilla JavaScript / CSS3

Tailwind CSS (via CDN for rapid UI styling)

PDF.js & Mammoth.js (Document Parsing)

Backend:

Node.js & Express.js

MongoDB & Mongoose (User Authentication & Profiles)

Node fs (File System Operations)

Nodemailer (Email Dispatch)

AI Engine:

Ollama (Local LLM Execution)

🚀 Installation & Setup

1. Prerequisites

Node.js (v16 or higher)

MongoDB (running locally or via MongoDB Atlas)

Ollama installed on your local machine.

2. Prepare the AI Model

Ensure Ollama is running. Pull the model you intend to use. By default, the system looks for a custom model named Master (based on qwen2.5-coder or similar).

ollama run qwen2.5-coder:7b


3. Clone and Install dependencies

git clone [https://github.com/yourusername/master-os.git](https://github.com/yourusername/master-os.git)
cd master-os
npm install


4. Environment Variables

Create a .env file in the root directory and add your configuration:

PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/master_os
SESSION_SECRET=your_super_secret_session_key


5. Start the Server

npm start


The application will be available at http://localhost:3000.

⚙️ Configuration & Usage

Setting up the System Agent (Sandbox)

Log in to the MASTER OS interface.

Click the Settings (Gear) icon in the bottom left sidebar.

In the Workspace Directory field, enter a safe folder path where the AI is allowed to operate (e.g., D:/Projects/AI_Sandbox).

Click Save.

Test it: Type `"Create a folder called test_project and put a python hello world script inside it."*

Setting up the Mail Agent

Open Profile Settings.

Enter your Google App Password. (You can generate one in your Google Account Security settings).

Click Save.

Test it: Type `"Write an email to target@example.com inviting them to a cyber security conference."*

Uploading Documents

Click the Paperclip icon in the chat input. Select a PDF, Image, or Code file. The browser will instantly extract the text, display a chip above the input bar, and allow you to ask the AI questions about the document.

🛡️ Security Architecture

Execution Locks: The backend uses fs path resolution to verify that no target path resolves outside of the user's defined Workspace.

C-Drive Block: Built-in Regex explicitly denies any read/write operations targeting the C: drive root or subdirectories.

Smart Folder Deletion: The system prevents the accidental deletion of non-empty folders, requiring the user to explicitly delete the contained files first.

App Passwords: User email credentials are used purely for Node-based dispatching and are not exposed to the client side.

📜 License

This project is intended for personal and educational use. Please ensure you comply with your local data and privacy regulations when setting up automated mailing systems.
