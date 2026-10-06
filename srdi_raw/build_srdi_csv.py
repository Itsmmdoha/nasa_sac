import json, csv, re
from shapely.geometry import shape, Point
G="https://map2.cropzoning.gov.bd/geoserver/wfs"
UPZ={'508134':'Godagari','508194':'Tanore'}
def src(layer,U,fmt='&outputFormat=application/json&srsName=EPSG:4326'):
    return f"{G}?service=WFS&version=1.1.0&request=GetFeature&typeName=wsBARC:{layer}_{U}{fmt}"
PAU={'Go':'Godagari Paurashava','Ka':'Kakanhat Paurashava','Ta':'Tanore Paurashava','Mu':'Mundumala Paurashava'}
rows=[]
for U,uname in UPZ.items():
    unions=[(f['properties'],shape(f['geometry'])) for f in json.load(open(f'srdi_raw/barc/union_{U}.json'))['features']]
    for f in json.load(open(f'srdi_raw/barc/sol_{U}.json'))['features']:
        p=f['properties']; lon,lat=f['geometry']['coordinates']; pt=Point(lon,lat)
        un=next((u for u,g in unions if g.contains(pt)),None)
        if un is None: un=min(unions,key=lambda ug:ug[1].distance(pt))[0]; note='nearest union (point outside polygons)'
        else: note=''
        nm=un['name_en']; m=re.match(r'Ward No-(\d+) \((\w\w)',nm)
        if m: nm=f"{PAU.get(m.group(2),m.group(2))} (ward {int(m.group(1))})"
        rows.append(dict(upazila=uname,upazila_geocode=U,union=nm,union_geocode=un['code'],sample_no=p['smpl_no'],
            lat=round(lat,5),lon=round(lon,5),map_unit=p['mu'],land_type=p['land_type'],soil_series=p['sg_name'],texture=p['texture'],
            ph=p['ph'],om_pct=p['om'],total_n_pct=p['n'],p_ppm=p['po'],k_meq100g=p['k'],s_ppm=p['s'],zn_ppm=p['zn'],b_ppm=p['b'],
            ca_meq100g=p['ca'],mg_meq100g=p['mg'],cu_ppm=p['cu'],fe_ppm=p['fe'],mn_ppm=p['mn'],ec=p['ec'],
            join_note=note,source='SRDI upazila soil survey samples, served by BARC Crop Zoning GeoServer (layer upazila_sol)',source_url=src('upazila_sol',U)))
rows.sort(key=lambda r:(r['upazila'],r['union'],r['sample_no']))
with open('srdi_sample.csv','w',newline='') as fh:
    w=csv.DictWriter(fh,fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print('samples',len(rows))
# map units
mu=[]
props="gid,upz_code,map_unit,map_unit_area,land_type_name,land_type_area,soil_group,soil_group_name,soil_group_area,aez,land_form_name,texture_name,consistency_name,drainage_name,reaction_name,moisture_name,slope_name,salinity_name,recession_name,fallow_land,non_c_land"
for U,uname in UPZ.items():
    for f in json.load(open(f'srdi_raw/barc/edaphic_{U}.json'))['features']:
        p=f['properties']
        mu.append(dict(upazila=uname,upazila_geocode=U,map_unit=p['map_unit'],map_unit_area_ha=p['map_unit_area'],aez=p['aez'],
          land_type=p['land_type_name'],land_type_area_ha=p['land_type_area'],soil_series=p['soil_group_name'],soil_series_area_ha=p['soil_group_area'],
          landform=p['land_form_name'],texture=p['texture_name'],consistency=p['consistency_name'],drainage=p['drainage_name'],
          reaction_ph_class=p['reaction_name'],moisture=p['moisture_name'],slope=p['slope_name'],salinity=p['salinity_name'],
          water_recession=p['recession_name'],source='SRDI land & soil database (1:50,000), served by BARC Crop Zoning GeoServer (layer edaphic_data)',
          source_url=src('edaphic_data',U,'&outputFormat=application/json&propertyName='+props)))
mu.sort(key=lambda r:(r['upazila'],r['map_unit'],r['land_type']))
with open('srdi_land_units.csv','w',newline='') as fh:
    w=csv.DictWriter(fh,fieldnames=list(mu[0])); w.writeheader(); w.writerows(mu)
print('land units',len(mu))
