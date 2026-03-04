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

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass


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
FALLBACK_CATEGORIES: List[str] = ["range", "charging", "battery health", "recommend"]


# ═══════════════════════════════════════════════════════════════════════════════
# CAR RECOMMENDATION ALGORITHM
# ═══════════════════════════════════════════════════════════════════════════════
# This algorithm recommends cars from the database based on user criteria.
#
# Algorithm Overview:
#   1. ENTITY EXTRACTION: Parse user message for budget, range, and charging preferences
#   2. DATABASE QUERY: Fetch all available cars from the database
#   3. FILTERING: Remove cars that exceed budget (if specified)
#   4. SCORING: Calculate a match score for each car based on criteria
#   5. RANKING: Sort cars by score (descending) and return top N
#
# Scoring Formula:
#   score = (range_score * 0.4) + (charge_score * 0.3) + (price_score * 0.3)
#   - range_score: Higher range = higher score (normalized 0-100)
#   - charge_score: Lower charge time = higher score (inverted, normalized 0-100)
#   - price_score: Lower price relative to budget = higher score
# ═══════════════════════════════════════════════════════════════════════════════


@dataclass
class UserCriteria:
    """
    Data class to hold extracted user preferences.
    
    Attributes:
        budget: Maximum price in AED (None if not specified)
        min_range: Minimum desired range in km (None if not specified)
        max_charge_time: Maximum acceptable charge time in minutes (None if not specified)
    """
    budget: Optional[float] = None
    min_range: Optional[int] = None
    max_charge_time: Optional[int] = None


def extract_criteria(message: str) -> UserCriteria:
    """
    Extract numerical criteria from user message using regex patterns.
    
    This function searches for common patterns like:
    - "budget 80000" or "80000 AED" or "under 100k"
    - "300 km range" or "range 400"
    - "charge in 30 minutes" or "30 min charging"
    
    Algorithm:
    1. Normalize input to lowercase
    2. Apply regex patterns for each criterion type
    3. Extract and convert numerical values
    4. Return structured UserCriteria object
    
    Args:
        message: User's input message
        
    Returns:
        UserCriteria: Extracted preferences (None for unspecified values)
    """
    msg = message.lower()
    criteria = UserCriteria()
    
    # ─────────────────────────────────────────────────────────────────────────
    # BUDGET EXTRACTION
    # Patterns: "budget 80000", "80000 aed", "under 100k", "100,000 dirhams"
    # ─────────────────────────────────────────────────────────────────────────
    budget_patterns = [
        r'budget\s*(?:of\s*)?([\d,]+)\s*k?',           # "budget 80000" or "budget 80k"
        r'([\d,]+)\s*k?\s*(?:aed|dirham)',              # "80000 AED" or "80k dirhams"
        r'under\s*([\d,]+)\s*k?',                       # "under 100000" or "under 100k"
        r'max(?:imum)?\s*(?:price)?\s*([\d,]+)\s*k?',  # "max 80000" or "maximum price 80k"
    ]
    for pattern in budget_patterns:
        match = re.search(pattern, msg)
        if match:
            value = match.group(1).replace(',', '')
            criteria.budget = float(value)
            # Handle "k" suffix (e.g., "80k" = 80000)
            if 'k' in msg[match.start():match.end()+2].lower() and criteria.budget < 1000:
                criteria.budget *= 1000
            break
    
    # ─────────────────────────────────────────────────────────────────────────
    # RANGE EXTRACTION
    # Patterns: "300 km", "range 400", "at least 350 km"
    # ─────────────────────────────────────────────────────────────────────────
    range_patterns = [
        r'([\d]+)\s*(?:km|kilometer|kilometre)',       # "300 km"
        r'range\s*(?:of\s*)?([\d]+)',                  # "range 400" or "range of 400"
        r'at\s*least\s*([\d]+)\s*(?:km)?',             # "at least 350 km"
        r'minimum\s*(?:range)?\s*([\d]+)',             # "minimum 300" or "minimum range 300"
    ]
    for pattern in range_patterns:
        match = re.search(pattern, msg)
        if match:
            criteria.min_range = int(match.group(1))
            break
    
    # ─────────────────────────────────────────────────────────────────────────
    # CHARGE TIME EXTRACTION
    # Patterns: "30 minutes", "charge in 45 min", "fast charging under 40"
    # ─────────────────────────────────────────────────────────────────────────
    charge_patterns = [
        r'charg\w*\s*(?:in\s*)?([\d]+)\s*(?:min|minute)',  # "charge in 30 min"
        r'([\d]+)\s*(?:min|minute)\s*charg',               # "30 minute charging"
        r'fast\s*charg\w*\s*(?:under\s*)?([\d]+)',         # "fast charging under 40"
    ]
    for pattern in charge_patterns:
        match = re.search(pattern, msg)
        if match:
            criteria.max_charge_time = int(match.group(1))
            break
    
    return criteria


