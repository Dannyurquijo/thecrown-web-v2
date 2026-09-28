import json
import urllib.request

def fix_workflow():
    path = r"chatbot\n8n\thecrown_n8n_chatbot_workflow.json"
    with open(path, "r", encoding="utf-8") as f:
        wf = json.load(f)

    # Convertir "Is Duplicate Event?" a un IF v2 con sintaxis estricta o Code node
    for n in wf["nodes"]:
        if n["name"] == "Is Duplicate Event?":
            n["parameters"] = {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "dup_check",
                            "leftValue": "={{ $json.is_duplicate }}",
                            "rightValue": True,
                            "operator": {
                                "type": "boolean",
                                "operation": "equals"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            }
        elif n["name"] == "Is Authenticated?":
            n["parameters"] = {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "auth_check",
                            "leftValue": "={{ $json.authenticated }}",
                            "rightValue": True,
                            "operator": {
                                "type": "boolean",
                                "operation": "equals"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            }
        elif n["name"] == "Consent & Lead Provided?":
            n["parameters"] = {
                "conditions": {
                    "options": {
                        "caseSensitive": True,
                        "leftValue": "",
                        "typeValidation": "strict"
                    },
                    "conditions": [
                        {
                            "id": "consent_check",
                            "leftValue": "={{ $json.consent }}",
                            "rightValue": True,
                            "operator": {
                                "type": "boolean",
                                "operation": "equals"
                            }
                        }
                    ],
                    "combinator": "and"
                }
            }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(wf, f, indent=2, ensure_ascii=False)

    print("SUCCESS: Parameters for IF nodes updated to v2.")

fix_workflow()
