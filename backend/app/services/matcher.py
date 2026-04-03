"""
Thread matcher — dual mode:
- Rule-based: TF-IDF cosine similarity
- LLM mode: OpenAI text-embedding-3-small
"""
from dataclasses import dataclass


@dataclass
class ThreadCandidate:
    thread_id: int
    statement: str
    score: float


def match_rule_based(
    signal_text: str,
    threads: list[dict],  # [{"id": int, "statement": str}]
    top_k: int = 3,
) -> list[ThreadCandidate]:
    if not threads:
        return []

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    import numpy as np

    statements = [t["statement"] for t in threads]
    corpus = statements + [signal_text]

    try:
        vectorizer = TfidfVectorizer(min_df=1)
        tfidf = vectorizer.fit_transform(corpus)
        scores = cosine_similarity(tfidf[-1], tfidf[:-1])[0]
    except Exception:
        return []

    top_indices = np.argsort(scores)[::-1][:top_k]
    return [
        ThreadCandidate(
            thread_id=threads[i]["id"],
            statement=threads[i]["statement"],
            score=float(scores[i]),
        )
        for i in top_indices
        if scores[i] > 0.05
    ]


async def match_llm(
    signal_text: str,
    threads: list[dict],
    client: "AsyncOpenAI",
    embed_model: str = "text-embedding-3-small",
    top_k: int = 3,
) -> list[ThreadCandidate]:
    if not threads:
        return []

    from openai import AsyncOpenAI
    import numpy as np

    try:
        texts = [t["statement"] for t in threads] + [signal_text]
        response = await client.embeddings.create(
            model=embed_model,
            input=texts,
        )
        embeddings = np.array([e.embedding for e in response.data])
        signal_vec = embeddings[-1]
        thread_vecs = embeddings[:-1]

        scores = np.dot(thread_vecs, signal_vec) / (
            np.linalg.norm(thread_vecs, axis=1) * np.linalg.norm(signal_vec) + 1e-9
        )

        top_indices = np.argsort(scores)[::-1][:top_k]
        return [
            ThreadCandidate(
                thread_id=threads[i]["id"],
                statement=threads[i]["statement"],
                score=float(scores[i]),
            )
            for i in top_indices
            if scores[i] > 0.1
        ]
    except Exception:
        return match_rule_based(signal_text, threads, top_k)
