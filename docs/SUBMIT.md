# SUBMIT — exact steps for Ahmad (do from your laptop / Chrome)

Deadline: **Saturday 21 Nov 2026, 14:45 WIB** (02:45 AM EST). Do this the
morning of 21 Nov at the latest — the video upload takes the most time.

Everything below is free. No payment, no wallet, nothing to sign.

## 0. What is already done

- App built + tested (engine tests + full headless UI test + real screenshots):
  `~/workspace/hacklist/bridge-the-gap-hacks/`
- Git repo initialised locally, ready to push (see step 1).
- Devpost description + video script ready: `docs/DEVPOST.md`.
- Screenshots ready: `screenshots/` (use `02-quiz.png` + `04-flashcards.png`).

## 1. Push the repo to GitHub (terminal on your laptop)

```bash
cd ~/workspace/hacklist/bridge-the-gap-hacks
gh repo create bridgelearn --public --source=. --remote=origin
git add -A
git commit -m "BridgeLearn: offline-first AI study buddy (Bridge The Gap Hacks 2026)"
git push -u origin main
```

If `gh` asks to log in, log in with your GitHub account `arukh89` in the
browser when prompted. (A runtime approval card may appear — allow it.)

## 2. Turn on the live demo (optional but recommended, 1 minute)

GitHub repo → **Settings → Pages** → "Build and deployment" → Source:
**Deploy from a branch** → Branch `main`, folder `/ (root)` → Save.
Wait ~1 minute. Live URL: `https://arukh89.github.io/bridgelearn/`
Test it once in your browser (click a sample lesson, generate a quiz).

## 3. Devpost account + register

1. Open https://sq-hacks.devpost.com/ in Chrome.
2. **Register for this hackathon** (top right). If you have no Devpost account,
   sign up with `the89shadow@gmail.com` and confirm the email.
3. No fee, no team needed — solo entry is fine.
4. **CEK DULU SEBELUM LANJUT:** Rules Devpost (dicek verbatim 20 Nov) bilang
   event ini **hanya untuk siswa SMA / mahasiswa S1**, dan jendela registrasi
   tertulis "Now – November 12, 2026" (sudah lewat). Tidak ada batasan
   California-only di Rules. Jadi: (a) kalau kamu bukan siswa SMA/mahasiswa
   aktif, JANGAN submit — tidak eligible; (b) kalau tombol Register sudah
   tertutup, berhenti di sini dan kabari — submit tidak bisa dilanjutkan.

## 4. Record the demo video (2–3 min, phone or laptop screen record)

Follow the shot list in `docs/DEVPOST.md` ("Demo video script"). One take is
fine. Upload to YouTube as **Unlisted**, title:
`BridgeLearn — Bridge The Gap Hacks 2026 demo`. Copy the video link.

## 5. Create the submission (before 14:45 WIB, 21 Nov)

On https://sq-hacks.devpost.com/ → **Create submission** (or "Enter a submission"):

- Title: `BridgeLearn — AI study buddy that works anywhere, even offline`
- Description: copy from `docs/DEVPOST.md` (189 words).
- GitHub repo: `https://github.com/arukh89/bridgelearn`
- Demo video: your YouTube link.
- Images: upload `screenshots/02-quiz.png` and `screenshots/04-flashcards.png`
  (you can add the other three too).
- Live demo link (optional field): `https://arukh89.github.io/bridgelearn/`
- Save, then **Submit**. Check the submission shows as submitted before the
  deadline — Devpost shows a confirmation on the project page.

## 6. After submitting

- Tell the coordinator (main chat) the submission is in; no further action
  needed. Judging criteria are listed in `docs/DEVPOST.md`.
- No prize claim step exists for this event (non-monetary prizes); if the
  project wins, the organisers contact you via Devpost — any prize claim still
  needs a separate confirmation first.
