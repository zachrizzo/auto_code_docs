# Import people.jl to use Person struct and functions
include("people.jl")

# Define a struct for an employee, which is a subclass of Person
struct Employee
    person::Person
    job_title::String
    salary::Float64
end

# A function that creates a new Employee instance
function create_employee(name::String, age::Int, job_title::String, salary::Float64)::Employee
    person = create_person(name, age)  # Calls a function from people.jl
    return Employee(person, job_title, salary)
end

# A function that displays an employee's information
function display_employee(employee::Employee)
    println("Employee: Name = $(employee.person.name), Age = $(employee.person.age), Job Title = $(employee.job_title), Salary = $(employee.salary)")
end

# A function that gives an employee a raise
function give_raise(employee::Employee, raise::Float64)
    new_salary = employee.salary + raise
    println("Employee $(employee.person.name) got a raise! New salary: $(new_salary)")
end

# A function that interacts with other files
function manage_employee(name::String, age::Int, job_title::String, salary::Float64, raise::Float64)
    employee = create_employee(name, age, job_title, salary)  # Calls a function from this file
    display_person(employee.person)  # Calls a function from people.jl
    display_employee(employee)
    give_raise(employee, raise)
end
