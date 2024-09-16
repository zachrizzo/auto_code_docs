# Import people.jl to use Person struct and functions
include("people.jl")

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

function test()
    println("Family Tree:")
end
