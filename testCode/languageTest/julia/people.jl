# Define a struct for a basic person
struct Person
    name::String
    age::Int
end

# A function that creates a new Person instance
function create_person(name::String, age::Int)::Person
    return Person(name, age)
end

# A function that displays a person's information
function display_person(person::Person)
    println("Person: Name = $(person.name), Age = $(person.age)")
end

# A function that calls another function in family.jl to create a family member
function create_family_member(name::String, age::Int, relation::String)
    person = create_person(name, age)
    create_relative(person, relation)  # This function is in family.jl
end
function test()
    println("Family Tree:")
end
