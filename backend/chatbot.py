from typing import Dict, List, Tuple

INTENTS: Dict[str, Dict[str, List[str]]] = {
    "range": {
        "keywords": ["range", "km", "kilometre", "kilometer", "distance"],
        "responses": [
            "Range depends on battery size, driving style and temperature. If you tell me a model, I can explain what to check.",
            "For used EVs, ask for real world range and battery health report, not only the brochure number."
        ],
    },
    "charging": {
        "keywords": ["charge", "charging", "charger", "fast", "dc", "ac", "minutes"],
        "responses": [
            "Charging time depends on charger type and the car charging curve. Ask whether it supports fast charging and the peak kW.",
            "A good check is 10 to 80 percent time on a fast charger, plus home charging speed in kW."
        ],
    },
    "battery_health": {
        "keywords": ["battery", "health", "soh", "degradation", "degrade"],
        "responses": [
            "Battery health is key for used EVs. Ask for state of health, service history and charging habits.",
            "Look for warning signs like big range drops, frequent fast charging and no service records."
        ],
    },
    "price": {
        "keywords": ["price", "cost", "budget", "aed", "dirham"],
        "responses": [
            "If you share your budget, I can suggest what to prioritise, like range, year or charging speed.",
            "Used EV prices vary with battery health, warranty and mileage. Those are the 3 checks to do first."
        ],
    },
}

FALLBACK_CATEGORIES: List[str] = ["range", "charging", "battery health"]

def normalise(text: str) -> str:
    return " ".join(text.lower().strip().split())

def match_intent(message: str) -> Tuple[str, str]:
    msg = normalise(message)
    for intent, data in INTENTS.items():
        for kw in data["keywords"]:
            if kw in msg:
                return intent, data["responses"][0]
    fallback = (
        "I did not understand that. You can ask about "
        + ", ".join(FALLBACK_CATEGORIES)
        + "."
    )
    return "fallback", fallback