def score_car(car, criteria: UserCriteria, max_range: int, min_charge: int, max_price: float) -> float:
    """
    Calculate a match score for a car based on user criteria.
    
    Scoring Algorithm:
    1. Normalize each attribute to a 0-100 scale
    2. Apply weights: range (40%), charge time (30%), price (30%)
    3. Bonus points if car meets specific criteria thresholds
    
    The scoring uses relative comparison against the best available options
    in the inventory, so scores are meaningful within the current dataset.
    
    Args:
        car: Car model instance from database
        criteria: User's extracted preferences
        max_range: Maximum range in current inventory (for normalization)
        min_charge: Minimum charge time in current inventory (for normalization)
        max_price: Maximum price in current inventory (for normalization)
        
    Returns:
        float: Score from 0-100 (higher is better match)
    """
    score = 0.0
    
    # ─────────────────────────────────────────────────────────────────────────
    # RANGE SCORE (40% weight)
    # Higher range = higher score
    # ─────────────────────────────────────────────────────────────────────────
    if max_range > 0:
        range_score = (car.range_km / max_range) * 100
        # Bonus if meets user's minimum range requirement
        if criteria.min_range and car.range_km >= criteria.min_range:
            range_score = min(100, range_score + 10)
        score += range_score * 0.4
    
    # ─────────────────────────────────────────────────────────────────────────
    # CHARGE TIME SCORE (30% weight)
    # Lower charge time = higher score (inverted scale)
    # ─────────────────────────────────────────────────────────────────────────
    if min_charge > 0 and car.charge_time_min > 0:
        # Invert: fastest charging gets highest score
        charge_score = (min_charge / car.charge_time_min) * 100
        charge_score = min(100, charge_score)  # Cap at 100
        # Bonus if meets user's max charge time requirement
        if criteria.max_charge_time and car.charge_time_min <= criteria.max_charge_time:
            charge_score = min(100, charge_score + 10)
        score += charge_score * 0.3
    
    # ─────────────────────────────────────────────────────────────────────────
    # PRICE SCORE (30% weight)
    # Lower price relative to budget = higher score
    # ─────────────────────────────────────────────────────────────────────────
    if criteria.budget:
        # Score based on how much under budget the car is
        if car.price <= criteria.budget:
            price_score = ((criteria.budget - car.price) / criteria.budget) * 50 + 50
        else:
            # Penalize cars over budget but don't exclude entirely
            price_score = max(0, 50 - ((car.price - criteria.budget) / criteria.budget) * 50)
        score += price_score * 0.3
    elif max_price > 0:
        # No budget specified: lower price is generally better
        price_score = ((max_price - car.price) / max_price) * 100
        score += price_score * 0.3
    
    return round(score, 1)


