"""Read-only scraper for the SRDI Online Fertilizer Recommendation System (frs-bd.com).
Walks the public lookup form (no login, nothing saved server-side: we never click 'Add').
"""
import requests, re, json, time, sys
from bs4 import BeautifulSoup
U="http://frs-bd.com/"
P='ctl00$ContentPlaceHolder1$'
def form(soup):
    d={}
    for i in soup.select('input'):
        n=i.get('name')
        if n and i.get('type') in ('hidden','text',None): d[n]=i.get('value','')
    for sel in soup.select('select'):
        os_=sel.select('option')
        if not os_: continue
        o=sel.select_one('option[selected]') or os_[0]
        d[sel['name']]=o.get('value','')
    return d
def opts(soup,name):
    sel=soup.find('select',{'name':P+name})
    return [(o.get('value',''),o.text.strip()) for o in sel.select('option') if o.get('value')] if sel else []
class S:
    def __init__(s):
        s.s=requests.Session(); s.s.headers['User-Agent']='Mozilla/5.0 (research; NASA Space Apps student project)'
        s.soup=BeautifulSoup(s.s.get(U,timeout=60).text,'html.parser'); s.B={}
    def set(s,field,val):
        s.B[field]=val; d=form(s.soup); d['__EVENTTARGET']=P+field
        for k,v in s.B.items(): d[P+k]=v
        r=s.s.post(U,data=d,timeout=90); r.raise_for_status()
        s.soup=BeautifulSoup(r.text,'html.parser'); time.sleep(0.7)
    def search(s):
        d=form(s.soup); d['__EVENTTARGET']=P+'btnSearch'
        for k,v in s.B.items(): d[P+k]=v
        r=s.s.post(U,data=d,timeout=90); r.raise_for_status()
        s.soup=BeautifulSoup(r.text,'html.parser'); time.sleep(0.7)
        pn=s.soup.find('div',id=re.compile('UpdatePanel9$')); g=pn.find('table') if pn else None
        rows=[]
        if g:
            for tr in g.select('tr'):
                cells=[re.sub(r'\s+',' ',td.get_text(' ')).strip() for td in tr.select('td')]
                if cells: rows.append(cells)
        return rows
