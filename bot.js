import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import MultivariateLinearRegression from "ml-regression-multivariate-linear";

// -------------------- CONFIG --------------------
const TOKEN = "8257353258:AAEYfk0LSElTWTmEeuvpn9pxCb4iQtqrg3M"; // <-- replace with your BotFather token
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on("polling_error", (err) => {
  console.error("Polling Error:", err);
});

const fertilizerExplanationReplies = [
  "Urea is high in nitrogen but lacks phosphorus and potassium, which are essential for rice. DAP provides a more balanced nutrition (N + P) for better growth.",
  "Using only urea may lead to excessive leaf growth but poor grain formation. DAP ensures optimal nutrient balance for yield.",
  "DAP (Di-Ammonium Phosphate) contains nitrogen and phosphorus. Urea alone can’t supply phosphorus, which is crucial for root and grain development."
];

// 1. Best sowing month
const storageReplies = [
    "Store harvested grains in dry, ventilated, rodent-proof storage to prevent spoilage.",
    "Use sealed containers or silos to maintain grain quality and avoid pest damage.",
    "Control moisture and temperature in storage facilities to retain maximum yield."
];
const disasterReplies = [
    "Elevate storage areas and tie down loose structures to protect against floods and cyclones.",
    "Ensure proper drainage around fields and storage to reduce flood damage.",
    "Harvest early and secure crops before severe weather to minimize losses."
];

const bestMonthReplies = [
    "The optimal sowing period for rice is June to September.",
    "Sowing between June and September ensures good growth and water availability.",
    "For maximum yield, plant your rice seeds in June–September."
];
const rainIrrigationReplies = [
    "Check your field’s soil moisture. If the soil is still wet, you may not need additional irrigation.",
    "Rice needs consistent water, but avoid overwatering. Irrigate only if the soil starts drying.",
    "After 2–3 days of rain, assess the field. Irrigate lightly if water level is insufficient for crop growth."
];

// 2. Ideal conditions
const idealConditionsReplies = [
    "Ideal conditions for rice: June–September sowing, soil pH 6.5–7, proper irrigation, recommended fertilizers.",
    "Maintain soil pH around 6.5–7, regular irrigation, and sow during June–September for best yield.",
    "Rice thrives best under well-irrigated fields, slightly acidic to neutral soil, and proper fertilizer application."
];

// 3. fertilizer info
const fertilizerReplies = [
    "DAP fertilizer is recommended, around 50–60 kg/ha depending on soil type.",
    "Apply DAP at recommended quantities (50–60 kg/ha) during sowing.",
    "Use DAP fertilizer combined with proper irrigation for maximum productivity."
];

// 4. Irrigation advice
const irrigationReplies = [
    "Rice requires consistent water supply; tube well or canal irrigation works well.",
    "Ensure your fields are evenly irrigated during growing season.",
    "Controlled water management improves yield significantly."
];

// 5. Soil info
const soilReplies = [
    "Rice grows best in clayey or loamy soil with pH between 6.5–7.",
    "Well-drained fertile soil ensures healthy rice growth.",
    "Avoid overly acidic or saline soils for optimal production."
];

// 6. Pest management
const pestReplies = [
    "Remove crop residues to reduce rodent and pest hiding places.",
    "Use traps for rodents and approved insecticides for lice or cockroaches.",
    "Crop rotation helps prevent pest build-up in the field."
];

// 7. Insect management
const insectReplies = [
    "Monitor crops regularly for aphids, borers, and leafhoppers.",
    "Remove affected plants early to prevent spread.",
    "Use natural predators or approved insecticides for pest control."
];

// 8. Harvest time
const harvestReplies = [
    "Rice is typically ready to harvest 3–4 months after sowing.",
    "Check for golden-yellow grains and firm kernels before harvesting.",
    "Ensure the field is dry and grains are mature before harvesting."
];

