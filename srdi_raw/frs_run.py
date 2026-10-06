from frs_scrape import *
import json, traceback
UNIONS={'UP000205':[('UN001651','আষাড়িয়াদহ'),('UN001649','ঋষিকুল'),('UN001653','গোগ্রাম'),('UN001650','গোদাগাড়ী'),('UN001654','দেওপাড়া'),('UN001648','পাকড়ী'),('UN001646','বাসুদেবপুর'),('UN001652','মাটিকাটা'),('UN001647','মোহনপুর')],
        'UP000209':[('UN001676','কলমা'),('UN001677','কামারগাঁ'),('UN001680','তালন্দ'),('UN001679','পাঁচন্দর'),('UN001678','বাধাইড়'),('UN001681','সরনজাই')]}
UPN={'UP000205':'Godagari','UP000209':'Tanore'}
# (label, season, category, landtype, crop-name substring)
CROPS=[('Boro rice','3','CAT000018','LT000002','বোরো'),('T.Aman rice','2','CAT000018','LT000002','আমন রোপা'),
       ('Wheat','3','CAT000018','LT000001','গম'),('Mustard','3','CAT000015','LT000001','সরিষা'),('Lentil','3','CAT000014','LT000001','মসুর')]
out=open('frs_results.jsonl','a')
done={(json.loads(l)['union_code'],json.loads(l)['soil_physiography'][0][0],json.loads(l)['crop_label']) for l in open('frs_results.jsonl')}
def base(up,un):
    x=S(); x.set('ddlDivision','DN000003'); x.set('ddlDistrict','D000029'); x.set('ddlUpazila',up); x.set('ddlUnion',un); return x
for up,uns in UNIONS.items():
    for un,unname in uns:
      sps=[s_ for s_ in opts(base(up,un).soup,'ddlSoilPhysiography') if s_[0]!='-1']
      for spv in sps:
        for label,season,cat,lt,sub in CROPS:
            if (un,spv[0],label) in done: continue
            sp=[spv]
            try:
                x=base(up,un)
                x.set('ddlSoilPhysiography',spv[0]); x.set('ddlSeason',season); x.set('ddlCropCategory',cat); x.set('ddlLandType',lt)
                crops=opts(x.soup,'ddlCrop'); m=[c for c in crops if sub in c[1]]
                if not m:
                    rec=dict(upazila=UPN[up],union_code=un,union_bn=unname,crop_label=label,error='crop not offered',crops_offered=crops,soil_physiography=sp); 
                else:
                    x.set('ddlCrop',m[0][0]); rows=x.search()
                    rec=dict(upazila=UPN[up],upazila_code=up,union_code=un,union_bn=unname,soil_physiography=sp,season=season,land_type=lt,crop_label=label,crop_code=m[0][0],crop_bn=m[0][1],rows=rows)
            except Exception as e:
                rec=dict(upazila=UPN[up],union_code=un,union_bn=unname,crop_label=label,error=repr(e))
            out.write(json.dumps(rec,ensure_ascii=False)+'\n'); out.flush(); print(UPN[up],un,label,'err' if 'error' in rec else len(rec['rows']),flush=True)
