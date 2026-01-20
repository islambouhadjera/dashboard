import sys
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from gpt4all import GPT4All

# Initialize Flask App
app = Flask(__name__)
CORS(app)

# Configuration
MODEL_PATH = r"C:\Users\MOHAMED\AppData\Local\nomic.ai\GPT4All\Meta-Llama-3-8B-Instruct.Q4_0.gguf"
PORT = 5001

# Global variable for the model
model = None

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        print(f"Loading model from {MODEL_PATH}...", file=sys.stderr)
        try:
            # allow_download=False ensures we only use the local file
            # Force CPU to avoid GPU/Vulkan crashes which are common with some drivers
            model = GPT4All(MODEL_PATH, allow_download=False, device='cpu')
            print("Model loaded successfully on CPU!", file=sys.stderr)
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
    else:
        print(f"Model not found at {MODEL_PATH}", file=sys.stderr)

# Load model on startup
load_model()

# Database Schema Context
SCHEMA_CONTEXT = """
Vous êtes un expert en SQL pour une base de données MySQL.
Votre tâche est de générer UNIQUEMENT une requête SQL valide répondant à la question de l'utilisateur.
Ne donnez AUCUNE explication, SEULEMENT le code SQL.

Base de données: mobilis_dashboard

Tables:
1. speed_tests:
   - download_mbps (DECIMAL): Vitesse de téléchargement
   - upload_mbps (DECIMAL): Vitesse de téléversement
   - latency_ms (INT): Latence
   - jitter_ms (INT): Jitter
   - network_type (ENUM): '2G', '3G', '4G', '5G'
   - signal_strength_dbm (INT): Force du signal
   - wilaya (VARCHAR): Région (ex: Alger, Oran)
   - commune (VARCHAR): Ville/Commune
   - latitude (DECIMAL)
   - longitude (DECIMAL)
   - timestamp (DATETIME): Date du test
   - operator (VARCHAR): 'Mobilis'

2. bts_antennas:
   - nom (VARCHAR): Nom de l'antenne
   - wilaya (VARCHAR)
   - commune (VARCHAR)
   - latitude (DECIMAL)
   - longitude (DECIMAL)
   - etatA, etatB, etatC (ENUM): 'actif', 'inactif', 'maintenance'

Règles:
- Utilisez SEULEMENT les colonnes listées ci-dessus.
- Si la question est impossible à répondre avec ces données, répondez par "IMPOSSIBLE: [Raison]".
- Pour des moyennes, utilisez AVG().
- Pour des comptages, utilisez COUNT().
- Groupez par wilaya ou commune si demandé.
- Limitez les résultats à 20 si non spécifié.
"""

@app.route('/ask', methods=['POST'])
def ask():
    global model
    if not model:
        return jsonify({"error": "Model not loaded. Check server logs."}), 500

    data = request.json
    question = data.get('question', '')
    
    if not question:
        return jsonify({"error": "No question provided"}), 400

    prompt = f"{SCHEMA_CONTEXT}\n\nQuestion User: {question}\nSQL:"
    
    try:
        # Generate response
        response = model.generate(prompt, max_tokens=200, temp=0.1)
        
        # Clean up response (sometimes LLMs add markdown code blocks)
        cleaned_response = response.replace("```sql", "").replace("```", "").strip()
        
        return jsonify({
            "sql": cleaned_response,
            "original_response": response
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Run the server
    print(f"Starting LLM Server on port {PORT}...", file=sys.stderr)
    app.run(host='0.0.0.0', port=PORT)
