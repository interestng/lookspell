# analysis

## pilot notebook

`pilot.ipynb` turns study logs into words per minute, error rate, selections per character, corrections, and face-lost fraction, per phrase and per session, then writes `../public/results.json` for the landing page and saves `wpm-by-mode.png`.

Collect: in the app, Settings, Start a study session. Each finished session downloads `study-<tester>-<mode>-<timestamp>.json`. Copy those files into `data/`. That folder is gitignored; a real tester's log is never committed.

Run:

```
python -m venv .venv
.venv/Scripts/activate        # windows
pip install -r requirements.txt
jupyter notebook pilot.ipynb  # or: jupyter nbconvert --execute --to notebook --inplace pilot.ipynb
```

The metric definitions are copied from `src/study/metrics.ts` and must stay identical to it. If one changes, change both and update the tests.

Publishing numbers: `public/results.json` is gitignored too. When you decide the pilot is done, copy it to `landing/results.json`, point `landing.ts` at it, and commit that copy on purpose.

## word list

`public/words.txt` is the 20k list from first20hours/google-10000-english (Google Trillion Word Corpus, frequency order). Regenerate with `node scripts/fetch-words.mjs`. It contains some words you would not want on a communication board; filtering it is an open task.
