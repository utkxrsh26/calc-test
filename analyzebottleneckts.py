#!/usr/bin/env python3
import os
import sys
import json
import pickle
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def load_data(csv_path):
    """Load and preprocess historical energy data (original scale)."""
    df = pd.read_csv(csv_path, usecols=["time", "energy"])
    df.rename(columns={"time": "ds", "energy": "y_orig"}, inplace=True)
    df["ds"] = pd.to_datetime(df["ds"]).dt.tz_localize(None)
    df.sort_values("ds", inplace=True)
    return df

def load_models(model_dir):
    """Load the trained NeuralProphet (log domain) and Random Forest models."""
    np_model_path = os.path.join(model_dir, "neuralprophet.pkl")
    rf_model_path = os.path.join(model_dir, "random_forest.pkl")
    
    with open(np_model_path, "rb") as f:
        np_model = pickle.load(f)
        np_model.restore_trainer()  # necessary for compatibility
    
    with open(rf_model_path, "rb") as f:
        rf_model = pickle.load(f)
    
    return np_model, rf_model

def analyze_predictions(historical_csv, model_dir):
    # Load original data
    df_orig = load_data(historical_csv)
    
    # Create log-transformed data
    df_log = df_orig.copy()
    df_log["y"] = np.log1p(df_log["y_orig"])
    # Keep only the columns NeuralProphet expects:
    df_log = df_log[["ds", "y"]]
    
    # Load models
    np_model, rf_model = load_models(model_dir)
    
    # Generate in-sample forecast using the log-domain model
    forecast = np_model.predict(df_log)
    # forecast["yhat1"] is in log space.
    
    # Merge the forecast with the log-domain actuals
    merged = pd.merge(df_log, forecast[["ds", "yhat1"]], on="ds", how="inner")
    
    # Compute log residuals
    merged["residual_log"] = merged["y"] - merged["yhat1"]
    
    # Prepare date features for RF prediction
    # (Use the original dates from df_orig by merging on 'ds')
    merged = pd.merge(merged, df_orig[["ds", "y_orig"]], on="ds", how="left")
    merged["dayofweek"] = merged["ds"].dt.dayofweek
    merged["month"] = merged["ds"].dt.month
    merged["year"] = merged["ds"].dt.year
    
    # Predict the RF residual (in log space)
    rf_pred = rf_model.predict(merged[["dayofweek", "month", "year"]])
    
    # Compute hybrid log forecast: NeuralProphet log output + RF predicted residual
    merged["hybrid_log"] = merged["yhat1"] + rf_pred
    
    # Invert the log transform (np.expm1 converts log1p back to original scale)
    merged["NP_pred"] = np.expm1(merged["yhat1"])
    merged["Hybrid_pred"] = np.expm1(merged["hybrid_log"])
    
    # Compute error metrics on the original scale:
    merged["error_NP"] = np.abs(merged["y_orig"] - merged["NP_pred"])
    mae_NP = merged["error_NP"].mean()
    mape_NP = (np.abs(merged["y_orig"] - merged["NP_pred"]) / merged["y_orig"]).mean() * 100
    
    merged["error_Hybrid"] = np.abs(merged["y_orig"] - merged["Hybrid_pred"])
    mae_Hybrid = merged["error_Hybrid"].mean()
    mape_Hybrid = (np.abs(merged["y_orig"] - merged["Hybrid_pred"]) / merged["y_orig"]).mean() * 100
    
    print("=== Error Metrics (In-sample, original scale) ===")
    print(f"NeuralProphet MAE: {mae_NP:.2f}")
    print(f"Hybrid Model MAE: {mae_Hybrid:.2f}")
    print(f"NeuralProphet MAPE: {mape_NP:.2f}%")
    print(f"Hybrid Model MAPE: {mape_Hybrid:.2f}%")
    
    # Plot actual vs predictions
    plt.figure(figsize=(12,6))
    plt.plot(merged["ds"], merged["y_orig"], label="Actual Energy", marker="o")
    plt.plot(merged["ds"], merged["NP_pred"], label="NP Forecast", marker="x")
    plt.plot(merged["ds"], merged["Hybrid_pred"], label="Hybrid Forecast", marker="s")
    plt.xlabel("Date")
    plt.ylabel("Energy")
    plt.title("Original Energy vs Forecasts (In-sample)")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()
    
    return merged

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python analyze_bottlenecks_log.py historical_data.csv model_dir")
        sys.exit(1)
    historical_csv = sys.argv[1]
    model_dir = sys.argv[2]
    analyze_predictions(historical_csv, model_dir)
