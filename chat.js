import fs from "fs";
import readline from "readline";
import MultivariateLinearRegression from "ml-regression-multivariate-linear";

// Ideal values for context-aware suggestions
const ideal = {
  month: ["June", "July", "August", "September"],
  fertiliser: "DAP",
  irrigation: "tube_well",
  soil: { min: 6.5, max: 7.0 }, // optimal pH
};

function generateSuggestions(answers) {
  const tips = [];

  // Month check
  if (!ideal.month.includes(answers.month)) {
    tips.push(`⚠️ Your sowing month (${answers.month}) is suboptimal. Try sowing between June–September.`);
  }

  // Fertiliser check
  if (answers.fertiliser !== ideal.fertiliser) {
    tips.push(`💊 Consider using ${ideal.fertiliser} for better soil nutrition.`);
  }

  // Irrigation check
  if (answers.irrigation !== ideal.irrigation) {
    tips.push(`💧 Switching to ${ideal.irrigation} irrigation can improve water management.`);
  }

  // Soil pH check
  const pH = parseFloat(answers.soil);
  if (isNaN(pH) || pH < ideal.soil.min || pH > ideal.soil.max) {
    tips.push(`🌱 Adjust your soil pH to be between ${ideal.soil.min}-${ideal.soil.max} for optimal growth.`);
  }

  if (tips.length === 0) {
    tips.push("👍 Your inputs are near optimal! Keep up the good practices.");
  }

  return tips.join("\n");
}

// Load model
const MODEL_PATH = "models/rice_model.json";
if (!fs.existsSync(MODEL_PATH)) {
  console.log("⚠️ No model found. Run: node train.js first.");
  process.exit(1);
}
const regression = MultivariateLinearRegression.load(
  JSON.parse(fs.readFileSync(MODEL_PATH, "utf-8"))
);

// Encoders
const monthMap = { June: 1, July: 2, August: 3, September: 4 };
const fertMap = { urea: 1, DAP: 2 };
const irrMap = { canal: 1, tube_well: 2 };

// Conversation state
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let context = {
  intent: null,
  answers: {},
  pendingQuestions: [],
};

// Questions pool
const questions = {
  area: [
    "🌱 How much land area do you have (in hectares)? ",
    "🌾 Please tell me your farm size (in hectares): ",
    "📐 What’s your land size in hectares? ",
  ],
  month: [
    "📅 In which month will you sow? (June/July/August/September) ",
    "🗓️ Tell me the sowing month (June–September): ",
    "⌛ What month are you planning to sow? ",
  ],
  fertiliser: [
    "💊 Which fertiliser do you plan to use (urea/DAP)? ",
    "🧪 Fertiliser type? (urea/DAP): ",
    "🌿 What fertiliser are you applying? ",
  ],
  irrigation: [
    "💧 What type of irrigation do you use (canal/tube_well)? ",
    "🚰 Irrigation method? (canal or tube_well): ",
    "🌊 Tell me about your irrigation source: ",
  ],
  soil: [
    "🌍 What is your soil pH? ",
    "🧪 Soil pH value please: ",
    "⚖️ Can you provide the soil pH? ",
  ],
};

// Utility → random choice
function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Always append signature
function botReply(msg) {
  console.log(msg + "\n\n— This chatbot is made by team Dreadnoughts for SIH 2025, IIT BHU\n");
}

// Responses for prediction
const predictionReplies = [
  (p, pct) => `✅ Estimated rice yield: ${p.toFixed(2)} tons/ha.\n📊 About ${pct.toFixed(1)}% of optimal.`,
  (p, pct) => `🌾 Your rice harvest looks to be around ${p.toFixed(2)} tons per hectare.\nThat’s ~${pct.toFixed(1)}% of the best conditions.`,
  (p, pct) => `📈 Predicted output: ${p.toFixed(2)} t/ha.\nThis is approximately ${pct.toFixed(1)}% efficiency.`,
];

// Greetings
const greetings = [
  "👋 Hello! How can I assist you today?",
  "🤖 Hi there! Ready to talk about crops?",
  "🌱 Hey! Ask me about your farming outcomes.",
  "🌾 Welcome back! What crop prediction do you need?",
];

// Intent detection
function detectIntent(input) {
  input = input.toLowerCase();

  if (["hi", "hello", "hey"].some((word) => input.includes(word))) return "greet";

  const suggestKeywords = ["increase", "improve", "better", "boost", "suggestion", "advice"];
  if (suggestKeywords.some((word) => input.includes(word))) return "suggest";

  const riceKeywords = ["rice", "yield", "outcome", "harvest", "predict"];
  if (riceKeywords.some((word) => input.includes(word))) return "predict_rice";

  return null;
}

// Ask next question
function askNext() {
  if (context.pendingQuestions.length === 0) {
    predict();
    return;
  }
  const qKey = context.pendingQuestions.pop();
  rl.question(randomChoice(questions[qKey]), (answer) => {
    context.answers[qKey] = answer;
    askNext();
  });
}

// Predict yield
function predict() {
  const { month, area, fertiliser, irrigation, soil } = context.answers;

  // Check invalid sowing month
  const validMonths = ["June", "July", "August", "September"];
  if (!validMonths.includes(month)) {
    botReply(`⚠️ Sowing in ${month} is outside the optimal period. Unfortunately, predicted yield is 0 tons/ha.`);
    context = { intent: null, answers: {}, pendingQuestions: [] };
    waitForUser();
    return;
  }

  const input = [
    monthMap[month] || 0,
    parseFloat(area),
    fertMap[fertiliser] || 0,
    irrMap[irrigation] || 0,
    parseFloat(soil),
  ];

  let prediction = regression.predict([input]);
  if (Array.isArray(prediction)) prediction = prediction[0];
  prediction = Number(prediction);

  let percentage = (prediction / 10) * 100; // assume 10 t/ha optimal
  percentage = Math.max(0, Math.min(100, percentage));

  // Post-prediction comment based on yield
  let comment = "";
  if (prediction === 0) {
    comment = "⚠️ No yield expected. Consider sowing between June and September for rice.";
  } else if (percentage < 80) {
    comment = "💡 You can do better! Minor improvements in fertiliser, irrigation, or sowing month may increase yield.";
  } else {
    comment = "👍 Good effort! Your yield is close to optimal.";
  }

  botReply(randomChoice(predictionReplies)(prediction, percentage) + "\n" + comment);

  context = { intent: null, answers: {}, pendingQuestions: [] };
  waitForUser();
}

// Handle user input
function handleUserInput(input) {
  const intent = detectIntent(input);

  if (intent === "greet") {
    botReply(randomChoice(greetings));
    waitForUser();
  } else if (intent === "suggest") {
    const tipMessage = generateSuggestions(context.answers);
    botReply("🤖 Based on your inputs:\n" + tipMessage);
    waitForUser();
  } else if (intent === "predict_rice") {
    context.intent = "predict_rice";
    context.pendingQuestions = Object.keys(questions).sort(() => Math.random() - 0.5);
    botReply("🤖 Okay, let’s gather some details...");
    askNext();
  } else {
    botReply("🤖 I can help you predict rice yield or suggest improvements. Try: 'Predict rice yield' or 'How to increase yield?'.");
    waitForUser();
  }
}

// Start loop
function waitForUser() {
  rl.question("> ", (msg) => handleUserInput(msg));
}

botReply("🌾 Welcome to Mini Crop Chat!");
waitForUser();
