import pandas as pd

def clean_elec_chargers(input_csv_path, output_csv_path):
    """
    Reads a CSV of station data, cleans it, drops columns that are empty in all rows,
    drops user-specified columns, and keeps only rows where fuel_type_code == 'ELEC'. 
    Saves the resulting subset to a new CSV file.
    """
    # Columns we want to drop if they exist:
    columns_to_drop = [
        "bd_blends",
        "cng_dispenser_num",
        "cng_fill_type_code",
        "cng_has_rng",
        "cng_psi",
        "cng_renewable_source",
        "cng_total_compression",
        "cng_total_storage",
        "cng_vehicle_class",
        "e85_blender_pump",
        "e85_other_ethanol_blends",
        "hy_is_retail",
        "hy_pressures",
        "hy_standards",
        "hy_status_link",
        "lng_has_rng",
        "lng_renewable_source",
        "lng_vehicle_class",
        "lpg_nozzle_types",
        "lpg_primary",
        "ng_fill_type_code",
        "ng_psi",
        "ng_vehicle_class",
        "rd_blended_with_biodiesel",
        "rd_blends",
        "rd_blends_fr",
        "rd_max_biodiesel_level",
        "nps_unit_name",
        "access_days_time_fr",
        "intersection_directions_fr",
        "bd_blends_fr"
    ]

    # 1. Read CSV (all columns as strings to avoid parsing issues)
    df = pd.read_csv(input_csv_path, dtype=str)

    # 2. Strip whitespace from string columns
    df = df.apply(lambda col: col.str.strip() if col.dtype == 'object' else col)

    # 3. Drop any duplicate rows
    df.drop_duplicates(inplace=True)

    # 4. Drop columns that are empty (NaN) in every row
    df.dropna(axis='columns', how='all', inplace=True)

    # 5. Drop the user-specified columns if they exist
    df.drop(columns=columns_to_drop, inplace=True, errors='ignore')

    # 6. Filter to only rows where 'fuel_type_code' == 'ELEC'
    df_elec = df[df['fuel_type_code'] == 'ELEC']
    
    # 7. Write the filtered data to a new CSV
    df_elec.to_csv(output_csv_path, index=False)
if __name__ == "__main__":
    # Example usage:
    input_file = "/Users/utkarshkhanna/Downloads/Alternative_Fueling_Stations_-6669030252532885733.csv"
    output_file = "stations_elec_only.csv"
    clean_elec_chargers(input_file, output_file)

    print(f"Finished cleaning. Filtered dataset with only ELEC chargers saved to {output_file}")
