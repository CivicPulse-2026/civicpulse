from app.services.similarity_service import (
    classify_similarity,
    cosine_similarity,
    generate_embedding,
    haversine_m,
)


complaints = [
    {
        "text": (
            "There has been no street light near Gate 3 "
            "for almost a week."
        ),
        "lat": 24.8333,
        "lng": 92.7789,
    },
    {
        "text": (
            "The lamp beside Gate 3 has been broken for "
            "several days and the road is dark at night."
        ),
        "lat": 24.8335,
        "lng": 92.7790,
    },
    {
        "text": (
            "Garbage has not been collected from the market "
            "for three days."
        ),
        "lat": 24.8350,
        "lng": 92.7820,
    },
]


print("Loading local embedding model...\n")

embeddings = [
    generate_embedding(item["text"])
    for item in complaints
]

print("Embedding dimension:", len(embeddings[0]))
print()


for i in range(len(complaints)):
    for j in range(i + 1, len(complaints)):

        similarity = cosine_similarity(
            embeddings[i],
            embeddings[j],
        )

        distance = haversine_m(
            complaints[i]["lat"],
            complaints[i]["lng"],
            complaints[j]["lat"],
            complaints[j]["lng"],
        )

        relationship = classify_similarity(
            similarity,
            distance,
        )

        print(f"Complaint {i + 1} vs Complaint {j + 1}")
        print(f"Semantic similarity: {similarity:.3f}")
        print(f"Geographic distance: {distance:.1f} m")
        print(f"Relationship: {relationship}")
        print("-" * 50)