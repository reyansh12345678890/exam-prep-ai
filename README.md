# Exam Prep AI

A privacy-first exam-preparation app that extracts study material from PDF, DOCX, and PPTX files and generates practice questions using a free local AI model in the browser.

## Ownership and usage

Copyright (c) 2026 Reyansh Gupta. All rights reserved. This repository is publicly
visible for portfolio and review purposes, but the source code is not licensed for
unauthorized copying, redistribution, resale, or derivative commercial use. See
[LICENSE](./LICENSE) for the full notice.

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
