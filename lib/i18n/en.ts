import type { Messages } from "./types";

export const en: Messages = {
  app: {
    name: "Aeris",
    tagline: "Your daily smog-survival plan",
    skip: "Skip to main content",
  },
  hero: {
    title: "Breathe smarter through smog season",
    subtitle:
      "Live air quality plus your household routine becomes a ranked plan, with the exact impact of every choice.",
  },
  a11y: {
    region: "Accessibility settings",
    highContrast: "High contrast",
    largeText: "Large text",
    language: "Language",
  },
  location: {
    heading: "1. Where are you?",
    cityLabel: "City or area",
    cityPlaceholder: "e.g. Delhi, Lucknow, Mumbai",
    check: "Check air",
    useMyLocation: "Use my location",
    manualToggle: "Enter a PM2.5 reading manually",
    manualLabel: "PM2.5 reading (µg/m³)",
    manualApply: "Use this reading",
    loading: "Checking the air…",
    error: "Could not get live air data. You can enter a PM2.5 reading manually.",
    locationDenied: "Location access was not allowed. Search by city instead.",
  },
  air: {
    heading: "Air right now",
    aqiLabel: "Indicative AQI",
    pm25Now: "PM2.5 now",
    pm25Mean: "Average, next 24 h",
    cigarettes: (count) =>
      `Breathing today’s average outdoors all day is roughly like ${count} cigarettes.`,
    place: (name) => `Showing air for ${name}`,
    manualSource: "Source: the reading you entered",
    modelSource:
      "Source: Open-Meteo (CAMS atmospheric model estimate, not a monitoring station). The AQI is indicative, using India’s CPCB PM2.5 bands.",
    chartTitle: "PM2.5 hour by hour, next 24 hours",
    chartTableCaption: "Hourly PM2.5 forecast in micrograms per cubic metre",
    hourColumn: "Hour",
    pm25Column: "PM2.5 (µg/m³)",
    categories: {
      good: { label: "Good", advice: "Air is clean. Normal activities are fine." },
      satisfactory: {
        label: "Satisfactory",
        advice: "Fine for most people. Sensitive people may feel mild discomfort.",
      },
      moderate: {
        label: "Moderately polluted",
        advice: "People with lung or heart conditions should limit long or hard outdoor activity.",
      },
      poor: {
        label: "Poor",
        advice: "Prolonged exposure can cause discomfort for most people. Cut outdoor exertion.",
      },
      veryPoor: {
        label: "Very poor",
        advice: "Prolonged exposure can affect health. Stay indoors where you can.",
      },
      severe: {
        label: "Severe",
        advice: "Affects healthy people too. Avoid going outside if possible.",
      },
    },
  },
  profile: {
    heading: "2. Tell us about your household",
    describeLabel: "Describe your routine (optional)",
    describePlaceholder: "e.g. 2 adults and a 6-year-old, I ride a scooter 40 minutes to work",
    describeButton: "Fill the form with AI",
    describeBusy: "Reading…",
    describeNote: "Gemini only extracts the details you wrote. Nothing is stored.",
    describeFailed: "Could not read that. Please use the form below.",
    adults: "Adults",
    children: "Children",
    seniors: "Seniors (60+)",
    sensitiveMember: "Someone has asthma or breathing trouble",
    commuteMode: "How you usually commute",
    commuteMinutes: "Daily commute time (minutes)",
    transitAvailable: "Metro or bus is available on my route",
    childOutdoorMinutes: "Children’s outdoor time per day (minutes)",
    windows: "Windows are usually",
    windowOpen: "Open",
    windowClosed: "Closed",
    hasPurifier: "We already run an air purifier",
    submit: "Build my plan",
    submitBusy: "Building…",
    commuteModes: {
      walk: "Walk",
      two_wheeler: "Bike or scooter",
      car: "Car",
      bus: "Bus",
      metro: "Metro",
      work_from_home: "Work from home",
    },
  },
  plan: {
    heading: "3. Your plan",
    aiBadge: "Explained by Gemini, checked against your numbers",
    fallbackBadge: "Standard explanation (AI unavailable)",
    exposureHeading: "Your daily exposure",
    before: "As you live today",
    after: "With this plan",
    average: (value) => `${value} µg/m³ daily average`,
    cigarettes: (count) => `about ${count} cigarettes a day`,
    personas: { adult: "You", child: "Your child", senior: "Your senior family member" },
    personasPossessive: {
      adult: "your",
      child: "your child’s",
      senior: "your senior family member’s",
    },
    underTenth: "under 0.1",
    actionsHeading: "What to do, in order of impact",
    effort: { free: "Free", low: "Low cost", medium: "Needs an investment" },
    impact: (whose, saving, cigarettes) =>
      `Cuts ${whose} daily exposure by about ${saving} µg/m³, roughly ${cigarettes} cigarettes a day less.`,
    window: (from, to, pm25) => `Best window: ${from} to ${to}, about ${pm25} µg/m³`,
    habitsHeading: "Small habits that help",
    habitsNote: "Not quantified, but widely recommended.",
    assumptionsHeading: "How these numbers are calculated",
    assumptions: [
      "Exposure is a time-weighted 24-hour average across travelling, outdoor time and indoor time.",
      "Indoor air is assumed to hold 90% of outdoor PM2.5 with windows open and 60% with windows closed.",
      "A purifier is assumed to remove 50% of indoor PM2.5 in the room it runs in; a well-fitted N95 is assumed to cut 50% in real use.",
      "Travelling in a closed car is assumed to expose you to 70% of outdoor PM2.5, a bus 90%, the metro 50%.",
      "One cigarette a day is roughly 22 µg/m³ of PM2.5 (Berkeley Earth). This is a rough comparison, not a medical measure.",
      "These are planning assumptions, not measurements. Real results vary with fit, filters and your home.",
    ],
    disclaimer:
      "Aeris gives general guidance, not medical advice. If anyone has trouble breathing, see a doctor.",
    error: "Could not build the plan. Please check the details and try again.",
    actions: {
      wear_n95_commute: {
        title: "Wear a well-fitted N95 on your commute",
        reason:
          "An open-air commute is where you breathe the dirtiest air. A snug N95 filters a large share of fine particles when it seals properly.",
      },
      shift_commute: {
        title: "Travel in the cleanest hours you can",
        reason:
          "Smog changes through the day. Moving your trip to a cleaner window lowers your dose without changing how you travel.",
      },
      switch_to_transit: {
        title: "Take the metro or bus instead",
        reason:
          "A closed, shared ride exposes you to less roadside air than an open vehicle, and takes one more vehicle off the road.",
      },
      bedroom_purifier: {
        title: "Run an air purifier in the bedroom overnight",
        reason:
          "Sleep is your longest stretch in one room, so cleaning that air lowers your daily exposure.",
      },
      close_windows: {
        title: "Keep windows closed",
        reason:
          "Open windows let most outdoor particles straight in. Closing them keeps a good share out.",
      },
      kids_play_window: {
        title: "Move outdoor play to the cleanest daylight hour",
        reason:
          "Children’s lungs are still developing, so a cleaner hour is worth planning around.",
      },
      kids_play_indoors: {
        title: "Keep play indoors today",
        reason:
          "Even the cleanest hour is poor today. Indoor play with windows closed is the safer choice.",
      },
      seniors_walk_window: {
        title: "Take the daily walk in the cleanest hour",
        reason: "Older adults are more sensitive to fine particles, so a cleaner hour helps.",
      },
      seniors_stay_in: {
        title: "Skip the outdoor walk today",
        reason:
          "Even the cleanest hour is poor today. Staying in with windows closed is the safer choice.",
      },
    },
    habits: {
      wet_mop: {
        title: "Wipe or wet-mop instead of dry sweeping",
        reason: "Dry sweeping stirs settled dust back into the air.",
      },
      no_burning: {
        title: "Do not burn garbage, leaves or coils",
        reason: "Smoke adds straight to the particles your family breathes.",
      },
      kitchen_exhaust: {
        title: "Switch on the kitchen exhaust while cooking",
        reason: "Cooking adds fine particles indoors. Venting them out keeps indoor air cleaner.",
      },
      no_idling: {
        title: "Switch off the engine when you wait",
        reason: "Idling engines add exhaust to the street air everyone shares.",
      },
      avoid_exertion: {
        title: "Keep hard workouts indoors",
        reason: "Hard exercise makes you breathe in more air, and more particles.",
      },
    },
    headline: (category) => `Air is ${category} today. Here is how to protect your family.`,
    summary: (cigarettes) =>
      `Without changes, an adult breathing today’s air all day takes in roughly ${cigarettes} cigarettes’ worth of fine particles. The steps below bring that down.`,
  },
  ask: {
    heading: "Ask Aeris",
    label: "Ask a question about your plan",
    placeholder: "e.g. Is it safe for my child to cycle to school?",
    submit: "Ask",
    submitBusy: "Thinking…",
    suggestions: [
      "Which single step should I do first?",
      "Is a mask worth it for my commute?",
      "How much does a purifier really help?",
    ],
    note: "Answers use only your plan’s numbers. This is not medical advice.",
    error: "Could not answer right now. Please try again.",
    fallbackAnswer: (action) =>
      `I could not generate a detailed answer right now. Based on your plan, the best first step is: ${action}`,
  },
};
