import requests
import json
import time

# API URL
URL = "https://operator.obepower.com/operatorPortal/secured/dataService/findByFilter"

# Headers (Use exactly as in curl)
HEADERS = {
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-IN,en;q=0.9,hi-IN;q=0.8,hi;q=0.7",
    "Connection": "keep-alive",
    "Content-Type": "application/json",
    "DNT": "1",
    "Origin": "https://operator.obepower.com",
    "Referer": "https://operator.obepower.com/operatorPortal/secured/stationList",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "X-APP-TYPE": "WEB",
    "X-Ajax-call": "true",
    "X-CSRF-TOKEN": "5109ab31-04b2-4473-8a06-b7f5abbef774",
    "X-Requested-With": "XMLHttpRequest",
    "sec-ch-ua": '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133")',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"macOS"',
}

# Cookies (Update with fresh session cookies)
COOKIES = {
    "JSESSIONID": "F3F7ED68C9996BA3B8AE7F4768132E8C",
    "_ga": "GA1.1.1956365866.1736334701",
    "_ga_HGYPNEEMX5": "GS1.1.1741708371.48.1.1741709767.0.0.0",
}

# Payload (Ensure matches `curl` request)
PAYLOAD_TEMPLATE = {
    "serviceBeanName": "stationDataService",
    "queryInfo": {
        "pageIndex": 0,
        "pageSize": 100,
        "sortedBy": [{"propertyName": "distance", "sortOrder": "ASC"}],
        "filteredBy": [
            {"propertyName": "location", "values": [39.7392, -104.9903]},
            {"propertyName": "isManaged", "values": [True]},
            {"propertyName": "countries", "values": [235]},
        ],
    },
}

# Function to fetch data with pagination
def fetch_paginated_data():
    all_data = []
    page_index = 0
    while True:
        print(f"\nFetching page {page_index}...")

        # Set current page index
        PAYLOAD_TEMPLATE["queryInfo"]["pageIndex"] = page_index

        # Send request
        response = requests.post(URL, headers=HEADERS, cookies=COOKIES, json=PAYLOAD_TEMPLATE)

        # Debugging: Print response status and first 500 chars of response
        print("Response Status:", response.status_code)
        print("Response Headers:", response.headers)
        print("Response Text (First 500 chars):", response.text[:500])

        if response.status_code != 200:
            print("Error: Failed to fetch data")
            break

        # Parse JSON response
        try:
            data = response.json()
            records = data.get("data", {}).get("result",[])

            if not records:
                print("No more records found. Stopping pagination.")
                break

            all_data.extend(records)
            page_index += 1

            # Sleep to prevent rate-limiting
            time.sleep(1)

        except json.JSONDecodeError as e:
            print("Error decoding JSON:", e)
            break

    return all_data

# Fetch data
data = fetch_paginated_data()

# Save to JSON file
with open("ev_charger_data.json", "w", encoding="utf-8") as json_file:
    json.dump(data, json_file, indent=4)

print(f"\nData saved to ev_charger_data.json ({len(data)} records).")
