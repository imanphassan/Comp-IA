import re
import random
from typing import Dict, List, Tuple

INTENTS: Dict[str, Dict] = {
    "range": {
        "keywords": {
            "range": 2, "km": 1, "kilometre": 1, "kilometer": 1, "distance": 1,
            "how far": 2, "miles": 1,
        },
        "responses": [
            "Great question! Range depends on battery size, driving style, and temperature. Which model are you looking at?",
            "Real-world range is usually 10-20% less than the official number. Hot or cold weather can reduce it further.",
            "I'd recommend checking the car's actual range test results, not just the brochure. Want me to explain what affects range?",
        ],
    },
    "charging": {
        "keywords": {
            "charge": 2, "charging": 2, "charger": 2, "fast charge": 3,
            "dc": 1, "ac": 1, "plug": 1, "kw": 1,
        },
        "responses": [
            "Charging speed varies by car and charger type. Most EVs charge from 10-80% in 20-40 minutes on a fast charger.",
            "Good to know: EVs charge fastest between 20-80%. Outside that range, speed drops to protect the battery.",
            "Home charging is usually 7-22 kW, while public fast chargers can go up to 150-350 kW. What setup are you considering?",
        ],
    },
    "battery_health": {
        "keywords": {
            "battery": 2, "health": 1, "soh": 3, "degradation": 3, "degrade": 2,
            "capacity": 2, "warranty": 1,
        },
        "responses": [
            "Battery health is super important for used EVs! A healthy battery should have 85%+ capacity after 5 years.",
            "I'd suggest asking the seller for a battery health report. It shows the state of health (SoH) percentage.",
            "Watch out for batteries with lots of fast charging history—they tend to degrade faster than home-charged ones.",
        ],
    },
    "price": {
        "keywords": {
            "price": 2, "cost": 2, "budget": 2, "aed": 1, "dirham": 1,
            "cheap": 1, "expensive": 1, "afford": 2,
        },
        "responses": [
            "What's your budget? I can help you figure out what to prioritise—range, newer model, or better battery.",
            "Used EV prices depend on battery health, warranty status, and mileage. Those are the big three to check!",
            "A lower price might mean older battery tech. It's worth balancing upfront cost against long-term value.",
        ],
    },
}

FALLBACK_CATEGORIES: List[str] = ["range", "charging", "battery health", "price"]

def normalise(text: str) -> str:
    return " ".join(text.lower().strip().split())

def _word_match(keyword: str, text: str) -> bool:
    pattern = r'\b' + re.escape(keyword) + r'\b'
    return bool(re.search(pattern, text))

def match_intent(message: str) -> Tuple[str, str]:
    msg = normalise(message)
    scores: Dict[str, int] = {}
    
    for intent, data in INTENTS.items():
        score = 0
        for kw, weight in data["keywords"].items():
            if _word_match(kw, msg):
                score += weight
        if score > 0:
            scores[intent] = score
    
    if scores:
        best_intent = max(scores, key=scores.get)
        responses = INTENTS[best_intent]["responses"]
        return best_intent, random.choice(responses)
    
    fallback = (
        "I did not understand that. You can ask about "
        + ", ".join(FALLBACK_CATEGORIES)
        + "."
    )
    return "fallback", fallback
