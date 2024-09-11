# Import people.jl to use Person struct and functions
include("people.jl")

# Define a struct for a student, which is a subclass of Person
struct Student
    person::Person
    grade::Int
    major::String
end

# A function that creates a new Student instance
function create_student(name::String, age::Int, grade::Int, major::String)::Student
    person = create_person(name, age)  # Calls a function from people.jl
    return Student(person, grade, major)
end

# A function that displays a student's information
function display_student(student::Student)
    println("Student: Name = $(student.person.name), Age = $(student.person.age), Grade = $(student.grade), Major = $(student.major)")
end

# A function that promotes a student to the next grade
function promote_student(student::Student)
    student.grade += 1
    println("Student $(student.person.name) has been promoted to grade $(student.grade)")
end

# A function that calls both functions from this file and others
function manage_student(name::String, age::Int, grade::Int, major::String)
    student = create_student(name, age, grade, major)  # Calls function from this file
    display_person(student.person)  # Calls a function from people.jl
    display_student(student)
    promote_student(student)
end
