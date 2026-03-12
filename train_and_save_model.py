import os
import pickle
import pandas as pd
import numpy as np
from neuralprophet import NeuralProphet
from sklearn.ensemble import RandomForestRegressor
from scipy.stats import zscore
import warnings

# Warning suppression
warnings.filterwarnings('ignore')


def train_and_save_model(data_path="weekly_energy.csv", model_path="models/", seed=42):
    if not os.path.exists(model_path):
        os.makedirs(model_path)

    print("Loading data...")
    df = pd.read_csv(data_path, usecols=["time", "energy"])
    df = df[:-2]  # Drop last row as it is incomplete
    df.rename(columns={"time": "ds", "energy": "y"},
              inplace=True)  # Rename columns
    df["ds"] = pd.to_datetime(df["ds"]).dt.tz_localize(None)  # Remove timezone
    df = df.sort_values("ds").reset_index(drop=True)  # Sort by date
    df["y"] = df["y"].astype(float)  # Convert to float

    print("Cleaning data...")
    df = df[(df["y"] > df["y"].quantile(0.01)) &
            (df["y"] < df["y"].quantile(0.99))]
    df["zscore"] = np.abs(zscore(df["y"]))
    df = df[df["zscore"] < 3].drop(columns=["zscore"])
    Q1, Q3 = df["y"].quantile(0.25), df["y"].quantile(0.75)
    IQR = Q3 - Q1
    df = df[(df["y"] > (Q1 - 1.5 * IQR)) & (df["y"] < (Q3 + 1.5 * IQR))]

    print("Setting random seed for reproducibility...")
    np.random.seed(seed)
    import torch
    torch.manual_seed(seed)

    print("Training NeuralProphet model...")
    from neuralprophet import NeuralProphet
    
    model = NeuralProphet(
        yearly_seasonality=20,
        weekly_seasonality=10,
        daily_seasonality=8,
        seasonality_mode="multiplicative",
        trend_reg=0.5, # From 0.1
        trend_reg_threshold=False,
        changepoints_range=0.9,
        n_changepoints=15, # From 20
        learning_rate=0.01,
        epochs=300,
        batch_size=32,
        loss_func="Huber",
        collect_metrics=False,
    )
    metrics = model.fit(df, freq="W", progress="none")

    print("Creating forecasts...")
    df_future = model.make_future_dataframe(
        # Forecasting the same data to get residuals with period=0 so that the future dataframe is the same as the input dataframe
        df, n_historic_predictions=True, periods=0)
    # Forecasting the same data to get residuals
    forecast = model.predict(df_future)

    # Merge forecast with original data
    df = df.merge(forecast[["ds", "yhat1"]], on="ds", how="left").dropna()
    df["residuals"] = df["y"] - df["yhat1"]  # Calculate residuals

    df["dayofweek"] = df["ds"].dt.dayofweek  # Extract day of week
    df["month"] = df["ds"].dt.month  # Extract month
    df["year"] = df["ds"].dt.year  # Extract year
    df["is_weekend"] = df["dayofweek"].isin([5, 6])  # Check if day is weekend

    print("Training Random Forest model...")
    rf = RandomForestRegressor(n_estimators=100, random_state=seed)
    rf.fit(df[["dayofweek", "month", "year", "is_weekend"]], df["residuals"])

    print("Saving models...")
    with open(os.path.join(model_path, "neuralprophet.pkl"), "wb") as f:
        pickle.dump(model, f, protocol=4)

    with open(os.path.join(model_path, "random_forest.pkl"), "wb") as f:
        pickle.dump(rf, f, protocol=4)

    print("✅ Models trained and saved successfully!")

if __name__ == "__main__":
    train_and_save_model()