# Car Recommendation Algorithm

This document explains how the EV Advisor chatbot recommends cars to users based on their preferences.

---

## Overview

When a user asks for a car recommendation (e.g., "Recommend a car with budget 80000 AED"), the chatbot:

1. **Extracts** the user's preferences from their message
2. **Filters** cars that match the budget
3. **Scores** each car based on how well it matches
4. **Returns** the best matching car

---

## Step 1: Extract User Preferences

The chatbot looks for keywords in the user's message to understand what they want.

### What It Looks For

| Preference | Example Phrases | What It Extracts |
|------------|-----------------|------------------|
| **Max Budget** | "budget 80000", "under 100k AED" | Maximum price |
| **Min Budget** | "above 50000", "over 60k" | Minimum price |
| **Price Range** | "between 50000 and 100000", "from 60k to 120k" | Min and max price |
| **Range** | "300 km range", "at least 400 km" | Minimum range |
| **Charge Time** | "charge in 30 minutes", "less than 20 min" | Maximum charge time |

### How It Works

```
User says: "I need a car between 50000 and 100000 AED with 300 km range"

Extracted preferences:
  - Min Budget: 50,000 AED
  - Max Budget: 100,000 AED
  - Minimum Range: 300 km
  - Charge Time: Not specified
```

The chatbot uses **pattern matching** (regular expressions) to find numbers next to keywords like "budget", "between", "km", or "minutes".

---

## Step 2: Filter Cars by Criteria

Before scoring, the algorithm removes cars that don't meet the user's requirements.

### Filters Applied

| Criteria | Filter Rule |
|----------|-------------|
| **Max Budget** | Car price ≤ max budget |
| **Min Budget** | Car price ≥ min budget |
| **Range** | Car range ≥ minimum range |
| **Charge Time** | Car charge time ≤ maximum charge time |

### Example

```
User: "Recommend a car between 50000 and 100000 AED, above 400 km range, less than 30 min charge"

Extracted:
  - Min Budget: 50,000 AED
  - Max Budget: 100,000 AED
  - Min Range: 400 km
  - Max Charge Time: 30 minutes

Cars in database:
  - Tesla Model 3: 75,000 AED, 450 km, 25 min ✓ (passes all)
  - BMW iX: 95,000 AED, 380 km, 28 min ✗ (range too low)
  - Hyundai Ioniq: 45,000 AED, 420 km, 25 min ✗ (under min budget)
  - Porsche Taycan: 150,000 AED, 500 km, 20 min ✗ (over max budget)
```

Only cars that pass **all** filters proceed to scoring.

---

## Step 3: Score Each Car

Each car gets a score from 0 to 100. Higher score = better match.

### The Scoring Formula

The score is calculated using three factors:

| Factor | Weight | What It Measures |
|--------|--------|------------------|
| **Range** | 40% | Higher range = higher score |
| **Charge Time** | 30% | Faster charging = higher score |
| **Price** | 30% | Lower price (under budget) = higher score |

### How Each Factor is Scored

#### Range Score (40% of total)

```
Range Score = (Car's Range / Best Range in Inventory) × 100

Example:
  - Best range in inventory: 500 km
  - Car's range: 400 km
  - Range Score: (400 / 500) × 100 = 80 points

Bonus: +10 points if car meets user's minimum range requirement
```

#### Charge Time Score (30% of total)

```
Charge Score = (Fastest Charge Time / Car's Charge Time) × 100

Example:
  - Fastest in inventory: 20 minutes
  - Car's charge time: 40 minutes
  - Charge Score: (20 / 40) × 100 = 50 points

Bonus: +10 points if car charges faster than user's requirement
```

#### Price Score (30% of total)

```
If car is UNDER budget:
  Price Score = 50 + (How much under budget × 50)

If car is OVER budget:
  Price Score = 50 - (How much over budget × 50)

Example (Budget: 80,000 AED):
  - Car price: 60,000 AED (25% under budget)
  - Price Score: 50 + (0.25 × 50) = 62.5 points
```

### Putting It Together

```
Final Score = (Range Score × 0.4) + (Charge Score × 0.3) + (Price Score × 0.3)

Example:
  - Range Score: 80 points
  - Charge Score: 50 points
  - Price Score: 62.5 points

  Final Score = (80 × 0.4) + (50 × 0.3) + (62.5 × 0.3)
              = 32 + 15 + 18.75
              = 65.75 points
```

---

## Step 4: Return the Best Car

After scoring all cars, the algorithm:

1. Sorts cars by score (highest first)
2. Returns the top car as the recommendation

```
Scored Cars:
  1. Tesla Model 3 - Score: 78.5 ← RECOMMENDED
  2. Hyundai Ioniq - Score: 72.3
  3. BMW iX - Score: 65.8
```

