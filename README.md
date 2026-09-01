# Lookspell

Lookspell is a communication board you drive with your eyes or your head, through the front camera of whatever laptop or phone you already have. It runs in a browser as a static page. Nothing is uploaded, there is no server, and it costs nothing to run.

I built it because the devices that do this for real, eye-gaze communicators for people with ALS, brainstem stroke, or high spinal injury, cost between $3,000 and $15,000 and are rationed by insurance. I wanted to know how much of that a webcam could recover, and to measure the answer instead of guessing.

**This is a proof of concept.** It is not a medical device, it has not been tested with patients, and it is not a replacement for a clinical eye-gaze system. Treat it as a working experiment with numbers attached.

## What it does

- Points with eye gaze or with head pose. A webcam measures head pose far better, so head mode is the recommended starting point and eye mode is the harder, more interesting problem.
- Selects by resting on a zone for about a second, or by a deliberate long blink.
- Spells with grouped letters on a board of nine large zones (six on a phone), with word prediction from a frequency list and speech through the browser's own voice.
- Keeps a set of quick phrases you can edit, and a Save phrase action that adds whatever you just typed.
- Calibrates in two phases: nine fixed dots, then a dot that glides across the screen while it keeps sampling. It throws out samples where you blinked or glanced away, tells you in plain words how good the fit is, and lets you redo it by looking at a button.
- Has a study mode that times you spelling five fixed phrases and downloads a log. A notebook turns the logs into words per minute and error rates.

## Where the webcam falls short

Pixel-level iris tracking is noisy. Even with median filtering, a one-euro filter, sticky zone borders, and head-pose compensation in the calibration fit, the eye pointer shakes more than the head pointer does. Nine zones is the honest ceiling for a laptop. Lighting matters a lot; a window behind you will ruin it. All of this is written up on the landing page rather than hidden.

## Related work

Google's Look to Speak picks preset phrases by looking left or right on Android. Microsoft's GazeSpeak had a helper hold a phone and read four eye directions as letter groups. OptiKey is the most complete free eye-gaze keyboard, but it wants a real Tobii-class tracker. Vocable, Project Gameface, Camera Mouse, and eViacam do head tracking without a board or speech. A small repo called OCULA does iris-only dwell in a browser. Lookspell is the combination none of them are: browser only, eyes and head in one tool, dwell and blink, free spelling with prediction and speech, and a built-in way to measure speed. The landing page has links to all of them.

## Run it

```
npm install
npm run dev        # https://localhost:5173, plus a LAN URL for a phone
npm test
npm run lint
npm run build      # static output in dist/
```

Open `/app/` for the board and `/` for the landing page. Safari needs HTTPS for the camera, which the dev server provides with a self-signed certificate you accept once. On a phone, open the LAN URL in Safari and use Add to Home Screen.

Keys while the board is open: `c` recalibrate, `s` settings, `m` mouse pointer (dev builds only). Add `?mouse=1` to the URL to drive the board with the mouse when there is no camera around.

## Run the study

Settings, then Start a study session. Enter a tester id, choose eyes or head, calibrate, spell the five phrases, and select Speak after each one. A JSON log downloads at the end. Copy it into `analysis/data/` (that folder is never committed) and run the notebook:

```
cd analysis
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
jupyter notebook pilot.ipynb
```

The notebook writes `public/results.json`, which the landing page renders. That file is ignored by git so tester data never leaks; publish the aggregate numbers on purpose when you decide the pilot is done.

## How the code is laid out

```
src/tracking      camera and MediaPipe, plus pure feature extraction
src/calibration   least squares fit from features to screen, outlier trimming, quality
src/pointer       median prefilter, one-euro smoothing, confidence gate
src/selection     dwell state machine, blink detector, leave guard
src/board         board definitions, custom phrases, layout, sticky hit test, reducer
src/predict       prefix word prediction from a frequency list
src/speech        speechSynthesis wrapper
src/study         session log and text-entry metrics
src/ui            screens and the main loop, the only place that touches the DOM
landing/          the landing page
analysis/         pilot notebook
```

Everything with logic is a pure function with its own tests; the camera and the screen are the only two things that touch the outside world. The manual test checklist is in `docs/manual-test.md`.

## Licence

MIT.