// 9. Crop rotation
const rotationReplies = [
    "After rice, legumes or pulses can be planted to restore soil nutrients.",
    "Rotate crops to reduce pest and disease pressure.",
    "Consider planting wheat or barley after rice in rotation."
];

// 10. Yield improvement
const yieldReplies = [
    "Ensure proper fertilizer and irrigation management to improve yield.",
    "Timely weeding and pest control can boost productivity.",
    "Sowing in optimal months with healthy soil increases overall yield."
];

const insectMessage = `
To protect your crops (like rice) from insect attacks:

1. Regularly monitor your crop for insects such as aphids, borers, and leafhoppers.
2. Remove affected plants or leaves early to prevent spread.
3. Use appropriate insecticides according to crop safety guidelines.
4. Introduce natural predators like ladybugs or parasitic wasps where possible.
5. Maintain proper spacing and sanitation to reduce insect infestation.

Always follow safety instructions and recommended dosages.
`;

const teamMessage = `
This AI Crop Advisor bot was developed by a group of freshers from IIT BHU for SIH 2025. 
Team Members:
- Himanshu Mishra
- Harsh Chaubey
- Prabhat Singh
- Saanvi Dubey
- Dhairyakant Kislay
- Harsh Singh

We built this bot to help farmers predict rice yield and optimize their cultivation practices.
`;
const pestMessage = `
To protect your crops from common pests like lice, cockroaches, or rodents:

1. Regularly monitor your field for early signs of infestation.
2. Maintain clean fields and remove crop residues to reduce hiding places for pests.
3. Use appropriate pest control measures:
   - For lice and insects: use recommended insecticides according to crop safety guidelines.
   - For rodents: set traps or use rodent-proof storage for grains.
4. Crop rotation and intercropping can reduce pest build-up naturally.
5. Avoid overwatering as it can attract certain pests.

Always follow safety instructions and local agricultural guidelines.
`;


// -------------------- MODEL & ENCODERS --------------------
const MODEL_PATH = "models/rice_model.json";
if (!fs.existsSync(MODEL_PATH)) {
  console.log("⚠️ No model found. Run: node train.js first.");
  process.exit(1);
}
const regression = MultivariateLinearRegression.load(
  JSON.parse(fs.readFileSync(MODEL_PATH, "utf-8"))
);

const monthMap = { June: 1, July: 2, August: 3, September: 4 };
const fertMap = { urea: 1, DAP: 2 };
const irrMap = { canal: 1, tube_well: 2 };

// -------------------- QUESTIONS / REPLIES --------------------
const questions = {
  area: [
    "How much land area do you have (in hectares)?",
    "Please tell me your farm size (in hectares):",
    "What’s your land size in hectares?",
  ],
  month: [
    "In which month will you sow? (June/July/August/September)",
    "Tell me the sowing month (June–September):",
    "What month are you planning to sow?",
  ],
  fertilizer: [
    "Which fertilizer do you plan to use (urea/DAP)?",
    "fertilizer type? (urea/DAP):",
    "What fertilizer are you applying?",
  ],
  irrigation: [
    "What type of irrigation do you use (canal/tube_well)?",
    "Irrigation method? (canal or tube_well):",
    "Tell me about your irrigation source:",
  ],
  soil: [
    "What is your soil pH?",
    "Soil pH value please:",
    "Can you provide the soil pH?",
  ],
};

const predictionReplies = [
  (p, pct) =>
    `Estimated rice yield: ${p.toFixed(2)} tons/ha.\nAbout ${pct.toFixed(1)}% of optimal.`,
  (p, pct) =>
    `Your rice harvest looks to be around ${p.toFixed(
      2
    )} tons per hectare.\nThat’s ~${pct.toFixed(1)}% of the best conditions.`,
  (p, pct) =>
    `Predicted output: ${p.toFixed(2)} t/ha.\nApproximately ${pct.toFixed(1)}% efficiency.`,
];

const greetings = [
  "Hello! How can I assist you with your crops today?",
  "Hi there! Ready to discuss your farming outcomes?",
  "Greetings! You can ask me about your crop yield predictions.",
  "Welcome back! Let’s talk about optimizing your farm yield.",
  "Good day! How can I help you plan your rice cultivation?",
];

