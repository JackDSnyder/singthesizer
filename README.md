# Singthesizer

Singthesizer is a browser-based music sketching tool that helps anyone with a melody in their head get it out of the "voice memo" stage. You pick a speed (BPM) and key, sing or hum for a few bars, and the app turns what you sang into clear notes you can hear back like a simple tune, not just your voice on repeat. You can record more tracks, balance how loud each one is, and play them together so rough ideas feel a little more like a real song.

## How it works

A user signs in, creates a project (name, BPM, key, and length in bars), and records a vocal take from the browser. The recorded audio is uploaded to a Django backend, where a Python pipeline runs pitch detection (pYIN via librosa), beat-grid quantization, exponential-moving-average smoothing, and key-aware pitch quantization to produce structured note events. Those notes are sent back to the React + TypeScript frontend, previewed in the browser with Tone.js, and rendered on a multi-track piano roll. Tracks can be saved, renamed, deleted, muted, mixed with per-track sliders, and played back together with a moving playhead.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tone.js
- **Backend:** Django, Django REST Framework, librosa, NumPy
- **Database:** PostgreSQL (via Docker Compose for local development)
- **Auth:** Token-based authentication with protected routes

## Repository layout

```
singthesizer/
├── backend/                          # Django REST API + audio analysis pipeline
│   ├── apps/
│   │   ├── music/                    # Projects, tracks, and analyze-audio endpoint
│   │   │   ├── migrations/
│   │   │   ├── services/             # Audio analysis pipeline
│   │   │   │   ├── audio_io.py
│   │   │   │   ├── keys_scales.py
│   │   │   │   ├── note_events.py
│   │   │   │   ├── pipeline.py
│   │   │   │   ├── pitch_detection.py
│   │   │   │   ├── pitch_smooth.py
│   │   │   │   └── quantization.py
│   │   │   ├── tests/
│   │   │   ├── admin.py
│   │   │   ├── apps.py
│   │   │   ├── constants.py
│   │   │   ├── models.py
│   │   │   ├── serializers.py
│   │   │   ├── urls.py
│   │   │   └── views.py
│   │   └── users/                    # Auth: register, login, logout, token
│   ├── singthesizer_backend/         # Django project settings, root URLs, WSGI/ASGI
│   ├── manage.py
│   ├── nixpacks.toml
│   └── requirements.txt
├── frontend/                         # React + TypeScript + Vite client
│   ├── public/
│   ├── src/
│   │   ├── audio/tone/               # Tone.js synth + playback helpers
│   │   ├── components/
│   │   │   ├── auth/                 # Login / register screens
│   │   │   ├── layout/               # Shared layout / nav
│   │   │   ├── projects/             # Project list, detail, piano roll
│   │   │   └── tracks/               # Recording UI and track controls
│   │   ├── contexts/
│   │   ├── hooks/                    # useRecording, useNotePreview, etc.
│   │   ├── services/                 # API client, audio analysis upload
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.cjs
│   ├── tsconfig.json
│   └── vite.config.ts
├── docker-compose.yaml               # Local Postgres service
├── LICENSE
└── README.md
```

## Running locally

1. Start the database: `docker compose up -d`
2. In `backend/`: install Python dependencies from `requirements.txt`, run migrations, and start the Django server.
3. In `frontend/`: install Node dependencies and run the Vite dev server.
4. Open the app in a browser on `localhost` (microphone access requires HTTPS or `localhost`).