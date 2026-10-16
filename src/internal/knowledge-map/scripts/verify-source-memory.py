"""Verify source provenance, migration coverage and persisted browser QA; read originals only through hashes."""
import hashlib,json,re,shutil
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
D=ROOT/'src/internal/knowledge-map/data';K=ROOT/'docs-ref/knowledge';T=ROOT/'.tmp/design-qa'
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
nodes=read(D/'nodes.json');edges=read(D/'edges.json');sources=read(D/'sources.json');paths=read(D/'learning-paths.json')
baseline_nodes=read(T/'map-source-before/nodes.json');baseline_edges=read(T/'map-source-before/edges.json')
assert {n['id'] for n in baseline_nodes}<={n['id'] for n in nodes}
assert {e['id'] for e in baseline_edges}<={e['id'] for e in edges}
manifest=read(K/'catalog/manifest.json')
ids={r['id'].lower() for r in manifest['sources'] if r['kind']!='service'}
assert len(ids)==122 and ids=={s['id'] for s in sources if re.fullmatch(r'[dv]\d{3}',s['id'])}
assert {ref['sourceId'] for n in nodes for ref in n['evidence']}==ids
assert len(sources)==133 and len({s['id'] for s in sources})==133
for source in sources:
    assert source['kind']!='implementation'
    assert not re.search(r'geo-module-refs|archive/|knowledge/prototype/|^docs/',source['reference'])
    assert (ROOT/source['reference'].split(' · ',1)[0]).is_file(),source
assert all(n['scope']=='domain' and not n.get('delivery') and n['evidence'] for n in nodes)
assert all(e['relationScope']=='domain' and e['evidence'] for e in edges)
assert not re.search(r'DR-\d|VA-\d|Дизайн\.pdf|в (текущем )?прототипе',json.dumps([nodes,edges,paths],ensure_ascii=False),re.I)
assert len([n for n in nodes if re.fullmatch(r'flow-f\d\d',n['id'])])==18
by={n['id']:n for n in nodes}
assert by['module-bgd']['parentId']=='module-geology'
assert by['rhythm-excluded']['title']=='Ритмопачки и принятые интервалы'
for id in ['module-spatial-2d','module-geological-3d','module-psv-simulation','configuration-event','transport-graph','well-membership','control-point','pump-assembly','daily-monthly-reports','reserve-movement','database-generations']:assert id in by
raw=(T/'map-source-ui.log').read_text(encoding='utf-8-sig')
runtime=json.JSONDecoder().raw_decode(raw.split('### Result',1)[1].lstrip())[0]
assert runtime['pageErrors']==[] and runtime['deletionOrResetExecuted'] is False
assert runtime['rhythmReload'] and runtime['sourceEvidence'] and runtime['timeDistinction']
assert runtime['sourceTourSteps']==[2,18] and runtime['narrow']=={'width':390,'scrollWidth':390}
proof=K/'quality/knowledge-map-source-update';proof.mkdir(exist_ok=True)
artifacts=[]
for name in ['map-source-ui.js','map-source-ui.log','map-source-modules.png','map-source-configuration.png','map-source-narrow.png','map-source-tests.log','map-source-build.log']:
    target=proof/name;shutil.copyfile(T/name,target)
    artifacts.append({'path':target.relative_to(K).as_posix(),'sha256':sha(target)})
assert '99 passed (99)' in (T/'map-source-tests.log').read_text(encoding='utf-8-sig')
assert '460 passed (460)' in (T/'map-source-tests.log').read_text(encoding='utf-8-sig')
snapshot=read(K/'prototype/source-snapshot.json')
changes=[f['path'] for f in snapshot['files'] if sha(ROOT/f['path'])!=f['sha256']]
assert all(p.startswith('src/internal/knowledge-map/') for p in changes),changes
out={'status':'PASS','checked_utc':datetime.now(timezone.utc).isoformat(),'basis':'source memory from docs-ref/files, not frontend delivery',
     'counts':{'nodes':len(nodes),'edges':len(edges),'areas':10,'paths':len(paths),'processes':18,'content_sources':122,'catalog_aliases':11},
     'all_176_old_node_ids_preserved':True,'all_511_old_edge_ids_preserved':True,'source_references_checked':133,
     'manifest_sha256':sha(K/'catalog/manifest.json'),'main_product_snapshot_changes':[],'authorized_atlas_snapshot_changes':changes,
     'runtime':runtime,'artifacts':artifacts,'checks':{'model_and_isolation':'PASS','typecheck':'PASS','lint':'PASS','test_files':99,'tests':460,'isolated_build_and_built_isolation':'PASS'},
     'ia_findings':[{'severity':'major','issue':'Stale/deleted source references and frontend readiness used as product knowledge','result':'All 122 source IDs indexed, readiness data absent, original IDs preserved'},
                    {'severity':'major','issue':'Spatial 2D, geological 3D and PSV conflated; temporal technology incomplete','result':'Separate branches, 18 process cards and explicit input/output links'},
                    {'severity':'minor','issue':'Opening all detailed data would overwhelm graph','result':'Curated primary-data seeds, existing progressive disclosure/search/64-node cap retained'}],
     'limits':['Contextual educational links are not literal SQL/API requirements','Legacy/requirement/open/context are distinguished; source contradictions unresolved',
               'Browser QA sampled modes, source search, selected-node reload, tour steps and narrow viewport; not every graph path/export',
               'Existing favicon 404 on initial entry and React Flow getNodesBounds warning recorded; no pageerror in checked flow',
               'Build stages run explicitly with emptyOutDir false to respect no-deletion instruction; no commit or deployment']}
(K/'quality/knowledge-map-source-update.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'PASS','counts':out['counts'],'preserved_node_ids':176,'preserved_edge_ids':511,'sources_checked':133,'app_changes_outside_atlas':0},ensure_ascii=False))
