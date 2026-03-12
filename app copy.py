
import pickle
import pandas as pd
from flask import Flask, request, jsonify

# Initialize Flask
app = Flask(__name__)

# Global variables for models
model = None
rf = None

# Load models function
def load_models():
    global model, rf
    try:
        with open("models/neuralprophet.pkl", "rb") as f:
            model = pickle.load(f)
        with open("models/random_forest.pkl", "rb") as f:
            rf = pickle.load(f)
        return True
    except Exception as e:
        print(f"Error loading models: {str(e)}")
        return False

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Energy Forecasting API is running!"})

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Parse JSON data
        data = request.get_json()
        periods = data.get('periods')

        if not periods:
            return jsonify({"error": "Missing 'periods' parameter"}), 400

        # Make sure models are loaded
        if model is None or rf is None:
            success = load_models()
            if not success:
                return jsonify({"error": "Failed to load models"}), 500

        # Create Future DataFrame with specified forecast periods
        df_future = model.make_future_dataframe(
            pd.DataFrame(),
            n_historic_predictions=False,
            periods=periods
        )
        forecast = model.predict(df_future)
        print("DF Future Debug:",df_future)
        # Extract dates and predictions
        future = forecast[["ds", "yhat1"]].copy()
        future["dayofweek"] = future["ds"].dt.dayofweek
        future["month"] = future["ds"].dt.month
        future["year"] = future["ds"].dt.year

        # Predict residuals using the Random Forest model
        future["residuals_rf"] = rf.predict(future[["dayofweek", "month", "year"]])

        # Calculate the final hybrid forecast
        future["hybrid_forecast"] = future["yhat1"] + future["residuals_rf"]

        # Convert dates to string for JSON serialization
        future["ds"] = future["ds"].dt.strftime('%Y-%m-%d')

        # Convert results to JSON-friendly dictionary format
        predictions = future[["ds", "hybrid_forecast"]].to_dict(orient="records")
        return jsonify({"predictions": predictions})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Try to load models at startup
    load_models()
    # Run the app
    app.run(host='0.0.0.0', port=8200, debug=True)
