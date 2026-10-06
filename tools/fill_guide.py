import pandas as pd, json, os, re, sys
t=open('tools/BUILD_GUIDE.template.md').read()
f=pd.read_csv('srdi_frs_fertilizer.csv')
cov=f.groupby(['upazila']).union.nunique().to_dict()
crops=sorted(f.crop.unique())
t=t.replace('{{FRS_ROWS}}',str(len(f)))
t=t.replace('{{FRS_COVERAGE}}',f"{', '.join(crops)} in {cov.get('Godagari',0)} Godagari and {cov.get('Tanore',0)} Tanore unions (one row per fertilizer option)")
def frs_table(upz,union,phys_key):
    s=f[(f.upazila==upz)&(f.union==union)&(f.soil_physiography.str.startswith(phys_key))]
    if s.empty: return None
    cols=[('Urea (if no DAP)','Urea'),('TSP','TSP'),('MoP','MoP'),('Gypsum (with ZnSO4 hepta)','Gypsum'),('ZnSO4 heptahydrate','ZnSO₄·7H₂O'),('Boric acid','Boric acid'),('Lime','Lime')]
    hdr="| Crop | "+" | ".join(c[1] for c in cols)+" |\n|---|"+"--:|"*len(cols)
    rows=[]
    for crop in ['Boro rice','T.Aman rice','Wheat','Mustard','Lentil']:
        c=s[s.crop==crop]
        if c.empty: continue
        vals=[]
        for key,_ in cols:
            r=c[c.fertilizer==key]
            if key.startswith('Gypsum') and r.empty: r=c[c.fertilizer=='Gypsum']
            if r.empty: vals.append('–'); continue
            r=r.iloc[0]; vals.append(f"{r.kg_per_ha:.0f}" if pd.notna(r.kg_per_ha) else ('0' if r.note=='not needed' else str(r.note)))
        rows.append(f"| {crop} | "+" | ".join(vals)+" |")
    return hdr+"\n"+"\n".join(rows)
parts=[]
for upz,un,pk,label in [('Tanore','Kalma','Khiyar','Kalma union, Tanore: Khiyar (Barind) soil'),('Godagari','Char Ashariadaha','Poli','Char Ashariadaha union, Godagari: Poli (alluvial) soil'),('Godagari','Godagari','Khiyar','Godagari union, Godagari: Khiyar (Barind) soil')]:
    tb=frs_table(upz,un,pk)
    if tb and len(parts)<2: parts.append(f"**{label}** (kg/ha, converted from the site's g per decimal × 0.2471; rice on medium-high land, others on high land):\n\n{tb}")
parts.append("“0” means the site says *not needed*, and “–” means the site gave no row. The site also recommends cow dung or compost “as needed” for every crop. Full data: `srdi_frs_fertilizer.csv`.")
t=t.replace('{{FRS_TABLE}}','\n\n'.join(parts))
t=t.replace('{{UNION_TABLE}}',open('/tmp/t_union.md').read())
t=t.replace('{{BARC_TABLE}}',open('/tmp/t_barc.md').read())
ap=open('/tmp/appeears_sample.md').read() if os.path.exists('/tmp/appeears_sample.md') else "_Task submitted and processing at the time of writing; see `samples/` for the request._"
t=t.replace('{{APPEEARS_SAMPLE}}',ap)
t=t.replace('{{APPEEARS_MINUTES}}',open('/tmp/appeears_minutes.txt').read().strip() if os.path.exists('/tmp/appeears_minutes.txt') else 'tens of minutes in the queue')
assert '{{' not in t, re.findall(r'\{\{\w+\}\}',t)
open('BUILD_GUIDE.md','w').write(t); print('written', len(t))
