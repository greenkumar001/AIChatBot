import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
COLLECTION = os.getenv("QDRANT_COLLECTION", "news_collection")
EMBED_MODEL = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")  # small and fast

# Example list of article URLs or RSS feed parsing
SAMPLE_URLS = [
    # add ~50 article URLs or build RSS parser
    "https://www.reuters.com/world/europe/..."  # replace with real URLs
]

client = QdrantClient(url=QDRANT_URL.replace("http://", ""), prefer_grpc=False)
model = SentenceTransformer(EMBED_MODEL)

# Create collection if not exists (vector_size from model)
vector_size = model.get_sentence_embedding_dimension()
try:
    client.recreate_collection(
        collection_name=COLLECTION,
        vectors_config=models.VectorParams(size=vector_size, distance=models.Distance.COSINE),
    )
except Exception as e:
    print("Collection exists or creation error:", e)

def fetch_text(url):
    r = requests.get(url, timeout=10)
    soup = BeautifulSoup(r.text, "html.parser")
    paragraphs = soup.find_all('p')
    text = "\n".join(p.get_text() for p in paragraphs)
    return text

def chunk_text(text, chunk_size=400, overlap=50):
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i+chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

all_points = []
id_counter = 1

for url in tqdm(SAMPLE_URLS):
    try:
        text = fetch_text(url)
        chunks = chunk_text(text, chunk_size=200, overlap=40)
        embeddings = model.encode(chunks, show_progress_bar=False)
        for chunk, emb in zip(chunks, embeddings):
            point = models.PointStruct(
                id=str(id_counter),
                vector=emb.tolist(),
                payload={"text": chunk, "source": url}
            )
            all_points.append(point)
            id_counter += 1
    except Exception as e:
        print("Error fetching:", url, e)

# Upsert in batches
BATCH = 64
for i in range(0, len(all_points), BATCH):
    batch = all_points[i:i+BATCH]
    client.upsert(collection_name=COLLECTION, points=batch)

print("Ingestion completed. Points upserted:", len(all_points))
