import json

path = r"chatbot\n8n\thecrown_n8n_chatbot_workflow.json"
with open(path, "r", encoding="utf-8") as f:
    wf = json.load(f)

for n in wf["nodes"]:
    if n["name"] == "Call AI Model (HTTP Request)":
        n["parameters"]["authentication"] = "none"
        if "genericAuthType" in n["parameters"]:
            del n["parameters"]["genericAuthType"]

with open(path, "w", encoding="utf-8") as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print("SUCCESS: authentication set to none in Call AI Model node.")