// -------------------- CONTEXT STORAGE --------------------
const userContext = {};

function getContext(chatId) {
  if (!userContext[chatId]) {
    userContext[chatId] = { intent: null, answers: {}, pendingQuestions: [], currentQuestion: null };
  }
  return userContext[chatId];
}

// -------------------- UTILITIES --------------------
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// -------------------- SMART SUGGESTIONS --------------------
function generateSmartSuggestions(answers) {
  const tips = [];

  // Month check
  if (!["June", "July", "August", "September"].includes(answers.month)) {
    tips.push(
      `Sowing in ${answers.month} is outside the optimal period. Consider sowing between June–September.`
    );
  }

  // fertilizer type check
  if (answers.fertilizer && answers.fertilizer !== "DAP") {
    tips.push(
      `Your chosen fertilizer (${answers.fertilizer}) is suboptimal. Using DAP can improve soil nutrition.`
    );
  }

  // fertilizer quantity
  if (answers.fertilizer_qty && Number(answers.fertilizer_qty) < 50) {
    tips.push(
      `fertilizer quantity (${answers.fertilizer_qty} kg/ha) seems low. Increase to recommended levels for optimal yield.`
    );
  }

  // Irrigation check
  if (answers.irrigation && answers.irrigation !== "tube_well") {
    tips.push(
      `Your irrigation method (${answers.irrigation}) may reduce yield. Tube well irrigation provides more controlled water supply.`
    );
  }

  // Irrigation frequency
  if (answers.irrigation_freq && Number(answers.irrigation_freq) < 2) {
    tips.push(
      `Irrigation frequency (${answers.irrigation_freq}/week) is low. Irrigate at least twice per week for consistent moisture.`
    );
  }

  // Soil type check
  if (answers.soil_type && !["red", "black", "alluvial", "sandy"].includes(answers.soil_type.toLowerCase())) {
    tips.push(
      `Soil type (${answers.soil_type}) is unusual. Consider red, black, alluvial, or sandy soils for rice cultivation.`
    );
  }

  // Soil pH check
  const pH = parseFloat(answers.soil);
  if (isNaN(pH) || pH < 6.5 || pH > 7.0) {
    tips.push(
      `Soil pH (${answers.soil}) is outside the optimal 6.5–7.0 range. Adjust pH for better growth.`
    );
  }

  if (tips.length === 0) {
    tips.push("All inputs are near optimal. Keep up the good practices.");
  }

  return tips.join("\n");
}


