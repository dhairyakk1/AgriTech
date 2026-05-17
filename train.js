import fs from "fs";
import csv from "csv-parser";
import MultivariateLinearRegression from "ml-regression-multivariate-linear";

const DATA_PATH = "data/rice_yield_sample.csv";
const MODEL_PATH = "models/rice_model.json";

// encode categorical values manually
const monthMap = { June: 1, July: 2, August: 3, September: 4 };
const fertMap = { urea: 1, DAP: 2 };
const irrMap = { canal: 1, tube_well: 2 };

function encodeRow(row) {
  return [
    monthMap[row.month] || 0,
    parseFloat(row.amount),
    fertMap[row.fertiliser] || 0,
    irrMap[row.irrigation] || 0,
    parseFloat(row.soil_ph)
  ];
}

function train() {
  const X = [];
  const Y = [];

  fs.createReadStream(DATA_PATH)
    .pipe(csv())
    .on("data", (row) => {
      X.push(encodeRow(row));
      Y.push([parseFloat(row.yield)]);
    })
    .on("end", () => {
      const regression = new MultivariateLinearRegression(X, Y);
      fs.writeFileSync(MODEL_PATH, JSON.stringify(regression.toJSON()));
      console.log("✅ Model trained and saved to", MODEL_PATH);
    });
}

train();
