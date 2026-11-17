'use strict';
const $ = id => document.getElementById(id);
const layouts = ['nominal', 'jitter', 'cluster', 'one-sided', 'free'];
const labels = {nominal:'Nominal anchors',jitter:'Broad jitter',cluster:'Dense cluster','one-sided':'One-sided',free:'Free layout'};
const subtitles = {nominal:'Matched starting arrangement',jitter:'±40 mm about training anchors',cluster:'≥20 mm surface clearance','one-sided':'All objects in one Y half-plane',free:'Collision-free source region'};
const state = {pilot:null,release:null,cohort:'pilot',count:4,layout:'nominal',releaseId:null};
const time = controls => `${(controls/10).toFixed(1)} s`;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function renderMatrix(){
  const matrix = $('matrix');
  matrix.innerHTML = '<div class="matrix-col" style="text-align:left">STARTING LAYOUT</div>' + [2,3,4].map(n=>`<div class="matrix-col">${n} OBJECTS</div>`).join('');
  for(const layout of layouts){
    const heading=document.createElement('div'); heading.className='matrix-row';
    heading.innerHTML=`${labels[layout]}<small>${subtitles[layout]}</small>`; matrix.append(heading);
    for(const count of [2,3,4]){
      const row=state.pilot.episodes.find(e=>e.layout===layout&&e.count===count);
      if(!row) throw new Error(`Missing pilot cell: ${layout}/${count}`);
      const button=document.createElement('button');
      button.className=`matrix-cell ${row.success?'full':row.final_count?'partial':'empty'}`;
      button.setAttribute('aria-label',`${labels[layout]}, ${count} objects: ${row.final_count} of ${count} supported. ${row.success?'Success':'Timeout'}. Watch episode.`);
      button.setAttribute('aria-pressed',state.cohort==='pilot'&&state.layout===layout&&state.count===count?'true':'false');
      button.innerHTML=`<span class="fraction">${row.final_count} <small>/ ${count}</small></span><span class="dot" aria-hidden="true"></span>`;
      button.addEventListener('click',()=>{state.cohort='pilot';state.layout=layout;state.count=count;renderSelection();$('film-room').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
      matrix.append(button);
    }
  }
}

function sceneMap(row){
  const project=(x,y)=>[20+(x+.4)/.8*300,18+(.3-y)/.6*150];
  const goal=project(row.scene.goal_x,row.scene.goal_y);
  const half=row.scene.goal_half_width;
  const colors={blue:'#5690af',orange:'#c18a51',purple:'#9582a1'};
  const objects=row.scene.objects.map((object,i)=>{
    const [x,y]=project(...object.xy); const w=object.size[0]/.8*300,h=object.size[1]/.6*150;
    return `<g transform="translate(${x},${y}) rotate(${-object.yaw*180/Math.PI})"><rect x="${-w/2}" y="${-h/2}" width="${w}" height="${h}" rx="1" fill="${colors[object.material]||'#87957e'}"/><text x="0" y="3" text-anchor="middle" fill="#fff" font-size="7" font-family="monospace">${row.slots[i]+1}</text></g>`;
  }).join('');
  $('scene-map').innerHTML=`<svg viewBox="0 0 340 190" role="img" aria-label="Top view of requested object footprints on the source side of the table and the fixed goal region"><rect x="20" y="18" width="300" height="150" fill="none" stroke="#d3d9ce"/><path d="M170 18v150M20 93h300" stroke="#dce0d6" stroke-dasharray="2 4"/><rect x="${goal[0]-half/.8*300}" y="${goal[1]-half/.6*150}" width="${half*2/.8*300}" height="${half*2/.6*150}" fill="#e1e9de" stroke="#59836a" stroke-dasharray="3 3"/><text x="${goal[0]}" y="${goal[1]+3}" fill="#59836a" font-size="7" font-family="monospace" text-anchor="middle">GOAL</text>${objects}<text x="20" y="183" fill="#8a9484" font-size="7" font-family="monospace">X: −0.4 → +0.4 m</text><text x="320" y="183" text-anchor="end" fill="#8a9484" font-size="7" font-family="monospace">Y: −0.3 → +0.3 m</text></svg>`;
}

function renderSelection(){
  $('cohort').value=state.cohort;
  $('pilot-controls').hidden=state.cohort!=='pilot';$('release-controls').hidden=state.cohort!=='release';
  document.querySelectorAll('[data-count]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.count)===state.count?'true':'false'));
  $('layout').value=state.layout;
  const row=state.cohort==='pilot'?state.pilot.episodes.find(e=>e.count===state.count&&e.layout===state.layout):state.release.episodes.find(e=>e.episode_id===state.releaseId);
  if(!row) return;
  renderMatrix();
  const title=state.cohort==='pilot'?`${labels[row.layout]} / ${row.count} objects`:`Released scene ${row.scene_seed} / 4 objects`;
  $('clip-title').textContent=title;
  $('clip-badge').textContent=row.success?'Complete tower':row.timeout?'Time limit reached':row.status;
  $('clip-badge').className=`badge ${row.success?'':'timeout'}`;
  const player=$('player');player.pause();player.src=row.video;player.poster=row.poster;player.playbackRate=1;player.load();
  $('clip-id').textContent=`SCENE ${row.scene_seed} · SAMPLE ${row.sample_seed}`;
  $('download-video').href=row.video;
  $('final-count').textContent=`${row.final_count} / ${row.count}`;
  $('peak-count').textContent=`${row.max_placed} / ${row.count}`;
  $('outcome').textContent=row.success?'Success':row.timeout?'Timeout':'Stopped';
  $('success-time').textContent=row.success?time(row.steps):'Not reached';
  $('timeline-duration').textContent=`0 → ${time(row.steps)} primary rollout`;
  $('timeline').replaceChildren();$('milestones').replaceChildren();
  row.stage_steps.forEach((step,i)=>{
    const seek=()=>{player.currentTime=step/10;player.focus();};
    const marker=document.createElement('button');marker.className='timeline-marker';marker.style.left=`${step/row.steps*100}%`;marker.setAttribute('aria-label',`Seek to first attainment of ${i+1} supported objects at ${time(step)}`);marker.addEventListener('click',seek);$('timeline').append(marker);
    const label=document.createElement('button');label.textContent=`${i+1} object${i?'s':''} · ${time(step)}`;label.addEventListener('click',seek);$('milestones').append(label);
  });
  if(!row.stage_steps.length) $('milestones').textContent='No supported placement recorded during the primary rollout.';
  if(row.success) $('episode-note').textContent=`All ${row.count} objects supported at ${time(row.steps)}. ${row.continuation.tower_damage?'Tower damage was observed':'The tower remained intact'} during the following ${time(row.continuation.controls)}.`;
  else $('episode-note').textContent=`${row.final_count} supported object${row.final_count===1?'':'s'} at ${time(row.steps)}. ${row.max_placed?`Peak tower count: ${row.max_placed}.`:'No supported placement recorded.'} This log does not establish the cause of failure.`;
  sceneMap(row);
}

function renderRelease(){
  const data=state.release;
  const passed=data.episodes.filter(r=>r.success).length;
  const root=$('release-check');root.hidden=false;
  root.innerHTML=`<div class="section-heading"><div><span class="eyebrow">CONTROL CHECK / RELEASED SCENES</span><h2>Does the original task still work?</h2></div><span class="quiet">Five supplied development scenes · four objects</span></div><div class="release-overview"><div class="release-score">${passed}<span style="font-size:24px;color:var(--muted)"> / ${data.episodes.length}</span></div><div class="release-copy">Complete towers on the first five scenes in the released development panel, using the same checkpoint and sampler. This is a separate original-task sanity check, not a paired generalization comparison or an independent final-test estimate.</div></div><div class="release-scenes"></div>`;
  const releaseSelect=$('release-scene');releaseSelect.replaceChildren();
  for(const row of data.episodes){
    const button=document.createElement('button');button.className=row.success?'passed':'not-passed';button.textContent=`${row.scene_seed} · ${row.success?'4/4 ✓':`${row.final_count}/4 timeout`}`;
    button.addEventListener('click',()=>{state.cohort='release';state.releaseId=row.episode_id;releaseSelect.value=row.episode_id;renderSelection();$('film-room').scrollIntoView({behavior:'smooth'});});root.querySelector('.release-scenes').append(button);
    const option=document.createElement('option');option.value=row.episode_id;option.textContent=`Scene ${row.scene_seed} · ${row.success?'success':'timeout'}`;releaseSelect.append(option);
  }
  state.releaseId=data.episodes[0].episode_id;
  document.querySelector('#cohort option[value=release]').disabled=false;
  $('release-data-link').hidden=false;
}

async function main(){
  const response=await fetch('data.json');if(!response.ok) throw new Error('Missing pilot snapshot');state.pilot=await response.json();
  const rows=state.pilot.episodes;
  $('success-count').textContent=`${rows.filter(e=>e.success).length} / ${rows.length}`;
  const shifted=rows.filter(e=>e.layout!=='nominal');$('shift-count').textContent=`${shifted.filter(e=>e.success).length} / ${shifted.length}`;
  $('base-count').textContent=String(new Set(rows.map(e=>e.base_scene_id)).size).padStart(2,'0');
  $('source-seed').textContent=`${[...new Set(rows.map(e=>e.scene_seed))].join(', ')} / ${[...new Set(rows.map(e=>e.sample_seed))].join(', ')}`;
  $('source-run').textContent=state.pilot.source_run;$('checkpoint').textContent=state.pilot.protocol.checkpoint_sha256;
  renderMatrix();renderSelection();
  document.querySelectorAll('[data-count]').forEach(b=>b.addEventListener('click',()=>{state.count=Number(b.dataset.count);renderSelection();}));
  $('layout').addEventListener('change',e=>{state.layout=e.target.value;renderSelection();});
  $('cohort').addEventListener('change',e=>{state.cohort=e.target.value;renderSelection();});
  $('release-scene').addEventListener('change',e=>{state.releaseId=e.target.value;renderSelection();});
  const release=await fetch('release-data.json');if(release.ok){state.release=await release.json();renderRelease();}
}
main().catch(error=>{$('load-error').hidden=false;console.error(error);});
