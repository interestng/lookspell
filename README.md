# gaze-communicator

A communication board driven by eye gaze or head movement, for people who cannot speak or use their hands. It runs in a browser on any laptop, tablet, or phone with a front camera. Nothing is uploaded, there is no server, and it costs nothing to run.

Commercial eye-gaze communicators cost $3,000 to $15,000 and are rationed by insurance. This project measures how much of that capability a webcam can recover.

## What a webcam can and cannot do

Webcam gaze tracking lands within a few degrees of where you are looking, roughly a golf ball at arm's length. That rules out a normal keyboard. The board therefore has at most nine large zones on a laptop and six on a phone; letters are grouped so a letter takes two selections; word prediction shortens the rest. Head pointing, which a webcam measures far better, is offered for people who can still move their neck. All of this is measured, not assumed: study mode records every selection and a notebook turns the logs into words per minute and error rates.

## Run it

```
npm install
npm run dev        # https://localhost:5173, plus a LAN URL for the phone
npm test
npm run lint
npm run build      # static output in dist/
```

Open `/app/` for the board and `/` for the landing page. Safari needs HTTPS for the camera, which the dev server provides with a self-signed certificate you accept once.

Keys while the board is open: `c` recalibrate, `s` settings, `m` mouse pointer (dev builds only). `?mouse=1` starts in mouse mode for development without a camera.

## Run the study

Settings, then Start a study session. Enter a tester id, pick gaze or head, calibrate, spell the five phrases, select Speak after each. A JSON log downloads at the end. Drop it into `analysis/data/` (never committed) and run the notebook:

```
cd analysis
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
jupyter notebook pilot.ipynb
```

The notebook writes `public/results.json`, which the landing page renders. That file is gitignored; publish aggregate numbers deliberately by copying them into the repo when you decide to.

## Layout

```
src/tracking      camera + mediapipe, pure feature extraction
src/calibration   least squares fit from gaze/head features to screen
src/pointer       one euro smoothing, confidence gate
src/selection     dwell state machine, blink detector, leave guard
src/board         board definitions, layout, hit test, reducer
src/predict       prefix word prediction from a frequency list
src/speech        speechSynthesis wrapper
src/study         session log and text-entry metrics
src/ui            the only module that touches the DOM
landing/          the landing page
analysis/         pilot notebook
```

Manual checklist: `docs/manual-test.md`.

## Honest limits

Coarse gaze, sensitivity to lighting, no clinical validation, and a pilot of two or three healthy testers. See the landing page for the full list.

MIT licence.
