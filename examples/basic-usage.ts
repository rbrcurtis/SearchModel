import 'dotenv/config'
import { 
  SearchModel, 
  StringType, 
  DateType, 
  NumberType,
  ObjectType,
  StringArrayType,
  ObjectArrayType
} from '../src'

// Define a User model
class User extends SearchModel<User> {
  static readonly indexName = 'example_users'
  
  @StringType({ 
    required: true, 
    trim: true, 
    lowerCase: true,
    validate: (email) => email.includes('@') && email.includes('.')
  })
  email!: string
  
  @StringType({ 
    required: true, 
    trim: true,
    transform: (name) => name.split(' ').map(n => 
      n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
    ).join(' ')
  })
  name!: string
  
  @NumberType({ 
    validate: (age) => age >= 0 && age <= 150 
  })
  age?: number
  
  @DateType()
  birthDate?: Date
  
  @StringArrayType({
    transform: (roles) => roles.filter(r => r.length > 0),
    validate: (roles) => roles.length > 0
  })
  roles!: string[]
  
  @ObjectType({
    properties: {
      street: { type: 'string', options: { required: true, trim: true } },
      city: { type: 'string', options: { required: true, trim: true } },
      state: { type: 'string', options: { trim: true } },
      zipCode: { type: 'string', options: { trim: true } },
      country: { type: 'string', options: { trim: true, upperCase: true } }
    }
  })
  address?: {
    street: string
    city: string
    state?: string
    zipCode?: string
    country?: string
  }
  
  @ObjectArrayType({
    properties: {
      company: { type: 'string', options: { required: true } },
      position: { type: 'string', options: { required: true } },
      startDate: { type: 'date', options: { required: true } },
      endDate: { type: 'date' },
      current: { type: 'boolean' }
    }
  })
  workHistory?: Array<{
    company: string
    position: string
    startDate: Date
    endDate?: Date
    current?: boolean
  }>
}

async function main() {
  try {
    console.log('Creating Elasticsearch index...')
    await User.createIndex()
    
    console.log('\n1. Creating a new user...')
    const user = await User.create({
      email: 'JOHN.DOE@EXAMPLE.COM',  // Will be lowercased
      name: 'john doe',  // Will be title-cased
      age: 30,
      birthDate: new Date('1993-05-15'),
      roles: ['admin', 'user', ''],  // Empty string will be filtered out
      address: {
        street: '  123 Main Street  ',  // Will be trimmed
        city: '  New York  ',  // Will be trimmed
        state: 'NY',
        zipCode: '10001',
        country: 'usa'  // Will be uppercased
      },
      workHistory: [
        {
          company: 'TechCorp',
          position: 'Senior Developer',
          startDate: new Date('2020-01-15'),
          current: true
        },
        {
          company: 'StartupXYZ',
          position: 'Junior Developer',
          startDate: new Date('2018-06-01'),
          endDate: new Date('2019-12-31'),
          current: false
        }
      ]
    })
    
    console.log('Created user:', JSON.stringify(user, null, 2))
    
    console.log('\n2. Finding users...')
    const { hits: users, total } = await User.findWithTotal(['roles:admin'], {
      limit: 10,
      sort: 'createdAt:desc'
    })
    console.log(`Found ${total} users:`)
    users.forEach(u => {
      console.log(`  - ${u.name} (${u.email})`)
    })
    
    console.log('\n3. Finding one user by email...')
    const foundUser = await User.findOne([`email:${user.email}`])
    if (foundUser) {
      console.log('Found user:', foundUser.name)
    }
    
    console.log('\n4. Getting user by ID...')
    const userById = await User.getById(user.id)
    if (userById) {
      console.log('Got user by ID:', userById.name)
    }
    
    console.log('\n5. Updating user...')
    if (foundUser) {
      foundUser.age = 31
      foundUser.roles.push('moderator')
      await foundUser.save()
      console.log('Updated user age to:', foundUser.age)
      console.log('Updated roles:', foundUser.roles)
    }
    
    console.log('\n6. Complex search...')
    const complexResults = await User.find([
      'age:[25 TO 35]',
      'roles:admin'
    ], {
      limit: 5,
      sort: 'age:asc'
    })
    console.log('Found users aged 25-35 with admin role:')
    complexResults.forEach(u => {
      console.log(`  - ${u.name}, age ${u.age}`)
    })
    
    console.log('\n7. Deleting user...')
    if (foundUser) {
      await foundUser.delete()
      console.log('User deleted successfully')
    }
    
    console.log('\n✅ Example completed successfully!')
    
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

// Run the example
main()