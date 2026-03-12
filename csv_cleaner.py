#!/usr/bin/env python3
import pandas as pd
import os
import glob

# Directory containing CSV files
CSV_DIR = 'postgres_csv_exports/public'

def clean_csv_file(csv_path):
    """Clean CSV file by converting float columns to integers where appropriate"""
    print(f"Cleaning {csv_path}...")
    
    # Read the CSV file
    df = pd.read_csv(csv_path)
    
    # Make a backup of the original file
    backup_path = f"{csv_path}.backup"
    if not os.path.exists(backup_path):
        os.rename(csv_path, backup_path)
        print(f"Created backup at {backup_path}")
    
    # For each column that looks like a float but might be intended as an integer
    for column in df.columns:
        # Check if column is numeric
        if pd.api.types.is_numeric_dtype(df[column]):
            # Check if all values in the column are integers stored as floats
            if all(df[column].dropna().apply(lambda x: x.is_integer() if isinstance(x, float) else True)):
                # Convert to integer
                df[column] = df[column].fillna(0).astype(int)
                print(f"  - Converted column '{column}' from float to integer")
    
    # Save the cleaned CSV
    df.to_csv(csv_path, index=False)
    print(f"Saved cleaned file to {csv_path}")
    return True

def clean_all_csvs():
    """Clean all CSV files in the directory"""
    csv_files = glob.glob(f"{CSV_DIR}/*.csv")
    
    for csv_file in csv_files:
        # Skip backup files
        if csv_file.endswith('.backup'):
            continue
            
        try:
            clean_csv_file(csv_file)
        except Exception as e:
            print(f"Error cleaning {csv_file}: {e}")

if __name__ == "__main__":
    print("Starting CSV cleaning process...")
    clean_all_csvs()
    print("Cleaning process completed!")