# Speech sample

`speech-sample.wav` is a short spoken sentence ("Maize needs good drainage after
heavy rain.") recorded by the free local speech stack. It is a test fixture, not
farm data and not a recording of a person.

It lets `scripts/test-app-ai-e2e.mjs` check the path a farmer actually uses —
record a question, have it transcribed, get an answer — on a deployment whose
speech backend cannot read answers aloud yet. Without it, the recording path
could only be checked where a backend can also speak.

Regenerate it with the local speech stack running:

```sh
node scripts\make-speech-sample.mjs
```

The check matches on the word "drainage" because the tiny local ASR model can
mishear the crop name; the transcription itself is never compared word for
word.
