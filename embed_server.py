from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

# Load a light, fast embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

app = Flask(__name__)

@app.route("/embed", methods=["POST"])
def embed():
    data = request.get_json()
    text = data.get("text")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    vector = model.encode(text).tolist()
    return jsonify({"embedding": vector})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
