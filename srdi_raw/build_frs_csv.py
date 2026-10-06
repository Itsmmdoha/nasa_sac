import json, csv, re
BN=str.maketrans('০১২৩৪৫৬৭৮৯','0123456789')
NUT={'নাইট্রোজেন':'N','ফসফরাস':'P','পটাশিয়াম':'K','গন্ধক':'S','দস্তা':'Zn','বোরণ':'B','গোবর':'Manure','জৈব পদার্থ':'Organic matter','পিএইচ':'pH (lime)','ম্যাগনেসিয়াম':'Mg'}
FERT=[('টিএসপি','TSP'),('ডিএপি','DAP'),('এমওপি','MoP'),
      ('জিপসাম (যদি জিংক সালফেট (হেপ্টা)','Gypsum (with ZnSO4 hepta)'),('জিপসাম (যদি জিংক সালফেট(মনো)','Gypsum (with ZnSO4 mono)'),('জিংক সালফেট (হেপ্টা)','ZnSO4 heptahydrate'),('জিংক সালফেট(মনো)','ZnSO4 monohydrate'),
      ('বরিক এসিড','Boric acid'),('সলুবর','Solubor'),('গোবর/কম্পোষ্ট','Cow dung/compost'),('ডলোচুন','Dolomite'),('চুন','Lime'),('জিপসাম','Gypsum')]
PHYS={'খিয়ার মাটি':'Khiyar (Barind terrace soil)','পলি মাটি':'Poli (alluvial / floodplain soil)'}
UN={'আষাড়িয়াদহ':'Char Ashariadaha','ঋষিকুল':'Rishikul','গোগ্রাম':'Gogram','গোদাগাড়ী':'Godagari','দেওপাড়া':'Deopara','পাকড়ী':'Pakri','বাসুদেবপুর':'Basudebpur','মাটিকাটা':'Matikata','মোহনপুর':'Mohanpur',
    'কলমা':'Kalma','কামারগাঁ':'Kamargaon','তালন্দ':'Talanda','পাঁচন্দর':'Pachandar','বাধাইড়':'Badhair','সরনজাই':'Saranjai'}
LT={'LT000001':'High land','LT000002':'Medium high land'}
SEASON={'1':'Kharif-1','2':'Kharif-2','3':'Rabi'}
out=[]
SEEN=set()
import itertools
for l in itertools.chain(open('srdi_raw/frs_results.jsonl'),open('srdi_raw/frs_results_tanore.jsonl')):
    r=json.loads(l)
    if not r.get('rows'): continue
    key=(r['union_code'],r['soil_physiography'][0][0],r['crop_label'])
    if key in SEEN: continue
    SEEN.add(key)
    for c in r['rows']:
        if len(c)<5 or not c[1]: continue
        nut=NUT.get(c[1],c[1]); fe=('Urea (if no DAP)' if 'না' in c[2] else 'Urea (if DAP used)') if c[2].startswith('ইউর') else next((e for b,e in FERT if c[2].startswith(b)),c[2])
        amt=c[3].translate(BN); mk=re.match(r'(\d+)\s*কেজি\s*(\d+)\s*গ্রাম',amt); m=re.match(r'([\d.]+)\s*গ্রাম',amt)
        g=(int(mk.group(1))*1000+int(mk.group(2))) if mk else (float(m.group(1)) if m else None)
        out.append(dict(upazila=r['upazila'],union=UN.get(r['union_bn'],r['union_bn']),union_bn=r['union_bn'],
            soil_physiography=('Khiyar (Barind terrace soil)' if r['soil_physiography'][0][0]=='SP000019' else 'Poli (alluvial / floodplain soil)' if r['soil_physiography'][0][0]=='SP000012' else r['soil_physiography'][0][1]),season=SEASON[r['season']],land_type=LT[r['land_type']],
            crop=r['crop_label'],crop_bn=r['crop_bn'],nutrient=nut,fertilizer=fe,
            grams_per_decimal=g if g is not None else '',kg_per_ha=round(g*0.2471,1) if g is not None else '',
            note=('' if g is not None else ('not needed' if 'নেই' in amt else ('as needed' if 'মত' in amt else amt))),
            source='SRDI Online Fertilizer Recommendation System (public lookup form)',source_url='http://frs-bd.com/'))
with open('srdi_frs_fertilizer.csv','w',newline='') as fh:
    w=csv.DictWriter(fh,fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
print(len(out))
