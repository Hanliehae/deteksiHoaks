# ============================================
# services/similarity.py — Cosine Similarity Search
# ============================================
# Cari top-K berita paling mirip dari train embeddings.
# Sama persis dengan logika connect_test_to_train di Colab.
# ============================================
# CATATAN: Heavy imports (numpy, torch) dilakukan secara lazy
# di dalam function agar tidak memblokir startup Flask.
# ============================================

import os


def build_knn_graph(embeddings, k=5, threshold=0.75):
    """
    Build k-NN graph dari embeddings (sama dengan Colab CP4).
    Setiap node dihubungkan ke top-k tetangga jika similarity >= threshold.
    """
    import numpy as np
    import torch

    norm_emb = embeddings / np.linalg.norm(embeddings, axis=1, keepdims=True)
    sim = norm_emb @ norm_emb.T
    n = len(embeddings)
    edges = []

    for i in range(n):
        sim_i = sim[i].copy()
        sim_i[i] = -1
        top_k = np.argsort(sim_i)[-k:]
        for j in top_k:
            if sim_i[j] >= threshold:
                edges.append([i, j])

    if len(edges) == 0:
        for i in range(n):
            sim_i = sim[i].copy()
            sim_i[i] = -1
            j = int(np.argmax(sim_i))
            edges.append([i, j])

    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    return edge_index

def cosine_similarity_search(query_embedding,
                              train_embeddings,
                              top_k: int = 3) -> list[dict]:
    """
    Cari top-K berita paling mirip berdasarkan cosine similarity.
    """
    import numpy as np

    # Normalize vectors
    query_norm = query_embedding / np.linalg.norm(query_embedding)
    train_norms = train_embeddings / np.linalg.norm(
        train_embeddings, axis=1, keepdims=True
    )

    # Hitung cosine similarity
    similarities = train_norms @ query_norm

    # Ambil top-K indices
    top_indices = np.argsort(similarities)[-top_k:][::-1]

    results = []
    for idx in top_indices:
        results.append({
            "index": int(idx),
            "similarity": float(similarities[idx]),
        })

    return results


def build_edge_index_for_query(query_embedding,
                                train_embeddings,
                                k: int = 5,
                                threshold: float = 0.75):
    """
    Bangun edge_index untuk menghubungkan node query
    ke node-node training yang paling mirip.
    """
    import numpy as np

    # Normalize
    query_norm = query_embedding / np.linalg.norm(query_embedding)
    train_norms = train_embeddings / np.linalg.norm(
        train_embeddings, axis=1, keepdims=True
    )

    # Cosine similarity query vs semua train
    similarities = train_norms @ query_norm

    # Top-k indices
    top_k_indices = np.argsort(similarities)[-k:]

    n_train = len(train_embeddings)
    query_idx = n_train  # Node baru di akhir

    edges = []
    for j in top_k_indices:
        if similarities[j] >= threshold:
            edges.append([query_idx, int(j)])  # query → train
            edges.append([int(j), query_idx])  # train → query (bidirectional)

    # Fallback: jika tidak ada edge di atas threshold, ambil yang terbaik
    if len(edges) == 0:
        best_idx = int(np.argmax(similarities))
        edges.append([query_idx, best_idx])
        edges.append([best_idx, query_idx])

    return edges
