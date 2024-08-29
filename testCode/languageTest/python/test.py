# Import statements
import math
import os.path as path

# Function declarations
def regular_function(arg1, arg2):
    """A regular function with two arguments."""
    return arg1 + arg2

def function_with_defaults(arg1, arg2=10):
    """A function with default arguments."""
    return arg1 * arg2

def function_with_args_kwargs(*args, **kwargs):
    """A function that takes variable arguments."""
    return args, kwargs

# Lambda function
lambda_function = lambda x, y: x * y

# Asynchronous function
async def async_function(param):
    """An asynchronous function."""
    return param

# Class definition with various methods
class ExampleClass:
    """A sample class with various methods."""

    # Class-level attribute
    class_attribute = "I am a class attribute"

    def __init__(self, instance_attribute):
        """Constructor method with an instance attribute."""
        self.instance_attribute = instance_attribute

    def instance_method(self):
        """Instance method."""
        return self.instance_attribute

    @classmethod
    def class_method(cls):
        """Class method."""
        return cls.class_attribute

    @staticmethod
    def static_method(param):
        """Static method."""
        return param

    async def async_instance_method(self):
        """Asynchronous instance method."""
        return self.instance_attribute

# Another class for inheritance example
class ParentClass:
    """Parent class for inheritance example."""
    def parent_method(self):
        """Method in the parent class."""
        return "This is the parent method"

# Inherited class
class ChildClass(ParentClass):
    """Child class inheriting from ParentClass."""
    def child_method(self):
        """Method in the child class."""
        return "This is the child method"

# Nested class example
class OuterClass:
    """Outer class containing a nested class."""

    class NestedClass:
        """A nested class inside OuterClass."""

        def nested_method(self):
            """Method in the nested class."""
            return "This is a nested method"

# Function with inner function
def outer_function(x):
    """A function containing another function inside it."""

    def inner_function(y):
        """Inner function."""
        return x + y

    return inner_function

# Decorator function example
def decorator_function(func):
    """A decorator function."""
    def wrapper(*args, **kwargs):
        print(f"Calling {func.__name__} with {args} and {kwargs}")
        return func(*args, **kwargs)
    return wrapper

@decorator_function
def decorated_function(param):
    """A function that is decorated."""
    return f"Decorated function called with {param}"

# Usage examples
if __name__ == "__main__":
    # Using various functions and methods to demonstrate declarations
    print(regular_function(1, 2))
    print(lambda_function(3, 4))
    print(async_function(5))  # Note: This won't actually run asynchronously in this context
    example_instance = ExampleClass("Instance Attribute Value")
    print(example_instance.instance_method())
    print(ExampleClass.class_method())
    print(ExampleClass.static_method("Static Param"))

    child_instance = ChildClass()
    print(child_instance.child_method())
    print(child_instance.parent_method())

    outer = OuterClass()
    nested = outer.NestedClass()
    print(nested.nested_method())

    decorated_function("Hello")
