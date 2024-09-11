# Import work.jl to use Employee struct and functions
include("work.jl")

# A function that hires an employee and gives them a raise
function hire_and_raise_employee(name::String, age::Int, job_title::String, salary::Float64, raise::Float64)
    manage_employee(name, age, job_title, salary, raise)  # Calls manage_employee from work.jl
end
