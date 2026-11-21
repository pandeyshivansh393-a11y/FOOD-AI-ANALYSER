# Snapsnack-AI

A beginner-friendly food photo analyser built with React, plain CSS, FastAPI and Google's Gemini SDK. Upload an image or capture one with your camera to estimate calories, protein, carbohydrates, fat and fiber.

## Files

- `frontend/src/App.jsx`: photo upload, camera capture, API request and nutrition table.
- `frontend/src/style.css`: simple responsive styling.
- `backend/main.py`: image validation and the Gemini request.
- `backend/requirements.txt`: Python packages.
- `.env`: your private local key, ignored by Git.
- `.env.example`: shareable settings template.

Handwritten Python, JS, JSX, CSS and HTML have line-by-line comments. JSON and the generated npm lockfile do not allow comments. The package scripts are `dev` (development), `build` (production assets), and `preview` (local build preview).

## Run locally in PowerShell

Use Python 3.11+ and Node.js 22.12+. Start with two terminals in the repository root.

1. Edit the root `.env` and replace `your_gemini_api_key_here` with your key from [Google AI Studio](https://aistudio.google.com/apikey). If the file is missing, create it with:

   ```powershell
   Copy-Item .env.example .env
   ```

   `GEMINI_MODEL` chooses the image-capable model. The default is `gemini-3.5-flash-lite`, verified with this project. The requested `gemini-2.5-flash-lite` returned a provider 404 because it is unavailable to new users. Google currently limits [2.5 Flash-Lite access](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite) to eligible existing users; if your project lacks access, choose an available image-capable model. Settings are read on every analysis, so editing `.env` does not require a restart. The root `.env` takes precedence over terminal environment variables. Never put the key in React or a `VITE_` variable.

2. Start the backend:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
   .\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
   ```

   Directly using the virtual environment avoids PowerShell activation issues. On macOS/Linux, use `.venv/bin/python` instead.

3. In the second terminal, start React:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

4. Open [Snapsnack-AI](http://127.0.0.1:5173). Upload a JPEG, PNG or WebP (up to 8 MB and 20 megapixels), or choose **Use camera**, grant access and click **Capture photo**. Click **Analyze food**.

Keep both terminals running; stop them with Ctrl+C. Camera access requires localhost or HTTPS. A phone visiting a plain HTTP LAN address may not have camera access.

## Request flow

1. React previews the photo locally.
2. Analyze sends a multipart upload to `/api/analyze`.
3. Vite forwards `/api` requests to FastAPI on port 8000.
4. FastAPI checks the image bytes, reads the key from `.env`, and asks Gemini for structured JSON.
5. Python validates the result and React displays nutrition for the **whole estimated pictured portion**, not per 100 g.

Non-food photos show a message instead of nutrition values. Estimates may miss oils, ingredients and portion sizes. Identification confidence is not a guarantee of nutritional accuracy. A photo cannot establish freshness, food safety or allergens; this is not medical advice.

Photos go to Google only after clicking Analyze. This app does not maintain photo history or a photo database. FastAPI may temporarily spool uploads, which are closed after reading. Google's API data handling and quotas still apply. This is a local learning project; public hosting would need access controls and rate limits.

## Checks and troubleshooting

Run the settings regression tests from the repository root with `.\.venv\Scripts\python.exe -m unittest backend.test_settings -v`.

Build the frontend from its folder with `npm run build`. Use `npm run preview` to view a local build while FastAPI is running.

- [FastAPI documentation](http://127.0.0.1:8000/docs)
- [Backend health check](http://127.0.0.1:8000/api/health)
- Missing or malformed key: paste the exact key into `GEMINI_API_KEY` in the root `.env`. Put comments on separate lines; do not append notes to the key. Retry analysis after saving.
- 503 with "Gemini is temporarily unavailable": the provider is unavailable; retry shortly.
- 502 with "Gemini denied access": check key validity and project/model permissions in Google AI Studio.
- Quota reached: check your Gemini account's quota or retry later.
- Gemini failure: check the key, model access and internet connection.
- Camera unavailable: allow browser permission or upload instead.
- HEIC photos: export as JPEG, PNG or WebP first.
- Connection failure: make sure both servers are running on the documented ports.

For deployment, configure a server/reverse proxy to route `/api` to FastAPI. Vite's development proxy is not a production hosting setup.

## Git

No commit or push is needed to run this app. Review the changes with `git diff` and `git status`. `.env` is ignored, while `.env.example` is safe to track. Ignore rules do not remove secrets already present in old commits.
