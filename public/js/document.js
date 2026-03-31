// ═══════════════════════════════════════════════════
//  OFFLINE DOCUMENT READER (RAG) & OCR PIPELINE
// ═══════════════════════════════════════════════════
window.currentDocumentContext = "";
window.currentDocumentName = "";

document.addEventListener('DOMContentLoaded', () => {
    const fileUpload = document.getElementById('file-upload');
    const attachBtn = document.getElementById('attach-btn');
    const attachmentChip = document.getElementById('attachment-chip');
    const attachmentName = document.getElementById('attachment-name');
    const removeAttachmentBtn = document.getElementById('remove-attachment-btn');

    if (!attachBtn || !fileUpload) return;

    attachBtn.addEventListener('click', () => fileUpload.click());

    fileUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Safety limit: 5MB
        if (file.size > 5 * 1024 * 1024) {
            if(typeof appendBotCard === 'function'){
                appendBotCard({
                    type: 'general', topic: 'File Too Large',
                    content: 'Please upload files under 5MB to prevent Neural Link overload.',
                    risk_level: 'Medium', prevention: 'N/A'
                }, true);
            } else {
                alert('File too large. Max 5MB.');
            }
            fileUpload.value = "";
            return;
        }

        const ext = file.name.split('.').pop().toLowerCase();
        
        // UI Loading State
        attachBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-blue-400"></i>';
        attachBtn.disabled = true;
        document.getElementById('user-input').placeholder = "Extracting data...";

        try {
            let extractedText = "";

            // Text Files
            if (['txt', 'md', 'csv', 'json', 'py', 'js', 'html', 'css', 'log'].includes(ext)) {
                const reader = new FileReader();
                extractedText = await new Promise((resolve) => {
                    reader.onload = (event) => resolve(event.target.result);
                    reader.readAsText(file);
                });
            } 
            // DOCX Files (Mammoth)
            else if (ext === 'docx') {
                const reader = new FileReader();
                const arrayBuffer = await new Promise((resolve) => {
                    reader.onload = (event) => resolve(event.target.result);
                    reader.readAsArrayBuffer(file);
                });
                const result = await mammoth.extractRawText({ arrayBuffer });
                extractedText = result.value;
            } 
            // PDF Files (PDF)
            else if (ext === 'pdf') {
                const reader = new FileReader();
                const typedarray = await new Promise((resolve) => {
                    reader.onload = (event) => resolve(new Uint8Array(event.target.result));
                    reader.readAsArrayBuffer(file);
                });
                const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += `[Page ${i}]\n${pageText}\n\n`;
                }
                extractedText = fullText;
            } 
            // Images / OCR (Tesseract.js)
            else if (['png', 'jpg', 'jpeg'].includes(ext)) {
                const worker = await Tesseract.createWorker('eng');
                const result = await worker.recognize(file);
                extractedText = result.data.text;
                await worker.terminate();
            } 
            else {
                throw new Error('Unsupported file format.');
            }

            // Finalize Extraction
            window.currentDocumentContext = extractedText;
            window.currentDocumentName = file.name;

            attachmentName.textContent = window.currentDocumentName;
            attachmentChip.classList.remove('hidden');
            attachmentChip.classList.add('flex');
            
        } catch (err) {
            console.error("Extraction error:", err);
            if(typeof appendBotCard === 'function'){
                appendBotCard({
                    type: 'general', topic: 'Extraction Failed',
                    content: `Could not read the file <b>${file.name}</b>. Ensure it contains text.`,
                    risk_level: 'Low', prevention: 'N/A'
                }, true);
            }
        } finally {
            // Reset UI State
            fileUpload.value = "";
            attachBtn.innerHTML = '<i class="fas fa-paperclip"></i>';
            attachBtn.disabled = false;
            document.getElementById('user-input').placeholder = "Ask MASTER or attach a document...";
            if(typeof updateSendBtn === 'function') updateSendBtn();
            document.getElementById('user-input').focus();
        }
    });

    removeAttachmentBtn.addEventListener('click', () => {
        window.currentDocumentContext = "";
        window.currentDocumentName = "";
        fileUpload.value = "";
        attachmentChip.classList.add('hidden');
        attachmentChip.classList.remove('flex');
        if(typeof updateSendBtn === 'function') updateSendBtn();
    });
});

// OVERRIDE: Update send button to allow sending if a document is attached
function updateSendBtn() {
    const userInputEl = document.getElementById('user-input');
    if (!userInputEl) return;
    const empty = userInputEl.value.trim().length === 0;
    const sendBtnEl = document.getElementById('send-btn');
    if (sendBtnEl) {
        sendBtnEl.disabled = (empty && !currentDocumentContext) || isProcessing;
    }
}
