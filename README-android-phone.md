Phone-first step-by-step

1) Create a new GitHub repo (from your phone)
- Go to https://github.com/new and create a repo (public/private).
- In the repo UI, use "Add file → Create new file" to create the files listed in this gist.
  - Create folders by typing paths like `web/index.html` in the filename box.
  - Paste the content from the corresponding file blocks and commit.
- Commit all files exactly as shown.

2) Deploy the web frontend + serverless function to Vercel (from phone)
- Sign in to https://vercel.com (you can sign up with GitHub).
- Choose "New Project" → Import your GitHub repo.
- Vercel will auto-detect a static site & serverless functions in `api/`.
- After first deploy, go to Project Settings → Environment Variables:
  - If you use OpenRouter: add OPENROUTER_API_KEY with your API key and set AI_BACKEND_TYPE=openrouter
  - Or set HUGGINGFACE_API_KEY and AI_BACKEND_TYPE=huggingface (and optionally HUGGINGFACE_MODEL)
- Redeploy. Get the production URL (e.g., https://my-repo.vercel.app). This will be used by the app.

3) Update Android app URL
- In the repo, edit file `android/app/src/main/java/com/example/vrmwebview/MainActivity.java` and replace the placeholder WEB_APP_URL with your Vercel URL (include https://).
- Commit the change.

4) Trigger GitHub Actions build (cloud APK)
- Push the change (commit from the GitHub web UI).
- In your repo, go to "Actions" tab. You should see the "Build Android APK" workflow run.
- Wait for it to complete; when finished, open the run and download the artifact named `app-debug-apk` (app-debug.apk).

5) Install the APK on your Android phone
- On Android, enable "Install unknown apps" for your browser or Files app if required.
- Download the `app-debug.apk` from the Actions artifact link and open to install.
- Open the app — it will load the web app URL and let you upload a VRM and use the AI features.

Notes & next steps
- Cloud AI: the serverless function proxies to OpenRouter/HuggingFace. Using OpenRouter is usually straightforward; set OPENROUTER_API_KEY in Vercel.
- Offline option later: you can replace the serverless function with an on-device model in the Android app (e.g., ONNX Runtime or TFLite). That requires rebuilding the APK to include the model and inference code (I can provide instructions or a follow-up repo).
- If you want more advanced native performance (skinned meshes, lower-level GPU access, native VRM parsing), later we can prepare a Unity-based cloud build pipeline (but that requires building a Unity project and larger CI).

If you'd like, I can:
- (A) Give you a ready-to-paste Vercel deploy config and exact Vercel env names to use.
- (B) Provide a slightly improved serverless prompt tuned to the behavior mapping for VRoid blendshape names (if you upload or paste your VRM blendshape names).
- (C) Add small WebView-to-native bridges (e.g., to record audio and send directly) if you want device microphone TTS/STT integration.

Tell me which follow-up you want (A/B/C) or say "Start" and I will give the precise Vercel variable names and the prompt to set in the serverless function.