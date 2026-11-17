# wm_project_share

A local, self-contained dashboard for the first RS-IMLE generalization pilot. Includes episode data and 20 original videos. No frontend dependencies, build step, analytics or external assets.

## View

```bash
python serve.py
```

Open **http://127.0.0.1:8000**. The local server supports video byte ranges for scrubbing. You can also host this folder on any static server, including GitHub Pages (repository root, main branch).

## What is reported

- **Generalization pilot:** one independent base scene (`6200003`), counts 2/3/4 crossed with five initial layouts, one inference seed. One of 15 episodes succeeds: the nominal four-object scene. Reduced-count nominal scenes retain one supported object; all 12 shifted-layout episodes retain zero.
- **Release sanity check:** first five scenes from the supplied release **development** panel (`103002`, `103026`, `103032`, `103039`, `103084`), unmodified nominal four-object configurations. Four successes; scene `103002` times out at 2/4 supported objects. These are development scenes, not final-test estimates.
- Same released RS-IMLE checkpoint (`5b61bd48…`), zero-noise one-step sampler, five-control execution blocks, 1,795-control primary horizon, ten-control success hold. Successful rollouts include 100 continuation controls.

The result matrix shows **final supported count / target**, not success probability. The film room includes all 20 clips, placement milestone seeking, final/peak counts and requested scene maps. Pilot statistics exclude the separate release check. A single base scene cannot establish population-level generalization reliability or failure causes.

## Files

- `index.html`, `style.css`, `app.js`: responsive report and interactive film room.
- `data.json`, `release-data.json`: compact, downloadable source snapshots; includes scene and execution hashes.
- `assets/videos/`: copies of original MP4 files (front + side cameras, 256×128, 10 fps).
- `assets/posters/`: initial video frames, extracted with FFmpeg.
- `build_data.py`: refresh snapshots from completed local run logs (Python + FFmpeg).
- `serve.py`: standard-library HTTP server with video seeking support.

Refresh from the original workspace:

```bash
python build_data.py
python build_data.py --run ../training_ws/gen/runs/rs-imle-release-five-video --output release-data.json
```

The repository is a snapshot of this pilot; update the narrative alongside the data if importing a different experiment. No checkpoints, training data, credentials or simulator assets are included.
