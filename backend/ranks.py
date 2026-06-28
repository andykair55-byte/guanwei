"""段位配置"""
RANK_CONFIG = {
    "吃瓜群众": {"level": 0, "min_correct": 0, "min_accuracy": 0, "min_total": 0, "icon": "🌱"},
    "瓜田新手": {"level": 1, "min_correct": 10, "min_accuracy": 0.25, "min_total": 30, "icon": "🌿"},
    "鉴瓜学徒": {"level": 2, "min_correct": 30, "min_accuracy": 0.35, "min_total": 80, "icon": "🍀"},
    "瓜田侦探": {"level": 3, "min_correct": 80, "min_accuracy": 0.45, "min_total": 180, "icon": "🔍"},
    "鉴瓜达人": {"level": 4, "min_correct": 200, "min_accuracy": 0.50, "min_total": 400, "icon": "🎯"},
    "鉴瓜大师": {"level": 5, "min_correct": 400, "min_accuracy": 0.55, "min_total": 800, "icon": "🏆"},
    "见微先知": {"level": 6, "min_correct": 800, "min_accuracy": 0.60, "min_total": 1500, "icon": "✨"},
}

def calculate_rank(correct_guesses: int, total_guesses: int) -> str:
    if total_guesses == 0:
        return "吃瓜群众"
    accuracy = correct_guesses / total_guesses
    ranks = list(RANK_CONFIG.keys())
    for i in range(len(ranks) - 1, -1, -1):
        rank = ranks[i]
        config = RANK_CONFIG[rank]
        if (correct_guesses >= config["min_correct"] and 
            total_guesses >= config["min_total"] and 
            accuracy >= config["min_accuracy"]):
            return rank
    return "吃瓜群众"
