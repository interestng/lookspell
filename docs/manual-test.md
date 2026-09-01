# manual test checklist

Run on laptop Chrome, laptop Edge, and iPhone Safari (via `npm run dev`, open the Network URL, accept the certificate, then Add to Home Screen). Tick each line per browser.

## start

- [ ] permission screen shows, button turns the camera on
- [ ] denying the camera shows the camera-blocked screen with browser-specific steps, retry works
- [ ] with the network off on first load, the model-failed screen shows, retry works once online
- [ ] status pill reads `face found` with a face in frame, `face lost` within a second of leaving

## calibration

- [ ] 9 dots, about 14 seconds, hint text matches the mode (eyes vs head)
- [ ] after calibration the pointer follows the eyes roughly across the board
- [ ] status shows `cal ok` for a normal fit, `cal poor` when you look away during calibration
- [ ] reload keeps the calibration, resizing the window by more than 10% triggers a new one
- [ ] `c` key forces a recalibration

## selection

- [ ] dwell: ring fills in about 0.9 s and the zone activates
- [ ] looking away pauses the ring, nothing is selected while `face lost`
- [ ] after a selection the zone at the same position is not reselected until the gaze leaves it
- [ ] blink mode: ring is full while hovering, a deliberate long blink selects, normal blinks do not
- [ ] head mode: pointer follows head turns, calibration is separate from gaze mode

## board

- [ ] 9 zones on a laptop, 6 zones on a phone, override in settings reloads with the chosen count
- [ ] spell two words, predictions appear, Words board fills with them, choosing one completes the word
- [ ] Space, Delete letter, Delete word, Clear behave
- [ ] Speak reads the text aloud, text turns accent colour while speaking
- [ ] composed text never moves the zone grid, long text scrolls so the newest characters stay visible
- [ ] dark and light schemes both readable, ring and pointer visible in both

## settings

- [ ] `s` opens settings, every control is dwell-selectable, changes apply live and survive a reload
- [ ] dwell slider between 600 and 2000 ms changes the ring speed immediately
- [ ] voice list shows English voices, selection changes the voice

## study

- [ ] form requires a tester id, choosing head recalibrates in head mode
- [ ] target phrase shows above the strip and advances after Speak
- [ ] after the fifth phrase a JSON file downloads and the summary table shows
- [ ] the JSON has exactly 5 `phrase_end` events and a `session_end`