---

## Example Walkthrough

**User Input:** "Recommend a car with budget 80000 AED"

### Step 1: Extract Preferences
```
Budget: 80,000 AED
Range: Not specified
Charge Time: Not specified
```

### Step 2: Filter Cars
```
Available cars within budget (+20%):
  - Audi e-tron: 70,000 AED
  - Tesla Model 3: 75,000 AED
  - Hyundai Ioniq: 55,000 AED
```

### Step 3: Score Each Car
```
Audi e-tron:
  - Range: 400 km → Score: 80
  - Charge: 35 min → Score: 57
  - Price: 70,000 → Score: 56
  - Total: (80×0.4) + (57×0.3) + (56×0.3) = 65.9

Tesla Model 3:
  - Range: 450 km → Score: 90
  - Charge: 25 min → Score: 80
  - Price: 75,000 → Score: 53
  - Total: (90×0.4) + (80×0.3) + (53×0.3) = 75.9

Hyundai Ioniq:
  - Range: 350 km → Score: 70
  - Charge: 40 min → Score: 50
  - Price: 55,000 → Score: 66
  - Total: (70×0.4) + (50×0.3) + (66×0.3) = 62.8
```

### Step 4: Return Best Match
```
Winner: Tesla Model 3 (Score: 75.9)

Response: "I would recommend the 2024 Tesla Model 3 based on your 
budget of 80,000 AED. It's priced at 75,000 AED, offers 450 km 
of range, and charges in 25 minutes."
```

---

## Why These Weights?

| Factor | Weight | Reasoning |
|--------|--------|-----------|
| **Range** | 40% | Range anxiety is the #1 concern for EV buyers |
| **Charge Time** | 30% | Fast charging is important for convenience |
| **Price** | 30% | Value for money matters, but not as much as usability |

---

## Example Queries

Here are example queries the chatbot understands:

### Budget Queries

| Query | What It Extracts |
|-------|------------------|
| "Recommend a car with budget 80000 AED" | Max: 80,000 |
| "Find me a car under 100k" | Max: 100,000 |
| "I want a car above 50000" | Min: 50,000 |
| "Show me cars between 60000 and 120000 AED" | Min: 60,000, Max: 120,000 |
| "Cars from 50k to 100k" | Min: 50,000, Max: 100,000 |

### Range Queries

| Query | What It Extracts |
|-------|------------------|
| "I need at least 400 km range" | Min Range: 400 km |
| "Car with 500 km range" | Min Range: 500 km |
| "Minimum range 350 km" | Min Range: 350 km |

### Charge Time Queries

| Query | What It Extracts |
|-------|------------------|
| "Charges in 30 minutes" | Max Charge: 30 min |
| "Fast charging under 20 min" | Max Charge: 20 min |
| "Less than 45 minute charge" | Max Charge: 45 min |

### Combined Queries

| Query | What It Extracts |
|-------|------------------|
| "Recommend a car between 50000 and 100000 AED with 400 km range" | Min: 50,000, Max: 100,000, Range: 400 km |
| "Find me a car under 80k that charges in 30 minutes" | Max: 80,000, Charge: 30 min |
| "I need a car with budget 100000, at least 500 km range, and fast charging under 25 min" | Max: 100,000, Range: 500 km, Charge: 25 min |

---

## Follow-Up Queries

The chatbot also recognizes follow-up questions that mention prices or budgets:

| Follow-Up Query | What Happens |
|-----------------|--------------|
| "What about 60000 AED?" | Treats as recommendation request with budget 60,000 |
| "How about 80k?" | Treats as recommendation request with budget 80,000 |
| "Budget 50000" | Treats as recommendation request with budget 50,000 |
| "Price 70000 AED" | Treats as recommendation request with budget 70,000 |

### Example Conversation

```
User: "Recommend a car with budget 100000 AED"
Bot: "I would recommend the 2024 Tesla Model 3 based on your budget of 100,000 AED..."

User: "What about 60000 AED?"
Bot: "I would recommend the 2024 Hyundai Ioniq based on your budget of 60,000 AED..."

User: "How about between 70000 and 90000?"
Bot: "I would recommend the 2024 BYD Seal based on your price range of 70,000 to 90,000 AED..."
```

**Note:** The chatbot processes each message independently - it doesn't remember previous messages. Follow-up queries work because they contain budget/price information that triggers the recommendation algorithm.

---

## Key Concepts Used

| Concept | How It's Used |
|---------|---------------|
| **Pattern Matching** | Regex extracts numbers from user messages |
| **Normalization** | Scores are scaled 0-100 for fair comparison |
| **Weighted Scoring** | Different factors have different importance |
| **Sorting** | Cars are ranked by score to find the best |
| **Filtering** | Budget/range/charge filters remove irrelevant options early |
