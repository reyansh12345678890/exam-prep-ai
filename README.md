# Exam Prep AI

A privacy-first exam-preparation app that extracts study material from PDF, DOCX, and PPTX files and generates practice questions using a free local AI model in the browser.

## Cost model

Question generation does not call OpenAI or any paid API. The local model is downloaded to the student's browser on first use and then cached by the browser. Study content is processed locally for question generation.

## Supported uploads

PDF, DOCX, PPTX, PNG, JPG, JPEG, WEBP up to 25 MB.

Image/handwriting recognition is planned for the next phase.

## Run locally

Requirements: Node.js 18 or later and npm.

```bash
git clone https://github.com/reyansh12345678890/exam-prep-ai.git
cd exam-prep-ai
npm install
npm run dev
```

Open `http://localhost:3000` in a browser.

## Production build

```bash
npm run build
npm start
```

The app does not require an API key for local question generation.