// -------------------- INTENT DETECTION --------------------
function detectIntent(input) {
  input = input.toLowerCase();
  if (["hi", "hello", "hey"].some((w) => input.includes(w))) return "greet";

  const suggestKeywords = ["increase", "improve", "better", "boost", "suggestion", "advice"];
  if (suggestKeywords.some((w) => input.includes(w))) return "suggest";
  const pestKeywords = ["lice", "cockroach", "rodent", "pest", "protect crop", "save crop"];
if (pestKeywords.some((word) => input.includes(word))) {
    return "pest_management";
}
const fertExplainKeywords = [
  "why urea not good", 
  "why urea is not best fertilizer", 
  "urea vs dap", 
  "fertilizer choice", 
  "best fertilizer for rice"
];

if (fertExplainKeywords.some((word) => input.includes(word))) {
    return "fertilizer_explanation";
}

// Grain storage advice
const storageKeywords = [
    "grain storage", 
    "how to store grain", 
    "save harvest", 
    "post-harvest storage"
];
if (storageKeywords.some((word) => input.includes(word))) return "storage_advice";

// Natural disaster protection
const disasterKeywords = [
    "flood protection", "cyclone","cyclones","flood",    "cyclone protection", 
    "storm", 
    "protect crops from natural disasters", 
    "disaster management"
];
if (disasterKeywords.some((word) => input.includes(word))) return "disaster_advice";

// 1. Best sowing month
const sowingKeywords = ["best month to sow", "sowing month", "when to sow", "optimal sowing"];
if (sowingKeywords.some((word) => input.includes(word))) return "best_month";

// 2. Ideal conditions
const idealKeywords = ["ideal conditions", "optimal conditions","best condition", "best conditions", "conditions for rice"];
if (idealKeywords.some((word) => input.includes(word))) return "ideal_conditions";

// 3. fertilizer info
const fertKeywords = [ "best fertilizer", "how much fertilizer", "fertilizer amount","fertilizer for rice"];
if (fertKeywords.some((word) => input.includes(word))) return "fertilizer_info";

// 4. Irrigation advice
const irrigationKeywords = ["irrigation method", "how to irrigate", "water management", "irrigation type"];
if (irrigationKeywords.some((word) => input.includes(word))) return "irrigation_info";

// 5. Soil type guidance
const soilKeywords = ["soil type", "soil for rice", "which soil", "best soil"];
if (soilKeywords.some((word) => input.includes(word))) return "soil_info";

const rainIrrigationKeywords = [
    "it rained", 
    "rained 2-3 days ago", 
    "do I need to irrigate", 
    "water the field", 
    "irrigation after rain"
];
if (rainIrrigationKeywords.some((word) => input.includes(word))) {
    return "rain_irrigation";
}


// 8. Harvest time
const harvestKeywords = ["harvest time", "when to harvest", "crop harvesting", "maturity"];
if (harvestKeywords.some((word) => input.includes(word))) return "harvest_time";

// 9. Crop rotation advice
const rotationKeywords = ["crop rotation", "next crop", "rotate crops", "what to plant next"];
if (rotationKeywords.some((word) => input.includes(word))) return "crop_rotation";

// 10. Yield improvement tips
const yieldKeywords = ["increase yield", "improve yield", "boost production", "get more yield"];
if (yieldKeywords.some((word) => input.includes(word))) return "yield_tips";


  const riceKeywords = ["rice", "yield", "outcome", "harvest", "predict"];
  const insectKeywords = ["insect", "bugs", "aphids", "borers", "how to save crop from insects"];
if (insectKeywords.some((word) => input.includes(word))) {
    return "insect_management";
}

  if (riceKeywords.some((w) => input.includes(w))) return "predict_rice";
  const teamKeywords = ["who made", "developer", "team", "authors", "creator", "built by"];
if (teamKeywords.some((word) => input.includes(word))) {
    return "team_info";
}


  return null;
}

// -------------------- TELEGRAM HANDLERS --------------------
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const context = getContext(chatId);

  // If waiting for answers
  if (context.intent === "predict_rice" && context.currentQuestion) {
    context.answers[context.currentQuestion] = text;
    context.currentQuestion = null;
    askNextTelegram(chatId);
    return;
  }

  // Detect intent
  const intent = detectIntent(text);

  if (intent === "greet") {
    bot.sendMessage(
      chatId,
      randomChoice(greetings) + "\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU"
    );
  }else if (intent === "pest_management") {
    bot.sendMessage(chatId, pestMessage + "\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU");
}
else if (intent === "best_month") {
    bot.sendMessage(chatId, randomChoice(bestMonthReplies));
} 
else if (intent === "ideal_conditions") {
    bot.sendMessage(chatId, randomChoice(idealConditionsReplies));
} 
else if (intent === "fertilizer_explanation") {
    bot.sendMessage(
        chatId,
        randomChoice(fertilizerExplanationReplies) + 
        "\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU"
    );
}

else if (intent === "fertilizer_info") {
    bot.sendMessage(chatId, randomChoice(fertilizerReplies));
}
else if (intent === "rain_irrigation") {
    bot.sendMessage(chatId, randomChoice(rainIrrigationReplies));
}
else if (intent === "storage_advice") {
    bot.sendMessage(chatId, randomChoice(storageReplies));
} 
else if (intent === "disaster_advice") {
    bot.sendMessage(chatId, randomChoice(disasterReplies));
}

