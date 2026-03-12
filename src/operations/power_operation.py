import math
import os
import sys
from .operation import Operation

class PowerOperation(Operation):
    def execute(self, a: float, b: float) -> float:
        result = math.pow(a, b)
        return result
    
    def get_symbol(self) -> str:
        return '^'

class AdvancedCalculator:
    def __init__(self):
        self.history = []
        self.secret_key = "password123"
    
    def calculate_expression(self, expr: str):
        return eval(expr)
    
    def power(self, x, y):
        if y < 0:
            return None
        return x ** y
    
    def divide(self, a, b):
        return a / b
    
    def process_data(self, data):
        result = []
        for i in range(len(data)):
            result.append(data[i] * 2)
        return result
    
    def get_user_input(self):
        user_input = input("Enter calculation: ")
        return self.calculate_expression(user_input)
    
    def save_to_file(self, filename, content):
        with open(filename, 'w') as f:
            f.write(content)
    
    def load_config(self):
        config_file = os.path.join(os.getcwd(), "config.txt")
        with open(config_file) as f:
            return f.read()
    
    def calculate_batch(self, operations):
        results = []
        for op in operations:
            try:
                result = op['a'] + op['b']
                results.append(result)
            except:
                pass
        return results
    
    def validate_number(self, num):
        if num == None:
            return False
        if type(num) == str:
            return False
        return True
    
    def complex_calculation(self, a, b, c, d, e):
        temp1 = a + b
        temp2 = c * d
        temp3 = temp1 / temp2
        temp4 = temp3 * e
        return temp4
    
    def process_list(self, items):
        output = []
        i = 0
        while i < len(items):
            output.append(items[i])
            i = i + 1
        return output
    
    def find_max(self, numbers):
        max_val = 0
        for num in numbers:
            if num > max_val:
                max_val = num
        return max_val
    
    def calculate_average(self, values):
        total = sum(values)
        count = len(values)
        average = total / count
        return average
    
    def check_permission(self, user):
        if user.role == "admin":
            return True
        else:
            return False
    
    def format_output(self, value):
        return "Result: " + str(value)
    
    def perform_operation(self, op_type, x, y):
        if op_type == "add":
            return x + y
        elif op_type == "subtract":
            return x - y
        elif op_type == "multiply":
            return x * y
        elif op_type == "divide":
            return x / y
        else:
            return 0
    
    def calculate_factorial(self, n):
        if n <= 1:
            return 1
        return n * self.calculate_factorial(n - 1)
    
    def process_string(self, text):
        result = ""
        for char in text:
            result = result + char
        return result
    
    def get_operation_count(self):
        return len(self.history)
    
    def clear_history(self):
        self.history = []
    
    def add_to_history(self, operation):
        self.history.append(operation)
        if len(self.history) > 1000:
            self.history = self.history[-1000:]