def recommend_cars(cars: list, criteria: UserCriteria, top_n: int = 3) -> List[dict]:
    """
    Recommend top N cars based on user criteria.
    
    Algorithm:
    1. Filter out cars over budget (if budget specified)
    2. Calculate normalization values from available inventory
    3. Score each car using the scoring algorithm
    4. Sort by score descending
    5. Return top N results with scores
    
    Args:
        cars: List of Car model instances
        criteria: User's extracted preferences
        top_n: Number of recommendations to return (default 3)
        
    Returns:
        List[dict]: Top cars with their details and match scores
    """
    if not cars:
        return []
    
    # ─────────────────────────────────────────────────────────────────────────
    # STEP 1: Filter by budget (soft filter - keep some over-budget for comparison)
    # ─────────────────────────────────────────────────────────────────────────
    if criteria.budget:
        # Keep cars within 20% over budget for flexibility
        budget_limit = criteria.budget * 1.2
        filtered_cars = [c for c in cars if c.price <= budget_limit]
        # If too few results, use all cars
        if len(filtered_cars) < top_n:
            filtered_cars = cars
    else:
        filtered_cars = cars
    
    # ─────────────────────────────────────────────────────────────────────────
    # STEP 2: Calculate normalization values
    # ─────────────────────────────────────────────────────────────────────────
    max_range = max(c.range_km for c in filtered_cars) if filtered_cars else 1
    min_charge = min(c.charge_time_min for c in filtered_cars) if filtered_cars else 1
    max_price = max(c.price for c in filtered_cars) if filtered_cars else 1
    
    # ─────────────────────────────────────────────────────────────────────────
    # STEP 3: Score each car
    # ─────────────────────────────────────────────────────────────────────────
    scored_cars = []
    for car in filtered_cars:
        car_score = score_car(car, criteria, max_range, min_charge, max_price)
        scored_cars.append((car, car_score))
    
    # ─────────────────────────────────────────────────────────────────────────
    # STEP 4: Sort by score (descending) and take top N
    # ─────────────────────────────────────────────────────────────────────────
    scored_cars.sort(key=lambda x: x[1], reverse=True)
    top_cars = scored_cars[:top_n]
    
    # ─────────────────────────────────────────────────────────────────────────
    # STEP 5: Format results
    # ─────────────────────────────────────────────────────────────────────────
    results = []
    for car, car_score in top_cars:
        results.append({
            "car_id": car.car_id,
            "model": car.model,
            "year": car.year,
            "price": car.price,
            "range_km": car.range_km,
            "charge_time_min": car.charge_time_min,
            "score": car_score,
        })
    
    return results


def format_recommendations(recommendations: List[dict], criteria: UserCriteria) -> str:
    """
    Format car recommendations into a readable response string.
    
    Args:
        recommendations: List of recommended cars with scores
        criteria: User's criteria (for context in response)
        
    Returns:
        str: Formatted response message
    """
    if not recommendations:
        return "I could not find any cars matching your criteria. Try adjusting your budget or requirements."
    
    # Build response header based on criteria
    header_parts = []
    if criteria.budget:
        header_parts.append(f"budget of {int(criteria.budget):,} AED")
    if criteria.min_range:
        header_parts.append(f"{criteria.min_range} km range")
    if criteria.max_charge_time:
        header_parts.append(f"{criteria.max_charge_time} min charging")
    
    if header_parts:
        header = f"Based on your preferences ({', '.join(header_parts)}), here are my top recommendations:\n\n"
    else:
        header = "Here are my top car recommendations:\n\n"
    
    # Format each car
    car_lines = []
    for i, car in enumerate(recommendations, 1):
        line = (
            f"{i}. {car['model']} ({car['year']}) - "
            f"{int(car['price']):,} AED | "
            f"{car['range_km']} km range | "
            f"{car['charge_time_min']} min charge"
        )
        car_lines.append(line)
    
    return header + "\n".join(car_lines)


def is_recommendation_request(message: str) -> bool:
    """
    Check if the user is asking for car recommendations.
    
    Args:
        message: User's input message
        
    Returns:
        bool: True if user wants recommendations
    """
    msg = message.lower()
    recommendation_keywords = [
        "recommend", "suggestion", "suggest", "find me", "show me",
        "what car", "which car", "best car", "looking for", "i need",
        "i want", "help me find", "help me choose"
    ]
    return any(kw in msg for kw in recommendation_keywords)


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
