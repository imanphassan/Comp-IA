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
| **Budget** | "budget 80000", "under 100k AED" | Maximum price |
| **Range** | "300 km range", "at least 400 km" | Minimum range |
| **Charge Time** | "charge in 30 minutes" | Maximum charge time |

### How It Works

```
User says: "I need a car with budget 80000 AED and 300 km range"

Extracted preferences:
  - Budget: 80,000 AED
  - Minimum Range: 300 km
  - Charge Time: Not specified
```

The chatbot uses **pattern matching** (regular expressions) to find numbers next to keywords like "budget", "km", or "minutes".

---

## Step 2: Filter Cars by Budget

Before scoring, the algorithm removes cars that are too expensive.

```
Budget: 80,000 AED

Cars in database:
  - Tesla Model 3: 75,000 AED ✓ (within budget)
  - BMW iX: 95,000 AED ✓ (within 20% buffer)
  - Porsche Taycan: 150,000 AED ✗ (too expensive)
```

**Why 20% buffer?** Sometimes a slightly more expensive car is a much better match. The algorithm keeps cars up to 20% over budget so users don't miss great options.

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

## Key Concepts Used

| Concept | How It's Used |
|---------|---------------|
| **Pattern Matching** | Regex extracts numbers from user messages |
| **Normalization** | Scores are scaled 0-100 for fair comparison |
| **Weighted Scoring** | Different factors have different importance |
| **Sorting** | Cars are ranked by score to find the best |
| **Filtering** | Budget filter removes irrelevant options early |
