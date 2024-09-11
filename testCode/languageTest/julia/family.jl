# Import people.jl to use Person struct and functions
# include("people.jl")

# Define a struct for a family member, which is a subclass of Person
struct FamilyMember
    person::Person
    relation::String
end

# A function that creates a new family member instance
function create_relative(person::Person, relation::String)::FamilyMember
    return FamilyMember(person, relation)
end

# A function that displays a family member's information
function display_family_member(family_member::FamilyMember)
    println("Family Member: Name = $(family_member.person.name), Age = $(family_member.person.age), Relation = $(family_member.relation)")
end

# A function that calls display_person from people.jl
function display_family_tree(name::String, age::Int, relation::String)
    family_member = create_family_member(name, age, relation)
    display_person(family_member.person)  # This calls a function from people.jl
    display_family_member(family_member)
end


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
