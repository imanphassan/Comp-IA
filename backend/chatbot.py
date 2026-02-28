# ═══════════════════════════════════════════════════════════════════════════════
# EV Advisor Chatbot
# ═══════════════════════════════════════════════════════════════════════════════
# This module implements a keyword-based chatbot that answers common questions
# about electric vehicles. The chatbot uses intent matching to identify what
# the user is asking about and returns pre-defined expert responses.
#
# Supported topics:
#   - Range: Battery range, distance, real-world vs advertised range
#   - Charging: Charging times, charger types (AC/DC), fast charging
#   - Battery Health: State of health (SoH), degradation, service history
#   - Price: Budget advice, value factors for used EVs
#
# Algorithm: Keyword matching with normalization
#   1. Normalize user input (lowercase, remove extra whitespace)
#   2. Search for keywords from each intent category
#   3. Return the first matching intent's response
#   4. If no match, return a fallback message with available topics
# ═══════════════════════════════════════════════════════════════════════════════

from typing import Dict, List, Tuple


# ─────────────────────────────────────────────────────────────────────────────
# INTENT DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────
# Each intent contains:
#   - keywords: Words/phrases that trigger this intent
#   - responses: Possible responses (currently uses first one)
#
# The structure uses a dictionary for O(1) intent lookup and allows
# easy addition of new intents without modifying the matching logic.
INTENTS: Dict[str, Dict[str, List[str]]] = {
    
    # ─────────────────────────────────────────────────────────────────────────
    # RANGE INTENT
    # Handles questions about EV range and distance capabilities
    # ─────────────────────────────────────────────────────────────────────────
    "range": {
        "keywords": ["range", "km", "kilometre", "kilometer", "distance"],
        "responses": [
            "Range depends on battery size, driving style and temperature. If you tell me a model, I can explain what to check.",
            "For used EVs, ask for real world range and battery health report, not only the brochure number."
        ],
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # CHARGING INTENT
    # Handles questions about charging times, charger types, and infrastructure
    # ─────────────────────────────────────────────────────────────────────────
    "charging": {
        "keywords": ["charge", "charging", "charger", "fast", "dc", "ac", "minutes"],
        "responses": [
            "Charging time depends on charger type and the car charging curve. Ask whether it supports fast charging and the peak kW.",
            "A good check is 10 to 80 percent time on a fast charger, plus home charging speed in kW."
        ],
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # BATTERY HEALTH INTENT
    # Handles questions about battery degradation and state of health
    # Critical for used EV purchases
    # ─────────────────────────────────────────────────────────────────────────
    "battery_health": {
        "keywords": ["battery", "health", "soh", "degradation", "degrade"],
        "responses": [
            "Battery health is key for used EVs. Ask for state of health, service history and charging habits.",
            "Look for warning signs like big range drops, frequent fast charging and no service records."
        ],
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # PRICE INTENT
    # Handles questions about pricing, budgets, and value assessment
    # ─────────────────────────────────────────────────────────────────────────
    "price": {
        "keywords": ["price", "cost", "budget", "aed", "dirham"],
        "responses": [
            "If you share your budget, I can suggest what to prioritise, like range, year or charging speed.",
            "Used EV prices vary with battery health, warranty and mileage. Those are the 3 checks to do first."
        ],
    },
}

# Categories shown in the fallback message when no intent matches
FALLBACK_CATEGORIES: List[str] = ["range", "charging", "battery health"]


# ─────────────────────────────────────────────────────────────────────────────
# TEXT NORMALIZATION
# ─────────────────────────────────────────────────────────────────────────────
def normalise(text: str) -> str:
    """
    Normalize user input for consistent keyword matching.
    
    This function:
    1. Converts text to lowercase (case-insensitive matching)
    2. Strips leading/trailing whitespace
    3. Collapses multiple spaces into single spaces
    
    Example:
        "  What is the RANGE  " -> "what is the range"
    
    Args:
        text: Raw user input string
        
    Returns:
        str: Normalized text ready for keyword matching
    """
    return " ".join(text.lower().strip().split())


# ─────────────────────────────────────────────────────────────────────────────
# INTENT MATCHING
# ─────────────────────────────────────────────────────────────────────────────
def match_intent(message: str) -> Tuple[str, str]:
    """
    Match user message to an intent and return appropriate response.
    
    Algorithm:
    1. Normalize the input message
    2. Iterate through all defined intents
    3. For each intent, check if any keyword appears in the message
    4. Return the first matching intent and its response
    5. If no match found, return fallback response
    
    Note: The order of intents in the dictionary affects priority.
    First matching intent wins, so more specific intents should
    be defined before general ones.
    
    Args:
        message: User's question or message
        
    Returns:
        Tuple[str, str]: (intent_name, response_text)
            - intent_name: The matched intent or "fallback"
            - response_text: The response to show the user
    """
    # Normalize input for case-insensitive matching
    msg = normalise(message)
    
    # Search through all intents for a keyword match
    for intent, data in INTENTS.items():
        for kw in data["keywords"]:
            # Check if keyword appears anywhere in the message
            if kw in msg:
                # Return the first response for this intent
                return intent, data["responses"][0]
    
    # No intent matched - return helpful fallback message
    # Lists the available topics so users know what to ask
    fallback = (
        "I did not understand that. You can ask about "
        + ", ".join(FALLBACK_CATEGORIES)
        + "."
    )
    return "fallback", fallback