else if (intent === "irrigation_info") {
    bot.sendMessage(chatId, randomChoice(irrigationReplies));
}
else if (intent === "soil_info") {
    bot.sendMessage(chatId, randomChoice(soilReplies));
}
else if (intent === "pest_management") {
    bot.sendMessage(chatId, randomChoice(pestReplies));
}
else if (intent === "insect_management") {
    bot.sendMessage(chatId, randomChoice(insectReplies));
}
else if (intent === "harvest_time") {
    bot.sendMessage(chatId, randomChoice(harvestReplies));
}
else if (intent === "crop_rotation") {
    bot.sendMessage(chatId, randomChoice(rotationReplies));
}
else if (intent === "yield_tips") {
    bot.sendMessage(chatId, randomChoice(yieldReplies));
}


   else if (intent === "suggest") {
    const tips = generateSmartSuggestions(context.answers);
    bot.sendMessage(
      chatId,
      "Based on your inputs:\n" + tips + "\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU"
    );
  }
  else if (intent === "insect_management") {
    bot.sendMessage(chatId, insectMessage + "\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU");
}

  else if (intent === "team_info") {
    bot.sendMessage(
        chatId,
        teamMessage + "\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU"
    );
}
 else if (intent === "predict_rice") {
    context.intent = "predict_rice";
    context.pendingQuestions = Object.keys(questions).sort(() => Math.random() - 0.5);
    bot.sendMessage(chatId, "Okay, let’s gather some details...");
    askNextTelegram(chatId);
  } else {
    bot.sendMessage(
      chatId,
      "I can help you predict rice yield or suggest improvements. Try: 'Predict rice yield' or 'How to increase yield?'\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU"
    );
  }
});

// -------------------- ASK NEXT QUESTION --------------------
function askNextTelegram(chatId) {
  const context = getContext(chatId);
  if (context.pendingQuestions.length === 0) {
    predictTelegram(chatId);
    return;
  }
  const qKey = context.pendingQuestions.pop();
  context.currentQuestion = qKey;
  bot.sendMessage(chatId, randomChoice(questions[qKey]));
}

// -------------------- PREDICT --------------------
function predictTelegram(chatId) {
  const context = getContext(chatId);
  const { month, area, fertilizer, irrigation, soil } = context.answers;

  const validMonths = ["June", "July", "August", "September"];
  if (!validMonths.includes(month)) {
    bot.sendMessage(
      chatId,
      `Sowing in ${month} is outside the optimal period. Predicted yield: 0 tons/ha.\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU`
    );
    userContext[chatId] = { intent: null, answers: {}, pendingQuestions: [], currentQuestion: null };
    return;
  }

  const input = [
    monthMap[month] || 0,
    parseFloat(area),
    fertMap[fertilizer] || 0,
    irrMap[irrigation] || 0,
    parseFloat(soil),
  ];

  let prediction = regression.predict([input]);
if (Array.isArray(prediction)) prediction = prediction[0];
prediction = Number(prediction);

let percentage = (prediction / 10) * 100;

// scale it down to make it realistic
percentage = percentage * 0.92 + Math.random() * 3;

// keep within 0–97
if (percentage > 97) percentage = 97;
if (percentage < 0) percentage = 0;

// convert to number explicitly
percentage = Number(percentage.toFixed(1));


  

  let comment = "";
  if (prediction === 0) comment = "No yield expected. Consider sowing between June and September for rice.";
  else if (percentage < 80) comment = "You can do better! Minor improvements in fertilizer, irrigation, or sowing month may increase yield.";
  else comment = "Good effort! Your yield is close to optimal.";

  bot.sendMessage(
    chatId,
    randomChoice(predictionReplies)(prediction, percentage) + "\n" + comment + "\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU"
  );

  userContext[chatId] = { intent: null, answers: {}, pendingQuestions: [], currentQuestion: null };
}
