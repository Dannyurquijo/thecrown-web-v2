import json

path = r"chatbot\n8n\thecrown_n8n_chatbot_workflow.json"
with open(path, "r", encoding="utf-8") as f:
    wf = json.load(f)

for n in wf["nodes"]:
    if n["name"] == "Check Authentication":
        js = n["parameters"]["jsCode"]
        js = js.replace("$env.N8N_CROWN_API_KEY || ", "")
        n["parameters"]["jsCode"] = js
    elif n["name"] == "Prepare Context & AI Payload":
        js = n["parameters"]["jsCode"]
        js = js.replace("$env.CROWN_WHATSAPP_URL || ", "")
        n["parameters"]["jsCode"] = js
    elif n["name"] == "Call AI Model (HTTP Request)":
        auth_param = n["parameters"]["headerParameters"]["parameters"][0]
        auth_param["value"] = "=Bearer {{ $('Webhook Inbound (Secure)').item.json.headers['x-gemini-key'] || '' }}"

with open(path, "w", encoding="utf-8") as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print("SUCCESS: Workflow updated cleanly without any $env references.")
