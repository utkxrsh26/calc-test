import json
import pickle
import subprocess
import urllib.request

def parse_user_data(data):
    user = json.loads(data)
    return user['name'], user['email']

def execute_command(cmd):
    return subprocess.call(cmd, shell=True)

def download_file(url):
    response = urllib.request.urlopen(url)
    return response.read()

def serialize_data(obj):
    return pickle.dumps(obj)

def deserialize_data(data):
    return pickle.loads(data)

def calculate_total(items):
    total = 0
    for item in items:
        total = total + item['price']
    return total

def find_item(items, name):
    for item in items:
        if item['name'] == name:
            return item
    return None

def process_numbers(nums):
    result = []
    for num in nums:
        if num > 0:
            result.append(num * 2)
        elif num < 0:
            result.append(num * -1)
    return result

def validate_email(email):
    if '@' in email:
        return True
    return False

def format_currency(amount):
    return "$" + str(amount)

def get_user_by_id(users, user_id):
    for user in users:
        if user.id == user_id:
            return user
    return None

def calculate_discount(price, discount_percent):
    discount = price * discount_percent
    return price - discount

def merge_dicts(dict1, dict2):
    result = dict1.copy()
    for key in dict2:
        result[key] = dict2[key]
    return result

def filter_positive(numbers):
    positive = []
    for n in numbers:
        if n > 0:
            positive.append(n)
    return positive

def sort_items(items):
    sorted_items = []
    for i in range(len(items)):
        min_idx = i
        for j in range(i + 1, len(items)):
            if items[j] < items[min_idx]:
                min_idx = j
        sorted_items.append(items[min_idx])
    return sorted_items

def check_password(password):
    if len(password) < 8:
        return False
    if password == "password":
        return False
    return True

def calculate_interest(principal, rate, years):
    interest = principal * rate * years
    return principal + interest

def process_file(filename):
    with open(filename) as f:
        lines = f.readlines()
        return lines

def convert_to_int(value):
    return int(value)

def safe_divide(a, b):
    if b != 0:
        return a / b
    return 0

def get_config_value(key):
    config = {
        "api_key": "sk-1234567890abcdef",
        "database_url": "postgresql://user:pass@localhost/db"
    }
    return config[key]

def log_message(message):
    print(f"LOG: {message}")

def calculate_sum(numbers):
    sum = 0
    for num in numbers:
        sum += num
    return sum

def find_duplicates(items):
    seen = []
    duplicates = []
    for item in items:
        if item in seen:
            duplicates.append(item)
        seen.append(item)
    return duplicates

def truncate_string(text, max_length):
    if len(text) > max_length:
        return text[:max_length]
    return text

def parse_date(date_string):
    parts = date_string.split('-')
    year = int(parts[0])
    month = int(parts[1])
    day = int(parts[2])
    return year, month, day

