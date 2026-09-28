import json
import sys
import urllib.request
import urllib.error

def update_workflow(api_key, wf_id="T0PtL0CYWgpkfg11", n8n_host="https://n8n.dupixelcode.com"):
    workflow_path = r"chatbot\n8n\thecrown_n8n_chatbot_workflow.json"
    with open(workflow_path, "r", encoding="utf-8") as f:
        wf_data = json.load(f)

    payload = {
        "name": wf_data.get("name", "The Crown Dance Studio - AI Chatbot Workflow"),
        "nodes": wf_data.get("nodes", []),
        "connections": wf_data.get("connections", {}),
        "settings": wf_data.get("settings", {})
    }

    url = f"{n8n_host.rstrip('/')}/api/v1/workflows/{wf_id}"
    headers = {
        "X-N8N-API-KEY": api_key.strip(),
        "Content-Type": "application/json",
        "User-Agent": "CrownAssistantUploader/1.0"
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="PUT")
    try:
        with urllib.request.urlopen(req) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            print(f"SUCCESS: Workflow {wf_id} actualizado correctamente!")
            
            # Asegurar que esté activo
            activate_url = f"{n8n_host.rstrip('/')}/api/v1/workflows/{wf_id}/activate"
            act_req = urllib.request.Request(activate_url, headers=headers, method="POST")
            try:
                with urllib.request.urlopen(act_req) as act_resp:
                    print("SUCCESS: Workflow activado en vivo.")
            except Exception as act_err:
                print(f"Estado de activación: {act_err}")
            return True
    except urllib.error.HTTPError as e:
        print(f"HTTPError {e.code}: {e.read().decode('utf-8', errors='ignore')}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    api_key = sys.argv[1] if len(sys.argv) > 1 else ""
    if api_key:
        update_workflow(api_key)
    else:
        print("Uso: python upload_to_n8n.py <TU_N8N_API_KEY>")
