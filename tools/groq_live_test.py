"""One small live Groq call with our strict schema. Reads GROQ_API_KEY from env (secrets/groq.env); never prints it.
Usage: set -a; . secrets/groq.env; set +a; /workspace/.venv/bin/python tools/groq_live_test.py [model]"""
import json, os, sys, time, requests, jsonschema
model = sys.argv[1] if len(sys.argv) > 1 else "openai/gpt-oss-120b"
schema = json.load(open("schemas/rotation_advice.schema.json"))
SYSTEM = ("You are an agronomy assistant for smallholder farmers in the Barind tract, Bangladesh. "
  "Only recommend rotations from the candidate list, using rotation_id exactly. Copy numeric scores, irrigation_mm and "
  "change_vs_current_pct from the input; never invent numbers. Reasons must cite input values. Mention fertilizer or lime only "
  "from the FRS figures provided. Exactly 3 rotations, 2-4 reasons each, at most 3 risks, at most 4 caveats. Short plain sentences. "
  "Return JSON matching the schema.")
payload = {
 "location": {"upazila": "Tanore", "union": "Kalma"},
 "soil": {"ph_median": 6.2, "om_pct": 1.70, "texture": "Clay Loam", "land_type": "High", "drainage": "Imperfectly drained",
          "frs": {"lentil": {"urea_kg_ha": 54, "tsp_kg_ha": 108, "mop_kg_ha": 50, "lime_kg_ha": 100}}, "source": "SRDI via BARC CZIS"},
 "climate": {"rabi_rain_normal_mm": 31, "smap_rootzone_rabi_m3m3": 0.15},
 "farmer": {"last_crops": {"rabi": "boro", "kharif1": "fallow", "kharif2": "t_aman"}, "budget": "medium", "water": "limited",
            "can_sell": ["rice", "mustard", "lentil"], "priorities": {"profit": 3, "soil": 4, "water": 5}},
 "candidates": [
  {"rotation_id": "R1", "name": "Boro – Fallow – T.Aman", "scores": {"overall": 50, "water": 20, "soil_health": 40, "profit": 70, "climate_risk": 45}, "irrigation_mm": 950, "change_vs_current_pct": 0},
  {"rotation_id": "R3", "name": "Lentil – Fallow – T.Aman", "scores": {"overall": 78, "water": 90, "soil_health": 82, "profit": 61, "climate_risk": 74}, "irrigation_mm": 105, "change_vs_current_pct": -89},
  {"rotation_id": "R5", "name": "Mustard – Fallow – T.Aman", "scores": {"overall": 72, "water": 93, "soil_health": 60, "profit": 55, "climate_risk": 70}, "irrigation_mm": 80, "change_vs_current_pct": -92}]}
body = {"model": model, "reasoning_effort": "low", "include_reasoning": False, "max_completion_tokens": 3000,
        "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": json.dumps(payload, ensure_ascii=False)}],
        "response_format": {"type": "json_schema", "json_schema": {"name": "rotation_advice", "strict": True, "schema": schema}}}
t0 = time.time()
r = requests.post("https://api.groq.com/openai/v1/chat/completions", json=body, timeout=120,
                  headers={"Authorization": f"Bearer {os.environ['GROQ_API_KEY']}"})
lat = round(time.time() - t0, 2)
hdr = {k: v for k, v in r.headers.items() if k.lower().startswith(("x-ratelimit", "retry-after"))}
out = {"tested_at_local": time.strftime("%Y-%m-%d %H:%M %Z"), "model": model, "http_status": r.status_code, "latency_s": lat, "rate_limit_headers": hdr}
if r.ok:
    j = r.json(); content = json.loads(j["choices"][0]["message"]["content"])
    try: jsonschema.validate(content, schema); out["schema_valid"] = True
    except jsonschema.ValidationError as e: out["schema_valid"] = f"no: {e.message}"
    out.update(model_returned=j.get("model"), usage=j.get("usage"), finish_reason=j["choices"][0].get("finish_reason"), content=content)
else:
    out["error"] = r.text[:800]
print(json.dumps(out, indent=2, ensure_ascii=False))
json.dump(out, open("samples/groq_live_response.json", "w"), indent=2, ensure_ascii=False)
