"""Refresh the self-contained dashboard snapshot from a generalization run."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent
DEFAULT_RUN = ROOT.parent/'training_ws/gen/runs/rs-imle-first-video'


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--run', type=Path, default=DEFAULT_RUN)
    p.add_argument('--output', type=Path, default=Path('data.json'))
    args = p.parse_args()
    run = args.run.resolve()
    result = json.loads((run/'results.json').read_text())
    rows = []
    fields = ['episode_id', 'base_scene_id', 'scene_seed', 'sample_seed', 'condition', 'count', 'layout',
              'slots', 'success', 'steps', 'timeout', 'final_count', 'max_placed', 'stage_steps',
              'ground_falls', 'continuation', 'status', 'scene', 'scene_sha256',
              'initial_state_sha256', 'action_sha256', 'count_transitions']
    for path in sorted((run/'episodes').glob('*.json')):
        row = json.loads(path.read_text())
        compact = {k: row.get(k) for k in fields}
        if row.get('video'):
            source = Path(row['video']['path'])
            if not source.exists():
                source = run/'videos'/row['condition']/source.name
            dest = ROOT/'assets/videos'/source.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, dest)
            poster = ROOT/'assets/posters'/f'{source.stem}.jpg'
            poster.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', str(dest), '-frames:v', '1', str(poster)], check=True)
            compact.update(video=dest.relative_to(ROOT).as_posix(), poster=poster.relative_to(ROOT).as_posix(),
                           video_frames=row['video']['frames'], video_fps=row['video']['fps'])
        rows.append(compact)
    snapshot = dict(source_run=run.name, protocol=result['protocol'], status_counts=result['status_counts'], episodes=rows)
    (ROOT/args.output).write_text(json.dumps(snapshot, indent=2)+'\n')
    print(f'Exported {len(rows)} episodes and {sum(bool(r.get("video")) for r in rows)} videos.')


if __name__ == '__main__':
    main()
